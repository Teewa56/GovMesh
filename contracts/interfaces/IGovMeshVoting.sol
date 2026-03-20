// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * IGovMeshVoting
 * ============================================================
 * Interface for the GovMeshVoting contract.
 *
 * The Voting contract is the user-facing execution layer. It:
 *   1. Reads the caller's native DOT balance via the Native Assets
 *      precompile to determine raw voting power.
 *   2. Applies a conviction multiplier (1x–6x) matching Polkadot's
 *      OpenGov conviction voting model exactly.
 *   3. Records the vote commitment on Polkadot Hub for auditability.
 *   4. Forwards the vote to XCMDispatcher for cross-chain delivery.
 *   5. Tracks delivery status per vote (Pending / Sent / Delivered).
 *
 * VoteType    — Aye, Nay, or Abstain. Abstain records without weight.
 *
 * Conviction  — 0 = 0.1x (no lock), 1 = 1x, 2 = 2x, 3 = 3x,
 *               4 = 4x, 5 = 5x, 6 = 6x. Matches OpenGov exactly.
 *               Conviction 0 is allowed but carries 10% weight only.
 *
 * DeliveryStatus — Tracks the lifecycle of the XCM vote dispatch.
 *
 * VoteRecord  — Full immutable record of a submitted vote.
 *               Stored per voter address for history queries.
 *
 * Events:
 *   VoteCommitted — Emitted immediately when vote is recorded on Hub.
 *   VoteSent      — Emitted when XCM dispatch is initiated.
 *   VoteDelivered — Emitted when XCM delivery is confirmed.
 *   VoteFailed    — Emitted if XCM dispatch fails, with reason.
 *
 * Access:
 *   vote          — Public. Any address with DOT balance can vote.
 *   confirmDelivery — Callable only by XCMDispatcher.
 *   All views     — Public.
 * ============================================================
 */

interface IGovMeshVoting {
    enum VoteType { Aye, Nay, Abstain }
    enum DeliveryStatus { Pending, Sent, Delivered, Failed }

    struct VoteRecord {
        bytes32 voteId;
        address voter;
        uint32 parachainId;
        uint256 proposalIndex;
        VoteType voteType;
        uint8 conviction;
        uint256 dotBalance;
        uint256 votingWeight;
        uint256 timestamp;
        DeliveryStatus status;
        bytes32 xcmMessageId;
    }

    event VoteCommitted(
        bytes32 indexed voteId,
        address indexed voter,
        uint32 indexed parachainId,
        uint256 proposalIndex,
        VoteType voteType,
        uint8 conviction,
        uint256 votingWeight
    );

    event VoteSent(
        bytes32 indexed voteId,
        bytes32 xcmMessageId,
        uint32 parachainId
    );

    event VoteDelivered(
        bytes32 indexed voteId,
        uint32 parachainId,
        uint256 proposalIndex
    );

    event VoteFailed(
        bytes32 indexed voteId,
        uint32 parachainId,
        string reason
    );

    error ProposalNotOpen(uint32 parachainId, uint256 proposalIndex);
    error AlreadyVoted(address voter, uint32 parachainId, uint256 proposalIndex);
    error InsufficientDotBalance(address voter, uint256 balance);
    error InvalidConviction(uint8 conviction);
    error InvalidVoteType();
    error ZeroVotingWeight();
    error DispatchFailed(bytes32 voteId);

    function vote(
        uint32 parachainId,
        uint256 proposalIndex,
        VoteType voteType,
        uint8 conviction
    ) external;

    function confirmDelivery(bytes32 voteId, bytes32 xcmMessageId) external;
    function markFailed(bytes32 voteId, string calldata reason) external;

    function getVoteHistory(address voter) external view returns (VoteRecord[] memory);
    function getVote(bytes32 voteId) external view returns (VoteRecord memory);
    function hasVoted(address voter, uint32 parachainId, uint256 proposalIndex) external view returns (bool);
    function getProposalTally(uint32 parachainId, uint256 proposalIndex) external view returns (uint256 aye, uint256 nay, uint256 abstain);
}
