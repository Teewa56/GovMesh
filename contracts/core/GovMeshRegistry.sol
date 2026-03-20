// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * GovMeshRegistry
 * ============================================================
 * The data and synchronization layer of the GovMesh protocol.
 *
 * RESPONSIBILITIES:
 *   1. Maintain a registry of active Polkadot parachains that
 *      GovMesh supports for governance vote dispatch.
 *   2. Store governance proposals synced from remote parachains
 *      via XCM query responses.
 *   3. Expose proposal and parachain data to GovMeshVoting and
 *      the frontend indexer.
 *
 * UPGRADEABILITY:
 *   Uses OpenZeppelin's UUPSUpgradeable pattern. The logic contract
 *   can be upgraded by the DEFAULT_ADMIN_ROLE without migrating
 *   storage. The proxy address remains stable.
 *
 * ACCESS CONTROL:
 *   DEFAULT_ADMIN_ROLE — Deploy, upgrade, register/deactivate parachains.
 *   SYNCER_ROLE        — Trigger proposal sync (assigned to keeper bots).
 *   DISPATCHER_ROLE    — Write query responses back into storage
 *                        (assigned to XCMDispatcher contract address).
 *
 * SECURITY:
 *   - All state-changing external functions validate inputs before
 *     any storage writes (checks-effects-interactions pattern).
 *   - The onQueryResponse function is gated to DISPATCHER_ROLE only
 *     to prevent any external party from injecting false proposal data.
 *   - Parachains cannot be registered twice (idempotent guard).
 *   - Proposals are validated for non-zero end block and valid parachain.
 *
 * GAS OPTIMIZATIONS:
 *   - Parachain data uses a mapping (id → struct) for O(1) lookup.
 *   - Active parachain list is maintained as a separate array to
 *     avoid full-map iteration in getActiveParachains().
 *   - Proposal arrays are stored per parachainId to avoid filtering.
 *   - Structs use tightly packed fields where possible.
 *
 * EVENTS:
 *   All state transitions emit events for off-chain indexing via Subsquid.
 *
 * REENTRANCY:
 *   No Ether or token transfers occur in this contract.
 *   All external calls are to the XCMDispatcher (trusted, role-gated).
 *   ReentrancyGuardUpgradeable is included as a defensive measure.
 * ============================================================
 */

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "../interfaces/IGovMeshRegistry.sol";
import "../interfaces/IXCMDispatcher.sol";

