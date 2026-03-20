"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACT_ADDRESSES, REGISTRY_ABI } from "@/lib/contracts";

export function useActiveParachains() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getActiveParachains",
  });
}

export function useProposals(parachainId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getProposals",
    args: [parachainId],
    query: { enabled: parachainId > 0 },
  });
}

export function useProposal(parachainId: number, proposalIndex: number) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getProposal",
    args: [parachainId, BigInt(proposalIndex)],
    query: { enabled: parachainId > 0 && proposalIndex >= 0 },
  });
}

export function useAllProposals(parachainIds: number[]) {
  const contracts = parachainIds.map((id) => ({
    address: CONTRACT_ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getProposals" as const,
    args: [id] as const,
  }));

  const result = useReadContracts({ contracts });

  const allProposals = result.data
    ? result.data.flatMap((r, i) =>
        r.status === "success" && Array.isArray(r.result)
          ? (r.result as any[]).map((p) => ({ ...p, parachainId: parachainIds[i] }))
          : []
      )
    : [];

  return { proposals: allProposals, isLoading: result.isLoading, error: result.error };
}
