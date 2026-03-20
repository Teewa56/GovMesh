"use client";

import { useActiveParachains } from "@/hooks/useProposals";
import { useProposals } from "@/hooks/useProposals";
import { PARACHAIN_COLORS, PARACHAIN_NAMES } from "@/lib/contracts";

function ParachainRow({ chain }: { chain: any }) {
  const id = Number(chain.id);
  const color = PARACHAIN_COLORS[id] || "#E6007A";
  const { data: proposals } = useProposals(id);
  const openCount = (proposals || []).filter((p: any) => p.open).length;

  const xcmPreview = chain.xcmLocation
    ? (chain.xcmLocation as string).slice(0, 20) + "…"
    : "—";

  const registeredDate = new Date(Number(chain.registeredAt) * 1000).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden transition-all duration-200 hover:border-neutral-700 group">
      {/* Color accent top bar */}
      <div className="h-0.5 w-full" style={{ background: color }} />

      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon + name */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
            style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30`, color }}
          >
            {chain.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-white font-semibold">{chain.name}</p>
            <p className="text-[10px] font-mono text-neutral-600 mt-0.5">
              Parachain ID: {chain.id.toString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Open Proposals</p>
            <p className="text-sm font-mono font-bold mt-1" style={{ color }}>
              {openCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Registered</p>
            <p className="text-sm font-mono text-neutral-400 mt-1">{registeredDate}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">XCM Location</p>
            <p className="text-[10px] font-mono text-neutral-500 mt-1 break-all">{xcmPreview}</p>
          </div>
        </div>

        {/* Status badge */}
        <div className="shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest"
            style={{
              color: chain.active ? "#22c55e" : "#737373",
              backgroundColor: chain.active ? "#22c55e15" : "#73737315",
              border: `1px solid ${chain.active ? "#22c55e30" : "#73737330"}`,
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${chain.active ? "animate-pulse" : ""}`}
              style={{ backgroundColor: chain.active ? "#22c55e" : "#737373" }}
            />
            {chain.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Gov pallet info footer */}
      <div className="px-5 py-3 border-t border-neutral-900 flex items-center gap-4">
        <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-widest">Gov Pallet</span>
        <span className="text-[9px] font-mono text-neutral-600">
          {chain.govPalletEncoded || "—"}
        </span>
      </div>
    </div>
  );
}

export default function ParachainsPage() {
  const { data: parachains, isLoading } = useActiveParachains();

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          Registered <span style={{ color: "#E6007A" }}>Parachains</span>
        </h1>
        <p className="text-sm text-neutral-500 max-w-lg">
          All parachains currently registered in the GovMesh Registry.
          Votes on proposals from these chains are dispatched via XCM from Polkadot Hub.
        </p>
      </div>

      {/* How it works info card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <p className="text-[10px] font-mono text-[#E6007A] uppercase tracking-widest mb-3">How GovMesh Connects</p>
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-neutral-500">
          <span className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
            Polkadot Hub
          </span>
          <span className="text-[#E6007A]">──XCM──▶</span>
          {(parachains || []).map((c: any, i: number) => (
            <span key={i}>
              <span className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800" style={{ color: PARACHAIN_COLORS[Number(c.id)] || "#E6007A" }}>
                {c.name}
              </span>
              {i < (parachains || []).length - 1 && <span className="mx-1 text-neutral-700">/</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Parachain list */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : (parachains || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-4xl">🕸️</p>
          <p className="font-mono text-sm text-neutral-600 text-center">
            No parachains registered yet. Run the deployment scripts to register chains.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 stagger">
          {(parachains as any[]).map((chain) => (
            <ParachainRow key={chain.id.toString()} chain={chain} />
          ))}
        </div>
      )}

      {/* Add parachain note */}
      <div className="rounded-xl border border-dashed border-neutral-800 p-5 text-center">
        <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
          Want to add a parachain?
        </p>
        <p className="text-xs font-mono text-neutral-700 mt-1">
          Parachains are registered by admin via{" "}
          <code className="text-neutral-500">GovMeshRegistry.registerParachain()</code>
        </p>
      </div>
    </div>
  );
}