/*
 * contracts.ts
 * Contract addresses and ABIs for GovMesh.
 * ABI includes only the functions needed by the frontend.
 */

export const CONTRACT_ADDRESSES = {
  registry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  voting: (process.env.NEXT_PUBLIC_VOTING_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  dispatcher: (process.env.NEXT_PUBLIC_DISPATCHER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

export const REGISTRY_ABI = [
  {
    name: "getActiveParachains",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "id", type: "uint32" },
      { name: "name", type: "string" },
      { name: "xcmLocation", type: "bytes" },
      { name: "govPalletEncoded", type: "bytes" },
      { name: "active", type: "bool" },
      { name: "registeredAt", type: "uint256" },
    ]}],
  },
  {
    name: "getProposals",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "parachainId", type: "uint32" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "index", type: "uint256" },
      { name: "parachainId", type: "uint32" },
      { name: "title", type: "string" },
      { name: "metadataIpfsHash", type: "string" },
      { name: "endBlock", type: "uint256" },
      { name: "ayeVotes", type: "uint256" },
      { name: "nayVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "open", type: "bool" },
      { name: "lastSyncedAt", type: "uint256" },
    ]}],
  },
  {
    name: "getProposal",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "parachainId", type: "uint32" },
      { name: "proposalIndex", type: "uint256" },
    ],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "index", type: "uint256" },
      { name: "parachainId", type: "uint32" },
      { name: "title", type: "string" },
      { name: "metadataIpfsHash", type: "string" },
      { name: "endBlock", type: "uint256" },
      { name: "ayeVotes", type: "uint256" },
      { name: "nayVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "open", type: "bool" },
      { name: "lastSyncedAt", type: "uint256" },
    ]}],
  },
  {
    name: "isProposalOpen",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "parachainId", type: "uint32" },
      { name: "proposalIndex", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const VOTING_ABI = [
  {
    name: "vote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "parachainId", type: "uint32" },
      { name: "proposalIndex", type: "uint256" },
      { name: "voteType", type: "uint8" },
      { name: "conviction", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "getVoteHistory",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "voter", type: "address" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "voteId", type: "bytes32" },
      { name: "voter", type: "address" },
      { name: "parachainId", type: "uint32" },
      { name: "proposalIndex", type: "uint256" },
      { name: "voteType", type: "uint8" },
      { name: "conviction", type: "uint8" },
      { name: "dotBalance", type: "uint256" },
      { name: "votingWeight", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "xcmMessageId", type: "bytes32" },
    ]}],
  },
  {
    name: "hasVoted",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "voter", type: "address" },
      { name: "parachainId", type: "uint32" },
      { name: "proposalIndex", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getProposalTally",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "parachainId", type: "uint32" },
      { name: "proposalIndex", type: "uint256" },
    ],
    outputs: [
      { name: "aye", type: "uint256" },
      { name: "nay", type: "uint256" },
      { name: "abstain", type: "uint256" },
    ],
  },
  {
    name: "VoteCommitted",
    type: "event",
    inputs: [
      { name: "voteId", type: "bytes32", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "parachainId", type: "uint32", indexed: true },
      { name: "proposalIndex", type: "uint256" },
      { name: "voteType", type: "uint8" },
      { name: "conviction", type: "uint8" },
      { name: "votingWeight", type: "uint256" },
    ],
  },
  {
    name: "VoteDelivered",
    type: "event",
    inputs: [
      { name: "voteId", type: "bytes32", indexed: true },
      { name: "parachainId", type: "uint32" },
      { name: "proposalIndex", type: "uint256" },
    ],
  },
] as const;

export const ONE_DOT = 10_000_000_000n;

export function formatDot(planck: bigint): string {
  const dot = planck / ONE_DOT;
  const rem = planck % ONE_DOT;
  const decimals = rem.toString().padStart(10, "0").slice(0, 2);
  return `${dot.toLocaleString()}.${decimals} DOT`;
}

export function formatDotShort(planck: bigint): string {
  const dot = Number(planck) / Number(ONE_DOT);
  if (dot >= 1_000_000) return `${(dot / 1_000_000).toFixed(1)}M DOT`;
  if (dot >= 1_000) return `${(dot / 1_000).toFixed(1)}K DOT`;
  return `${dot.toFixed(2)} DOT`;
}

export const VOTE_TYPE = { Aye: 0, Nay: 1, Abstain: 2 } as const;
export const DELIVERY_STATUS = { Pending: 0, Sent: 1, Delivered: 2, Failed: 3 } as const;

export const CONVICTION_LABELS: Record<number, string> = {
  0: "0.1×  — No lock",
  1: "1×    — 1 period",
  2: "2×    — 2 periods",
  3: "3×    — 4 periods",
  4: "4×    — 8 periods",
  5: "5×    — 16 periods",
  6: "6×    — 32 periods",
};

export const PARACHAIN_COLORS: Record<number, string> = {
  2004: "#53CBC9",
  2006: "#0085FF",
  2034: "#A855F7",
};

export const PARACHAIN_NAMES: Record<number, string> = {
  2004: "Moonbeam",
  2006: "Astar",
  2034: "Hydration",
};
