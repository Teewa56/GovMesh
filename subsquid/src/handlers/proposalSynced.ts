/*
 * ============================================================
 * handlers/proposalSynced.ts
 * ============================================================
 * Handles the GovMeshRegistry::ProposalSynced event.
 *
 * Event signature:
 *   ProposalSynced(
 *     uint32 indexed parachainId,
 *     uint256 indexed proposalIndex,
 *     uint256 timestamp
 *   )
 *
 * On each event:
 *   1. Decode parachainId and proposalIndex from topics
 *   2. Read full proposal data from the GovMeshRegistry contract
 *      via an RPC call (the event doesn't carry full proposal data)
 *   3. Upsert the Proposal entity with current tally and open status
 *
 * Why RPC fetch instead of decoding event data?
 *   The ProposalSynced event is a notification — it signals that
 *   a proposal has been written but doesn't carry the full struct.
 *   The complete proposal data (title, endBlock, votes) is read
 *   directly from the contract to keep the indexer consistent with
 *   on-chain state at the exact block the event was emitted.
 *
 * The ctx parameter provides the RPC client for contract reads.
 * ============================================================
 */

import { Log, BlockHeader } from "@subsquid/evm-processor";
import { createPublicClient, http, parseAbi } from "viem";
import { PARACHAIN_NAMES } from "../utils/parachain-names";

const REGISTRY_ADDRESS = (
  process.env.REGISTRY_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

const POLKADOT_HUB_RPC = process.env.POLKADOT_HUB_RPC_URL || "https://rpc.polkadot-hub-testnet.io";

const REGISTRY_ABI = parseAbi([
  "function getProposal(uint32 parachainId, uint256 proposalIndex) view returns (tuple(uint256 index, uint32 parachainId, string title, string metadataIpfsHash, uint256 endBlock, uint256 ayeVotes, uint256 nayVotes, uint256 abstainVotes, bool open, uint256 lastSyncedAt))",
]);

const publicClient = createPublicClient({
  transport: http(POLKADOT_HUB_RPC),
});

export async function handleProposalSynced(
  log: Log,
  block: BlockHeader,
  proposals: Map<string, any>,
  ctx: any
): Promise<void> {
  const parachainId = Number(BigInt(log.topics[1]));
  const proposalIndex = BigInt(log.topics[2]);

  const proposalKey = `${parachainId}-${proposalIndex}`;
  const parachainName = PARACHAIN_NAMES[parachainId] || `Chain ${parachainId}`;

  let proposalData: any;
  try {
    proposalData = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "getProposal",
      args: [parachainId, proposalIndex],
      blockNumber: BigInt(block.height),
    });
  } catch (e) {
    console.error(
      `Failed to fetch proposal ${parachainId}/${proposalIndex} at block ${block.height}:`,
      e
    );
    return;
  }

  const proposalEntity = {
    id: proposalKey,
    index: proposalIndex,
    parachainId,
    parachainName,
    title: proposalData.title || `Proposal #${proposalIndex}`,
    metadataIpfsHash: proposalData.metadataIpfsHash || "",
    endBlock: proposalData.endBlock,
    ayeVotes: proposalData.ayeVotes,
    nayVotes: proposalData.nayVotes,
    abstainVotes: proposalData.abstainVotes,
    open: proposalData.open,
    lastSyncedAt: new Date(Number(proposalData.lastSyncedAt) * 1000),
  };

  proposals.set(proposalKey, proposalEntity);
}