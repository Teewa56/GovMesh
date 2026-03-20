/*
 * ============================================================
 * handlers/voteDelivered.ts
 * ============================================================
 * Handles the GovMeshVoting::VoteDelivered event.
 *
 * Event signature:
 *   VoteDelivered(
 *     bytes32 indexed voteId,
 *     uint32 parachainId,
 *     uint256 proposalIndex
 *   )
 *
 * On each event:
 *   1. Decode the log to extract voteId, parachainId, proposalIndex
 *   2. Look up the existing Vote entity from the current batch map
 *      or load it from the database if it was indexed in a prior batch
 *   3. Update the Vote entity status to Delivered
 *   4. Update ParachainStat: decrement pendingVotes, increment deliveredVotes
 *
 * Order dependency:
 *   VoteDelivered always follows VoteCommitted. If VoteDelivered
 *   arrives in the same batch as VoteCommitted, the Vote entity
 *   will already be in the `votes` map. If it arrives in a later
 *   batch (the common case, since XCM delivery is async), it must
 *   be loaded from the database store.
 * ============================================================
 */

import { Log, BlockHeader } from "@subsquid/evm-processor";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { DeliveryStatus } from "../model/generated/vote.model";

const VOTE_DELIVERED_ABI = parseAbiParameters("uint32 parachainId, uint256 proposalIndex");

export async function handleVoteDelivered(
  log: Log,
  block: BlockHeader,
  votes: Map<string, any>,
  stats: Map<number, any>
): Promise<void> {
  const voteId = log.topics[1];

  let decoded: readonly [number, bigint];
  try {
    decoded = decodeAbiParameters(VOTE_DELIVERED_ABI, log.data as `0x${string}`);
  } catch (e) {
    console.error(`Failed to decode VoteDelivered log at block ${block.height}:`, e);
    return;
  }

  const [parachainId] = decoded;

  // Check current batch first (same-block delivery, unlikely but possible in tests)
  const existingInBatch = votes.get(voteId);
  if (existingInBatch) {
    existingInBatch.status = DeliveryStatus.Delivered;
    votes.set(voteId, existingInBatch);
  } else {
    // Will be loaded from DB and updated via upsert in the processor run loop
    votes.set(voteId, {
      id: voteId,
      status: DeliveryStatus.Delivered,
      _partialUpdate: true,
    });
  }

  // Update parachain stat
  const statKey = parachainId;
  const existingStat = stats.get(statKey);
  if (existingStat) {
    if (existingStat.pendingVotes > 0) existingStat.pendingVotes -= 1;
    existingStat.deliveredVotes += 1;
    existingStat.lastUpdated = new Date(block.timestamp);
    stats.set(statKey, existingStat);
  } else {
    // Stat not in current batch — create a delta entry
    stats.set(statKey, {
      id: `stat-${parachainId}`,
      parachainId,
      deliveredVotes: 1,
      pendingVotes: -1,
      lastUpdated: new Date(block.timestamp),
      _partialUpdate: true,
    });
  }
}