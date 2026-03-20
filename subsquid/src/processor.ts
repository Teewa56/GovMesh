/*
 * ============================================================
 * processor.ts
 * ============================================================
 * Main Subsquid processor for GovMesh.
 *
 * Subscribes to three EVM log events emitted by the GovMesh
 * contracts on Polkadot Hub and writes indexed data to a
 * PostgreSQL database exposed via GraphQL.
 *
 * Events indexed:
 *   GovMeshVoting::VoteCommitted(voteId, voter, parachainId,
 *     proposalIndex, voteType, conviction, votingWeight)
 *
 *   GovMeshVoting::VoteDelivered(voteId, parachainId, proposalIndex)
 *
 *   GovMeshRegistry::ProposalSynced(parachainId, proposalIndex, timestamp)
 *
 * Architecture:
 *   The processor uses Subsquid's EVM log handler pattern.
 *   Each event has a dedicated handler in the handlers/ directory.
 *   The processor fetches blocks in batches, decodes logs using
 *   viem's ABI decoding, and persists entities to the database.
 *
 * Database:
 *   Generated entity models are in model/generated/.
 *   Run `sqd codegen` after modifying schema.graphql to
 *   regenerate the model types.
 *
 * Running:
 *   sqd process    — Start the processor
 *   sqd serve      — Start the GraphQL server
 *   sqd up         — Start both (Docker Compose)
 * ============================================================
 */

import { EvmBatchProcessor } from "@subsquid/evm-processor";
import { TypeormDatabase } from "@subsquid/typeorm-store";
import { handleVoteCommitted } from "./handlers/voteCommitted";
import { handleVoteDelivered } from "./handlers/voteDelivered";
import { handleProposalSynced } from "./handlers/proposalSynced";

const VOTING_ADDRESS = (
  process.env.VOTING_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
).toLowerCase();

const REGISTRY_ADDRESS = (
  process.env.REGISTRY_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
).toLowerCase();

const POLKADOT_HUB_RPC = process.env.POLKADOT_HUB_RPC_URL || "https://rpc.polkadot-hub-testnet.io";

const START_BLOCK = Number(process.env.START_BLOCK || "1");

// ─── ABI Event Topics ─────────────────────────────────────────────────────────
// keccak256 of each event signature

const VOTE_COMMITTED_TOPIC =
  "0x" + Buffer.from(
    "VoteCommitted(bytes32,address,uint32,uint256,uint8,uint8,uint256)"
  ).toString("hex");

const VOTE_DELIVERED_TOPIC =
  "0x" + Buffer.from(
    "VoteDelivered(bytes32,uint32,uint256)"
  ).toString("hex");

const PROPOSAL_SYNCED_TOPIC =
  "0x" + Buffer.from(
    "ProposalSynced(uint32,uint256,uint256)"
  ).toString("hex");

// ─── Processor Configuration ─────────────────────────────────────────────────

export const processor = new EvmBatchProcessor()
  .setRpcEndpoint({
    url: POLKADOT_HUB_RPC,
    rateLimit: 10,
  })
  .setFinalityConfirmation(10)
  .setBlockRange({ from: START_BLOCK })
  .addLog({
    address: [VOTING_ADDRESS],
    topic0: [VOTE_COMMITTED_TOPIC, VOTE_DELIVERED_TOPIC],
    transaction: false,
  })
  .addLog({
    address: [REGISTRY_ADDRESS],
    topic0: [PROPOSAL_SYNCED_TOPIC],
    transaction: false,
  })
  .setFields({
    log: {
      topics: true,
      data: true,
      transactionHash: true,
    },
    block: {
      timestamp: true,
    },
  });

// ─── Database ────────────────────────────────────────────────────────────────

const db = new TypeormDatabase({ supportHotBlocks: true });

// ─── Main Processing Loop ────────────────────────────────────────────────────

processor.run(db, async (ctx) => {
  const votes: Map<string, any> = new Map();
  const proposals: Map<string, any> = new Map();
  const stats: Map<number, any> = new Map();

  for (const block of ctx.blocks) {
    const timestamp = new Date(block.header.timestamp);
    const blockNumber = BigInt(block.header.height);

    for (const log of block.logs) {
      const topic0 = log.topics[0];
      const address = log.address.toLowerCase();

      if (address === VOTING_ADDRESS) {
        if (topic0 === VOTE_COMMITTED_TOPIC) {
          await handleVoteCommitted(log, block.header, votes, stats);
        } else if (topic0 === VOTE_DELIVERED_TOPIC) {
          await handleVoteDelivered(log, block.header, votes, stats);
        }
      }

      if (address === REGISTRY_ADDRESS) {
        if (topic0 === PROPOSAL_SYNCED_TOPIC) {
          await handleProposalSynced(log, block.header, proposals, ctx);
        }
      }
    }
  }

  // Persist all entities in batch
  await ctx.store.upsert([...votes.values()]);
  await ctx.store.upsert([...proposals.values()]);
  await ctx.store.upsert([...stats.values()]);
});