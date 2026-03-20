"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES, VOTING_ABI } from "@/lib/contracts";

export function useVote() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function submitVote(
    parachainId: number,
    proposalIndex: number,
    voteType: number,
    conviction: number
  ) {
    writeContract({
      address: CONTRACT_ADDRESSES.voting,
      abi: VOTING_ABI,
      functionName: "vote",
      args: [parachainId, BigInt(proposalIndex), voteType, conviction],
    });
  }

  return { submitVote, hash, isPending, isConfirming, isSuccess, error };
}

export function useHasVoted(
  voter: `0x${string}` | undefined,
  parachainId: number,
  proposalIndex: number
) {
  const { useReadContract } = require("wagmi");
  return useReadContract({
    address: CONTRACT_ADDRESSES.voting,
    abi: VOTING_ABI,
    functionName: "hasVoted",
    args: voter ? [voter, parachainId, BigInt(proposalIndex)] : undefined,
    query: { enabled: !!voter && parachainId > 0 },
  });
}

export function useProposalTally(parachainId: number, proposalIndex: number) {
  const { useReadContract } = require("wagmi");
  return useReadContract({
    address: CONTRACT_ADDRESSES.voting,
    abi: VOTING_ABI,
    functionName: "getProposalTally",
    args: [parachainId, BigInt(proposalIndex)],
    query: { enabled: parachainId > 0 },
    refetchInterval: 15_000,
  });
}
