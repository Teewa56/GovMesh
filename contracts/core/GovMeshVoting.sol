// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * GovMeshVoting
 * ============================================================
 * The user-facing vote execution contract of the GovMesh protocol.
 *
 * RESPONSIBILITIES:
 *   1. Accept vote submissions from any DOT holder on Polkadot Hub.
 *   2. Read the caller's native DOT balance via the Native Assets
 *      precompile (no token transfers, no approvals required).
 *   3. Compute conviction-weighted voting power using ConvictionMath.
 *   4. Record the vote commitment permanently on Polkadot Hub.
 *   5. Forward the vote to XCMDispatcher for cross-chain delivery.
 *   6. Accept delivery confirmations from XCMDispatcher and update
 *      the vote record status accordingly.
 *   7. Maintain an aggregated tally per proposal for local display.
 *
 * UPGRADEABILITY:
 *   UUPS proxy pattern. Upgrade gated to UPGRADER_ROLE.
 *
 * ACCESS CONTROL:
 *   DEFAULT_ADMIN_ROLE — Admin operations, set contract references.
 *   UPGRADER_ROLE      — Authorize implementation upgrades.
 *   CONFIRMER_ROLE     — Assigned to XCMDispatcher. Used to call
 *                        confirmDelivery and markFailed after XCM
 *                        responses are received.
 *
 * SECURITY:
 *   - ReentrancyGuard on the vote() function because it calls
 *     XCMDispatcher.dispatchVote() as an external call after
 *     writing state (checks-effects-interactions enforced).
 *   - One vote per address per proposal per parachain. Duplicate
 *     votes are rejected with AlreadyVoted error before any state change.
 *   - Minimum DOT balance threshold enforced (configurable by admin).
 *     Default is 0 — any balance can vote — but admin can raise this
 *     to deter spam.
 *   - Conviction is validated to be within 0–6 before computation.
 *   - voteId is a deterministic keccak256 hash of voter + parachain +
 *     proposal + block number to prevent collision.
 *
 * GAS OPTIMIZATIONS:
 *   - Vote records stored in a mapping by voteId (bytes32 key) for O(1)
 *     lookup rather than iterating an array.
 *   - Per-voter history maintained as a bytes32 array of voteIds to
 *     avoid duplicating full structs.
 *   - Tally stored separately from vote records to avoid loading full
 *     record array for tally queries.
 *   - hasVoted uses a nested mapping for O(1) duplicate detection.
 *
 * REENTRANCY:
 *   vote() is protected by nonReentrant.
 *   State is written (vote record stored, hasVoted set, tally updated)
 *   BEFORE the external call to dispatchVote(). If dispatch reverts,
 *   the entire transaction reverts including state writes — correct behavior.
 * ============================================================
 */

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "../interfaces/IGovMeshVoting.sol";
import "../interfaces/IGovMeshRegistry.sol";
import "../interfaces/IXCMDispatcher.sol";
import "../interfaces/INativeAssets.sol";
import "../libraries/ConvictionMath.sol";

