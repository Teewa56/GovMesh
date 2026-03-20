"use client";

import { useAccount } from "wagmi";
import { useActiveParachains, useAllProposals } from "@/hooks/useProposals";
import { ProposalCard } from "@/components/ProposalCard";
import { useState } from "react";

export default function HomePage() {
  const { address } = useAccount();
  const { data: parachains, isLoading: chainsLoading } = useActiveParachains();
  const parachainIds = (parachains || []).map((c: any) => Number(c.id));
  const { proposals, isLoading: propsLoading } = useAllProposals(parachainIds);

  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const [chainFilter, setChainFilter] = useState<number | null>(null);

  const loading = chainsLoading || propsLoading;

  const filtered = proposals.filter((p: any) => {
    const statusOk = filter === "all" ? true : filter === "open" ? p.open : !p.open;
    const chainOk = chainFilter === null ? true : Number(p.parachainId) === chainFilter;
    return statusOk && chainOk;
  });

  const openCount = proposals.filter((p: any) => p.open).length;

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Hero */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E6007A] glow-pulse" />
          <span className="text-[10px] font-mono text-[#E6007A] uppercase tracking-[0.2em]">
            Live · Polkadot Hub
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
          Cross-Chain
          <br />
          <span style={{ color: "#E6007A" }}>Governance</span> Feed
        </h1>
        <p className="text-sm text-neutral-500 max-w-lg">
          Browse and vote on active proposals across all registered Polkadot parachains.
          One wallet. One chain. Every vote delivered via XCM.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Proposals", value: openCount },
          { label: "Parachains", value: parachainIds.length },
          { label: "Total Proposals", value: proposals.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
              {loading ? "—" : value}
            </p>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-1">
          {(["open", "all", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-widest transition-all ${
                filter === f
                  ? "bg-[#E6007A] text-white"
                  : "text-neutral-600 hover:text-neutral-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Chain filter pills */}
        {(parachains || []).map((chain: any) => (
          <button
            key={chain.id}
            onClick={() => setChainFilter(chainFilter === Number(chain.id) ? null : Number(chain.id))}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              chainFilter === Number(chain.id)
                ? "border-[#E6007A]/50 text-[#E6007A] bg-[#E6007A]/10"
                : "border-neutral-800 text-neutral-600 hover:text-neutral-300 hover:border-neutral-700"
            }`}
          >
            {chain.name}
          </button>
        ))}
      </div>

      {/* Proposal grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-950 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-4xl">🕸️</p>
          <p className="font-mono text-sm text-neutral-600 text-center">
            {proposals.length === 0
              ? "No proposals synced yet. The keeper will sync soon."
              : "No proposals match the current filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {filtered.map((proposal: any) => (
            <ProposalCard
              key={`${proposal.parachainId}-${proposal.index}`}
              proposal={proposal}
              dotBalance={undefined}
              hasVoted={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
