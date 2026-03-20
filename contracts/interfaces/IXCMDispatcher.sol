// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * IXCMDispatcher
 * ============================================================
 * Interface for the XCMDispatcher contract.
 *
 * The XCMDispatcher is the low-level XCM execution engine of
 * GovMesh. It is responsible for:
 *   1. Building well-formed XCM v5 messages for vote dispatch.
 *   2. SCALE-encoding the remote governance pallet call that
 *      will be executed on the destination parachain.
 *   3. Calling the XCM precompile to dispatch the message and
 *      capturing the returned messageId for delivery tracking.
 *   4. Sending XCM queries to parachains to read active proposal
 *      state for the Registry sync flow.
 *   5. Receiving and routing XCM query responses back to the
 *      Registry via onQueryResponse.
 *
 * XCM Message Structure (vote dispatch):
 *   WithdrawAsset    — Pull fee DOT from dispatcher sovereign account
 *   BuyExecution     — Reserve weight for the Transact instruction
 *   Transact         — Execute the remote governance vote call
 *   RefundSurplus    — Return any unspent execution weight as assets
 *   DepositAsset     — Return remaining assets to dispatcher
 *
 * dispatchVote       — Called by GovMeshVoting after vote commitment.
 *                      Encodes and sends the XCM vote message.
 *                      Returns the XCM messageId for tracking.
 *
 * queryRemoteProposals — Called by GovMeshRegistry sync flow.
 *                        Sends an XCM query to read proposal state.
 *                        Returns a queryId for response matching.
 *
 * Access:
 *   dispatchVote          — Callable only by GovMeshVoting.
 *   queryRemoteProposals  — Callable only by GovMeshRegistry.
 *   All views             — Public.
 * ============================================================
 */

interface IXCMDispatcher {
    struct DispatchParams {
        bytes32 voteId;
        bytes xcmDest;
        uint256 proposalIndex;
        bool aye;
        bool abstain;
        uint8 conviction;
        uint256 votingBalance;
        uint64 maxWeight;
    }

    event VoteDispatched(
        bytes32 indexed voteId,
        bytes32 indexed xcmMessageId,
        uint32 parachainId,
        uint256 proposalIndex
    );

    event QueryDispatched(
        uint64 indexed queryId,
        uint32 parachainId,
        uint256 timestamp
    );

    event QueryResponseReceived(
        uint64 indexed queryId,
        uint32 parachainId,
        uint256 timestamp
    );

    error UnauthorizedDispatcher(address caller);
    error XCMSendFailed(bytes32 voteId, uint32 outcome);
    error InvalidDestination(bytes xcmDest);
    error InvalidProposalIndex();
    error InvalidWeight();
    error MessageAlreadyDispatched(bytes32 voteId);

    function dispatchVote(DispatchParams calldata params) external returns (bytes32 xcmMessageId);

    function queryRemoteProposals(
        uint32 parachainId,
        bytes calldata xcmDest
    ) external returns (uint64 queryId);

    function onQueryResponse(
        uint64 queryId,
        bytes calldata responseData
    ) external;

    function getDispatchedMessage(bytes32 voteId) external view returns (bytes32 xcmMessageId, uint256 timestamp);
}
