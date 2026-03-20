// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * XCMDispatcher
 * ============================================================
 * The low-level XCM execution engine of the GovMesh protocol.
 *
 * RESPONSIBILITIES:
 *   1. Build well-formed XCM v5 messages for vote dispatch using
 *      the XCMEncoder library.
 *   2. SCALE-encode the governance pallet vote call that will be
 *      executed via Transact on the destination parachain.
 *   3. Call the XCM precompile at 0x0800 to dispatch messages and
 *      capture the returned bytes32 messageId for delivery tracking.
 *   4. Send XCM queries to parachains for proposal state reads
 *      on behalf of GovMeshRegistry.
 *   5. Receive and route XCM query responses to GovMeshRegistry
 *      via the onQueryResponse callback.
 *   6. Notify GovMeshVoting of delivery confirmations and failures
 *      via confirmDelivery and markFailed.
 *
 * UPGRADEABILITY:
 *   UUPS proxy. Upgrade gated to UPGRADER_ROLE.
 *
 * ACCESS CONTROL:
 *   DEFAULT_ADMIN_ROLE — Admin, set contract addresses.
 *   UPGRADER_ROLE      — Authorize implementation upgrades.
 *   VOTER_ROLE         — Assigned to GovMeshVoting. Required to call
 *                        dispatchVote (prevents arbitrary XCM dispatch).
 *   REGISTRY_ROLE      — Assigned to GovMeshRegistry. Required to call
 *                        queryRemoteProposals.
 *   RESPONDER_ROLE     — Assigned to Polkadot Hub's XCM query responder
 *                        system address. Required to call onQueryResponse.
 *                        This prevents external injection of fake responses.
 *
 * SECURITY:
 *   - dispatchVote is gated to VOTER_ROLE (only GovMeshVoting can call it).
 *   - Each voteId can only be dispatched once (MessageAlreadyDispatched guard).
 *   - The XCM precompile return value (outcome) is checked. Non-zero outcome
 *     codes cause the transaction to revert with XCMSendFailed.
 *   - onQueryResponse is gated to RESPONDER_ROLE to prevent fake responses.
 *   - All input byte arrays are length-validated before encoding.
 *   - ReentrancyGuard on dispatchVote as a defensive measure since it
 *     calls an external precompile contract.
 *
 * GAS OPTIMIZATIONS:
 *   - XCM message bytes are built in memory using XCMEncoder library
 *     pure functions — no storage writes during encoding.
 *   - Dispatched message registry uses mapping(bytes32 → bytes32) storing
 *     only the xcmMessageId per voteId, not full structs.
 *   - Query response routing uses mapping(uint64 → uint32) for parachain
 *     lookup by queryId — O(1), minimal storage.
 *
 * REENTRANCY:
 *   dispatchVote is nonReentrant. The precompile call is an external
 *   interaction and treated with full reentrancy discipline.
 *   State writes (dispatchedMessages) happen before the precompile call.
 * ============================================================
 */

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IXCMDispatcher.sol";
import "../interfaces/IXcmPrecompile.sol";
import "../interfaces/IGovMeshVoting.sol";
import "../interfaces/IGovMeshRegistry.sol";
import "../libraries/XCMEncoder.sol";