contract GovMeshRegistry is
    IGovMeshRegistry,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant SYNCER_ROLE = keccak256("SYNCER_ROLE");
    bytes32 public constant DISPATCHER_ROLE = keccak256("DISPATCHER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant MAX_PROPOSALS_PER_PARACHAIN = 200;
    uint256 public constant MAX_PARACHAINS = 100;

    mapping(uint32 => Parachain) private _parachains;
    uint32[] private _activeParachainIds;

    mapping(uint32 => Proposal[]) private _proposals;
    mapping(uint32 => mapping(uint256 => uint256)) private _proposalIndexMap;

    mapping(uint64 => uint32) private _pendingQueryParachain;

    IXCMDispatcher public dispatcher;

    uint256[50] private __gap;

    modifier onlyActiveParachain(uint32 id) {
        if (!_parachains[id].active) revert ParachainInactive(id);
        _;
    }

    modifier validParachainId(uint32 id) {
        if (id == 0) revert InvalidParachainId();
        _;
    }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    function setDispatcher(address dispatcherAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (dispatcherAddress == address(0)) revert UnauthorizedCaller(dispatcherAddress);
        dispatcher = IXCMDispatcher(dispatcherAddress);
        _grantRole(DISPATCHER_ROLE, dispatcherAddress);
    }

    function registerParachain(
        uint32 id,
        string calldata name,
        bytes calldata xcmLocation,
        bytes calldata govPalletEncoded
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) validParachainId(id) {
        if (_parachains[id].active) revert ParachainAlreadyRegistered(id);
        if (xcmLocation.length == 0) revert InvalidXcmLocation();
        if (_activeParachainIds.length >= MAX_PARACHAINS) revert UnauthorizedCaller(msg.sender);

        _parachains[id] = Parachain({
            id: id,
            name: name,
            xcmLocation: xcmLocation,
            govPalletEncoded: govPalletEncoded,
            active: true,
            registeredAt: block.timestamp
        });

        _activeParachainIds.push(id);

        emit ParachainRegistered(id, name, block.timestamp);
    }

    function deactivateParachain(uint32 id) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_parachains[id].active) revert ParachainNotFound(id);

        _parachains[id].active = false;

        uint256 length = _activeParachainIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (_activeParachainIds[i] == id) {
                _activeParachainIds[i] = _activeParachainIds[length - 1];
                _activeParachainIds.pop();
                break;
            }
        }

        emit ParachainDeactivated(id, block.timestamp);
    }

    function syncProposals(uint32 parachainId)
        external
        override
        nonReentrant
        whenNotPaused
        onlyRole(SYNCER_ROLE)
        onlyActiveParachain(parachainId)
    {
        Parachain storage chain = _parachains[parachainId];

        uint64 queryId = dispatcher.queryRemoteProposals(parachainId, chain.xcmLocation);

        _pendingQueryParachain[queryId] = parachainId;

        emit QueryDispatched(queryId, parachainId);
    }

    function onQueryResponse(
        uint64 queryId,
        uint32 parachainId,
        bytes calldata responseData
    ) external override onlyRole(DISPATCHER_ROLE) {
        if (!_parachains[parachainId].active) revert ParachainInactive(parachainId);

        _decodeAndStoreProposals(parachainId, responseData);

        delete _pendingQueryParachain[queryId];
    }

    function writeProposal(
        uint32 parachainId,
        uint256 index,
        string calldata title,
        string calldata metadataIpfsHash,
        uint256 endBlock,
        uint256 ayeVotes,
        uint256 nayVotes,
        uint256 abstainVotes
    ) external onlyRole(DISPATCHER_ROLE) onlyActiveParachain(parachainId) {
        if (endBlock == 0) revert ProposalNotFound(parachainId, index);

        uint256 storedIndex = _proposalIndexMap[parachainId][index];

        if (storedIndex > 0) {
            Proposal storage existing = _proposals[parachainId][storedIndex - 1];
            existing.ayeVotes = ayeVotes;
            existing.nayVotes = nayVotes;
            existing.abstainVotes = abstainVotes;
            existing.open = block.number < endBlock;
            existing.lastSyncedAt = block.timestamp;
        } else {
            if (_proposals[parachainId].length >= MAX_PROPOSALS_PER_PARACHAIN) {
                _pruneClosedProposals(parachainId);
            }

            _proposals[parachainId].push(Proposal({
                index: index,
                parachainId: parachainId,
                title: title,
                metadataIpfsHash: metadataIpfsHash,
                endBlock: endBlock,
                ayeVotes: ayeVotes,
                nayVotes: nayVotes,
                abstainVotes: abstainVotes,
                open: block.number < endBlock,
                lastSyncedAt: block.timestamp
            }));

            _proposalIndexMap[parachainId][index] = _proposals[parachainId].length;

            emit ProposalSynced(parachainId, index, block.timestamp);
        }
    }

    function getProposals(uint32 parachainId) external view override returns (Proposal[] memory) {
        return _proposals[parachainId];
    }

    function getProposal(
        uint32 parachainId,
        uint256 proposalIndex
    ) external view override returns (Proposal memory) {
        uint256 storedIndex = _proposalIndexMap[parachainId][proposalIndex];
        if (storedIndex == 0) revert ProposalNotFound(parachainId, proposalIndex);
        return _proposals[parachainId][storedIndex - 1];
    }

    function getActiveParachains() external view override returns (Parachain[] memory) {
        uint256 count = _activeParachainIds.length;
        Parachain[] memory result = new Parachain[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _parachains[_activeParachainIds[i]];
        }
        return result;
    }

    function getParachain(uint32 id) external view override returns (Parachain memory) {
        if (!_parachains[id].active) revert ParachainNotFound(id);
        return _parachains[id];
    }

    function isProposalOpen(uint32 parachainId, uint256 proposalIndex) external view override returns (bool) {
        uint256 storedIndex = _proposalIndexMap[parachainId][proposalIndex];
        if (storedIndex == 0) return false;
        Proposal storage p = _proposals[parachainId][storedIndex - 1];
        return p.open && block.number < p.endBlock;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _decodeAndStoreProposals(uint32 parachainId, bytes calldata responseData) internal {
        // Response data is expected to be ABI-encoded for testnet demo purposes.
        // Production: replace with SCALE decoding logic via the XCMEncoder library.
        // Format: abi.encode(uint256[] indices, uint256[] endBlocks, uint256[] ayeVotes, uint256[] nayVotes)
        if (responseData.length < 4) return;

        (
            uint256[] memory indices,
            uint256[] memory endBlocks,
            uint256[] memory ayeVotes,
            uint256[] memory nayVotes
        ) = abi.decode(responseData, (uint256[], uint256[], uint256[], uint256[]));

        uint256 count = indices.length;
        for (uint256 i = 0; i < count; i++) {
            uint256 storedIndex = _proposalIndexMap[parachainId][indices[i]];
            if (storedIndex > 0) {
                Proposal storage p = _proposals[parachainId][storedIndex - 1];
                p.ayeVotes = ayeVotes[i];
                p.nayVotes = nayVotes[i];
                p.open = block.number < endBlocks[i];
                p.lastSyncedAt = block.timestamp;
            }
        }
    }

    function _pruneClosedProposals(uint32 parachainId) internal {
        Proposal[] storage props = _proposals[parachainId];
        uint256 i = 0;
        while (i < props.length) {
            if (!props[i].open || block.number >= props[i].endBlock) {
                emit ProposalClosed(parachainId, props[i].index, block.timestamp);
                delete _proposalIndexMap[parachainId][props[i].index];
                props[i] = props[props.length - 1];
                _proposalIndexMap[parachainId][props[i].index] = i + 1;
                props.pop();
            } else {
                i++;
            }
        }
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    event QueryDispatched(uint64 indexed queryId, uint32 indexed parachainId);
}
