/*
 * ============================================================
 * handlers/voteCommitted.ts
 * ============================================================
 * Handles the GovMeshVoting::VoteCommitted event.
 *
 * Event signature:
 *   VoteCommitted(
 *     bytes32 indexed voteId,
 *     address indexed voter,
 *     uint32 indexed parachainId,
 *     uint256 proposalIndex,
 *     uint8 voteType,
 *     uint8 conviction,
 *     uint256 votingWeight
 *   )
 *
 * On each event:
 *   1. Decode the log topics and data
 *   2. Create a Vote entity with status = Pending
 *   3. Upsert a ParachainStat entity incrementing total vote count
 *      and weight accumulators
 *
 * The Vote entity is initially created with status Pending.
 * Status is updated to Delivered by the VoteDelivered handler
 * or to Failed by a separate failed-vote event handler if one
 * is added in future. VoteSent is tracked on-chain but not
 * separately indexed (the status transitions are sequential).
 * ============================================================
 */

import { Log, BlockHeader } from "@subsquid/evm-processor";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { PARACHAIN_NAMES } from "../utils/parachain-names";
import { VoteType, DeliveryStatus } from "../model/generated/vote.model";

const VOTE_COMMITTED_ABI = parseAbiParameters(
  "uint256 proposalIndex, uint8 voteType, uint8 conviction, uint256 votingWeight"
);

export async function handleVoteCommitted(
  log: Log,
  block: BlockHeader,
  votes: Map<string, any>,
  stats: Map<number, any>
): Promise<void> {
  const voteId = log.topics[1];
  const voter = "0x" + log.topics[2].slice(26);
  const parachainId = Number(BigInt("0x" + log.topics[3].slice(26)));

  let decoded: readonly [bigint, number, number, bigint];
  try {
    decoded = decodeAbiParameters(VOTE_COMMITTED_ABI, log.data as `0x${string}`);
  } catch (e) {
    console.error(`Failed to decode VoteCommitted log at block ${block.height}:`, e);
    return;
  }

  const [proposalIndex, voteTypeNum, conviction, votingWeight] = decoded;

  const voteTypeMap: Record<number, VoteType> = {
    0: VoteType.Aye,
    1: VoteType.Nay,
    2: VoteType.Abstain,
  };

  const parachainName = PARACHAIN_NAMES[parachainId] || `Chain ${parachainId}`;
  const proposalKey = `${parachainId}-${proposalIndex}`;

  const voteEntity = {
    id: voteId,
    voteId,
    voter: voter.toLowerCase(),
    parachainId,
    parachainName,
    proposalIndex,
    voteType: voteTypeMap[voteTypeNum] ?? VoteType.Abstain,
    conviction: Number(conviction),
    dotBalance: 0n,
    votingWeight,
    status: DeliveryStatus.Pending,
    xcmMessageId: null,
    blockNumber: BigInt(block.height),
    timestamp: new Date(block.timestamp),
  };

  votes.set(voteId, voteEntity);

  // Upsert parachain stat
  const statKey = parachainId;
  const existingStat = stats.get(statKey) || {
    id: `stat-${parachainId}`,
    parachainId,
    parachainName,
    totalVotes: 0,
    totalAyeWeight: 0n,
    totalNayWeight: 0n,
    totalAbstainWeight: 0n,
    deliveredVotes: 0,
    failedVotes: 0,
    pendingVotes: 0,
    lastUpdated: new Date(block.timestamp),
  };

  existingStat.totalVotes += 1;
  existingStat.pendingVotes += 1;
  existingStat.lastUpdated = new Date(block.timestamp);

  if (voteTypeMap[voteTypeNum] === VoteType.Aye) {
    existingStat.totalAyeWeight += votingWeight;
  } else if (voteTypeMap[voteTypeNum] === VoteType.Nay) {
    existingStat.totalNayWeight += votingWeight;
  } else {
    existingStat.totalAbstainWeight += votingWeight;
  }

  stats.set(statKey, existingStat);
}