contract XCMDispatcher is
    IXCMDispatcher,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using XCMEncoder for *;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");
    bytes32 public constant RESPONDER_ROLE = keccak256("RESPONDER_ROLE");

    address public constant XCM_PRECOMPILE = 0x0000000000000000000000000000000000000800;

    uint64 public constant QUERY_TIMEOUT_BLOCKS = 100;
    uint128 public constant FEE_PLANCK = 10_000_000_000;

    IXcmPrecompile public xcmPrecompile;
    IGovMeshVoting public voting;
    IGovMeshRegistry public registry;

    mapping(bytes32 => bytes32) private _dispatchedMessages;
    mapping(bytes32 => uint256) private _dispatchTimestamps;
    mapping(uint64 => uint32) private _queryParachainMap;

    uint64 private _queryNonce;

    uint256[48] private __gap;

    modifier notDispatched(bytes32 voteId) {
        if (_dispatchedMessages[voteId] != bytes32(0)) {
            revert MessageAlreadyDispatched(voteId);
        }
        _;
    }

    function initialize(
        address admin,
        address votingAddress,
        address registryAddress
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        xcmPrecompile = IXcmPrecompile(XCM_PRECOMPILE);
        voting = IGovMeshVoting(votingAddress);
        registry = IGovMeshRegistry(registryAddress);

        _grantRole(VOTER_ROLE, votingAddress);
        _grantRole(REGISTRY_ROLE, registryAddress);
    }

    function setXcmPrecompile(address precompileAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(precompileAddress != address(0), "Invalid precompile address");
        xcmPrecompile = IXcmPrecompile(precompileAddress);
    }

    function dispatchVote(
        DispatchParams calldata params
    )
        external
        override
        nonReentrant
        onlyRole(VOTER_ROLE)
        notDispatched(params.voteId)
        returns (bytes32 xcmMessageId)
    {
        if (params.xcmDest.length == 0) revert InvalidDestination(params.xcmDest);
        if (params.maxWeight == 0) revert InvalidWeight();

        bytes memory encodedCall = XCMEncoder.encodeVoteCall(
            params.proposalIndex,
            params.aye,
            params.abstain,
            params.conviction
        );

        bytes memory xcmMessage = XCMEncoder.encodeVoteMessage(
            _extractParachainId(params.xcmDest),
            encodedCall,
            params.maxWeight,
            65_536,
            FEE_PLANCK
        );

        _dispatchedMessages[params.voteId] = bytes32(uint256(1));
        _dispatchTimestamps[params.voteId] = block.timestamp;

        xcmMessageId = xcmPrecompile.xcmSend(params.xcmDest, xcmMessage);

        if (xcmMessageId == bytes32(0)) {
            delete _dispatchedMessages[params.voteId];
            delete _dispatchTimestamps[params.voteId];
            revert XCMSendFailed(params.voteId, 1);
        }

        _dispatchedMessages[params.voteId] = xcmMessageId;

        emit VoteDispatched(params.voteId, xcmMessageId, _extractParachainId(params.xcmDest), params.proposalIndex);

        return xcmMessageId;
    }

    function queryRemoteProposals(
        uint32 parachainId,
        bytes calldata xcmDest
    )
        external
        override
        onlyRole(REGISTRY_ROLE)
        returns (uint64 queryId)
    {
        if (xcmDest.length == 0) revert InvalidDestination(xcmDest);

        queryId = ++_queryNonce;

        bytes memory queryData = abi.encode(parachainId, queryId, address(this));

        _queryParachainMap[queryId] = parachainId;

        xcmPrecompile.xcmQuery(xcmDest, queryData, address(this), QUERY_TIMEOUT_BLOCKS);

        emit QueryDispatched(queryId, parachainId, block.timestamp);

        return queryId;
    }

    function onQueryResponse(
        uint64 queryId,
        bytes calldata responseData
    )
        external
        override
        onlyRole(RESPONDER_ROLE)
    {
        uint32 parachainId = _queryParachainMap[queryId];
        if (parachainId == 0) revert InvalidDestination(responseData);

        delete _queryParachainMap[queryId];

        emit QueryResponseReceived(queryId, parachainId, block.timestamp);

        registry.onQueryResponse(queryId, parachainId, responseData);
    }

    function notifyDelivery(bytes32 voteId, bytes32 xcmMessageId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_dispatchedMessages[voteId] != xcmMessageId) revert XCMSendFailed(voteId, 2);
        voting.confirmDelivery(voteId, xcmMessageId);
    }

    function notifyFailure(bytes32 voteId, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_dispatchedMessages[voteId] == bytes32(0)) revert XCMSendFailed(voteId, 3);
        voting.markFailed(voteId, reason);
    }

    function getDispatchedMessage(
        bytes32 voteId
    ) external view override returns (bytes32 xcmMessageId, uint256 timestamp) {
        return (_dispatchedMessages[voteId], _dispatchTimestamps[voteId]);
    }

    function setVoting(address votingAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        voting = IGovMeshVoting(votingAddress);
        _grantRole(VOTER_ROLE, votingAddress);
    }

    function setRegistry(address registryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registry = IGovMeshRegistry(registryAddress);
        _grantRole(REGISTRY_ROLE, registryAddress);
    }

    function setResponder(address responder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(RESPONDER_ROLE, responder);
    }

    function _extractParachainId(bytes calldata xcmDest) internal pure returns (uint32) {
        if (xcmDest.length < 6) return 0;
        return uint32(uint8(xcmDest[2]))
            | (uint32(uint8(xcmDest[3])) << 8)
            | (uint32(uint8(xcmDest[4])) << 16)
            | (uint32(uint8(xcmDest[5])) << 24);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