contract GovMeshVoting is
    IGovMeshVoting,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using ConvictionMath for uint8;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant CONFIRMER_ROLE = keccak256("CONFIRMER_ROLE");

    address public constant XCM_NATIVE_ASSETS_PRECOMPILE = 0x0000000000000000000000000000000000000801;

    uint64 public constant DEFAULT_VOTE_DISPATCH_WEIGHT = 1_000_000_000;
    uint64 public constant DEFAULT_VOTE_PROOF_SIZE = 65_536;
    uint128 public constant DEFAULT_FEE_PLANCK = 10_000_000_000;

    IGovMeshRegistry public registry;
    IXCMDispatcher public dispatcher;
    INativeAssets public nativeAssets;

    uint256 public minimumDotBalance;

    mapping(bytes32 => VoteRecord) private _votes;
    mapping(address => bytes32[]) private _voterHistory;
    mapping(address => mapping(uint32 => mapping(uint256 => bool))) private _hasVoted;
    mapping(uint32 => mapping(uint256 => uint256[3])) private _tallyStore;

    uint256[45] private __gap;

    modifier onlyOpenProposal(uint32 parachainId, uint256 proposalIndex) {
        if (!registry.isProposalOpen(parachainId, proposalIndex)) {
            revert ProposalNotOpen(parachainId, proposalIndex);
        }
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address registryAddress,
        address dispatcherAddress
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        registry = IGovMeshRegistry(registryAddress);
        dispatcher = IXCMDispatcher(dispatcherAddress);
        nativeAssets = INativeAssets(XCM_NATIVE_ASSETS_PRECOMPILE);

        _grantRole(CONFIRMER_ROLE, dispatcherAddress);
    }

    function vote(
        uint32 parachainId,
        uint256 proposalIndex,
        VoteType voteType,
        uint8 conviction
    )
        external
        override
        nonReentrant
        whenNotPaused
        onlyOpenProposal(parachainId, proposalIndex)
    {
        if (!ConvictionMath.isValidConviction(conviction)) revert InvalidConviction(conviction);
        if (_hasVoted[msg.sender][parachainId][proposalIndex]) revert AlreadyVoted(msg.sender, parachainId, proposalIndex);

        uint256 dotBalance = nativeAssets.balanceOf(msg.sender);
        if (dotBalance < minimumDotBalance) revert InsufficientDotBalance(msg.sender, dotBalance);

        uint256 votingWeight = 0;
        if (voteType != VoteType.Abstain) {
            votingWeight = ConvictionMath.computeWeight(dotBalance, conviction);
            if (votingWeight == 0) revert ZeroVotingWeight();
        }

        bytes32 voteId = keccak256(
            abi.encodePacked(msg.sender, parachainId, proposalIndex, block.number, block.timestamp)
        );

        _votes[voteId] = VoteRecord({
            voteId: voteId,
            voter: msg.sender,
            parachainId: parachainId,
            proposalIndex: proposalIndex,
            voteType: voteType,
            conviction: conviction,
            dotBalance: dotBalance,
            votingWeight: votingWeight,
            timestamp: block.timestamp,
            status: DeliveryStatus.Pending,
            xcmMessageId: bytes32(0)
        });

        _voterHistory[msg.sender].push(voteId);
        _hasVoted[msg.sender][parachainId][proposalIndex] = true;

        _updateTally(parachainId, proposalIndex, voteType, votingWeight);

        emit VoteCommitted(voteId, msg.sender, parachainId, proposalIndex, voteType, conviction, votingWeight);

        IGovMeshRegistry.Parachain memory chain = registry.getParachain(parachainId);

        IXCMDispatcher.DispatchParams memory params = IXCMDispatcher.DispatchParams({
            voteId: voteId,
            xcmDest: chain.xcmLocation,
            proposalIndex: proposalIndex,
            aye: voteType == VoteType.Aye,
            abstain: voteType == VoteType.Abstain,
            conviction: conviction,
            votingBalance: dotBalance,
            maxWeight: DEFAULT_VOTE_DISPATCH_WEIGHT
        });

        bytes32 xcmMessageId = dispatcher.dispatchVote(params);

        _votes[voteId].status = DeliveryStatus.Sent;
        _votes[voteId].xcmMessageId = xcmMessageId;

        emit VoteSent(voteId, xcmMessageId, parachainId);
    }

    function confirmDelivery(
        bytes32 voteId,
        bytes32 xcmMessageId
    ) external override onlyRole(CONFIRMER_ROLE) {
        VoteRecord storage record = _votes[voteId];
        if (record.voter == address(0)) revert DispatchFailed(voteId);
        if (record.xcmMessageId != xcmMessageId) revert DispatchFailed(voteId);

        record.status = DeliveryStatus.Delivered;

        emit VoteDelivered(voteId, record.parachainId, record.proposalIndex);
    }

    function markFailed(
        bytes32 voteId,
        string calldata reason
    ) external override onlyRole(CONFIRMER_ROLE) {
        VoteRecord storage record = _votes[voteId];
        if (record.voter == address(0)) revert DispatchFailed(voteId);

        record.status = DeliveryStatus.Failed;

        emit VoteFailed(voteId, record.parachainId, reason);
    }

    function getVoteHistory(address voter) external view override returns (VoteRecord[] memory) {
        bytes32[] storage ids = _voterHistory[voter];
        uint256 count = ids.length;
        VoteRecord[] memory result = new VoteRecord[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _votes[ids[i]];
        }
        return result;
    }

    function getVote(bytes32 voteId) external view override returns (VoteRecord memory) {
        return _votes[voteId];
    }

    function hasVoted(
        address voter,
        uint32 parachainId,
        uint256 proposalIndex
    ) external view override returns (bool) {
        return _hasVoted[voter][parachainId][proposalIndex];
    }

    function getProposalTally(
        uint32 parachainId,
        uint256 proposalIndex
    ) external view override returns (uint256 aye, uint256 nay, uint256 abstain) {
        uint256[3] storage t = _tallyStore[parachainId][proposalIndex];
        return (t[0], t[1], t[2]);
    }

    function setMinimumDotBalance(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumDotBalance = amount;
    }

    function setRegistry(address registryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registry = IGovMeshRegistry(registryAddress);
    }

    function setDispatcher(address dispatcherAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        dispatcher = IXCMDispatcher(dispatcherAddress);
        _grantRole(CONFIRMER_ROLE, dispatcherAddress);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _updateTally(
        uint32 parachainId,
        uint256 proposalIndex,
        VoteType voteType,
        uint256 weight
    ) internal {
        uint256[3] storage t = _tallyStore[parachainId][proposalIndex];
        if (voteType == VoteType.Aye) {
            t[0] += weight;
        } else if (voteType == VoteType.Nay) {
            t[1] += weight;
        } else {
            t[2] += weight;
        }
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
