"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, VOTING_ABI } from "@/lib/contracts";

export function useVoteHistory(voter: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.voting,
    abi: VOTING_ABI,
    functionName: "getVoteHistory",
    args: voter ? [voter] : undefined,
    query: {
      enabled: !!voter,
      refetchInterval: 20_000,
    },
  });
}

export function useDeliveryStatus(xcmMessageId: string) {
  const isZero = !xcmMessageId || xcmMessageId === "0x" + "0".repeat(64);
  return { isDelivered: !isZero, isPending: isZero };
}
