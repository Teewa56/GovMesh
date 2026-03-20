"use client";

import { useAccount } from "wagmi";
import { useVoteHistory } from "@/hooks/useVoteHistory";
import { statusFromNumber, statusLabel } from "@/hooks/useXCMStatus";
import { ParachainBadge } from "@/components/ParachainBadge";
import { XCMStatusBadge } from "@/components/XCMStatusBadge";
import { PARACHAIN_NAMES } from "@/lib/contracts";
import Link from "next/link";

const ONE_DOT = 10_000_000_000n;
const VOTE_LABELS = ["Aye", "Nay", "Abstain"];
const VOTE_COLORS = ["#22c55e", "#ef4444", "#737373"];

function formatDot(planck: bigint): string {
  const dot = Number(planck) / Number(ONE_DOT);
  if (dot >= 1_000_000) return `${(dot / 1_000_000).toFixed(2)}M DOT`;
  if (dot >= 1_000) return `${(dot / 1_000).toFixed(2)}K DOT`;
  return `${dot.toFixed(4)} DOT`;
}

function formatTs(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function convictionLabel(c: number): string {
  if (c === 0) return "0.1×";
  return `${c}×`;
}

export default function HistoryPage() {
  const { address } = useAccount();
  const { data: votes, isLoading } = useVoteHistory(address);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center text-2xl">
          🔐
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">Connect your wallet</p>
          <p className="text-xs font-mono text-neutral-600 mt-1">Your vote history will appear here</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 bg-neutral-900 rounded-xl w-40" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-neutral-900 rounded-2xl" />
        ))}
      </div>
    );
  }

  const voteList = (votes || []) as any[];
  const delivered = voteList.filter((v) => v.status === 2).length;
  const pending = voteList.filter((v) => v.status <= 1).length;
  const failed = voteList.filter((v) => v.status === 3).length;

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          Vote <span style={{ color: "#E6007A" }}>History</span>
        </h1>
        <p className="text-xs font-mono text-neutral-600">
          {address.slice(0, 6)}…{address.slice(-4)} · {voteList.length} vote{voteList.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats row */}
      {voteList.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Delivered", value: delivered, color: "#22c55e" },
            { label: "Pending / Sent", value: pending, color: "#F59E0B" },
            { label: "Failed", value: failed, color: "#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-2xl font-bold" style={{ color, fontFamily: "'Space Mono', monospace" }}>
                {value}
              </p>
              <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Vote list */}
      {voteList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-4xl">🕸️</p>
          <p className="font-mono text-sm text-neutral-600 text-center">
            No votes cast yet. Head to the{" "}
            <Link href="/" className="text-[#E6007A] hover:underline">proposal feed</Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {[...voteList].reverse().map((vote: any, i: number) => {
            const xcmStatus = statusFromNumber(Number(vote.status));
            const voteTypeNum = Number(vote.voteType);
            const color = VOTE_COLORS[voteTypeNum] || "#737373";
            const label = VOTE_LABELS[voteTypeNum] || "Unknown";
            const chainName = PARACHAIN_NAMES[Number(vote.parachainId)] || `Chain ${vote.parachainId}`;

            return (
              <div
                key={vote.voteId}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden transition-all duration-200 hover:border-neutral-700"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Vote badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0"
                    style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
                  >
                    {label.slice(0, 3).toUpperCase()}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ParachainBadge parachainId={Number(vote.parachainId)} size="sm" />
                      <Link
                        href={`/proposals/${vote.parachainId}/${vote.proposalIndex}`}
                        className="text-sm text-neutral-300 font-mono hover:text-white transition-colors"
                      >
                        Proposal #{vote.proposalIndex.toString()}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-mono text-neutral-600">
                        {formatTs(vote.timestamp)}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-700">·</span>
                      <span className="text-[10px] font-mono" style={{ color }}>
                        {label} · {convictionLabel(Number(vote.conviction))}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-700">·</span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {formatDot(vote.votingWeight)} weight
                      </span>
                    </div>
                  </div>

                  {/* XCM status */}
                  <div className="shrink-0">
                    <XCMStatusBadge
                      status={xcmStatus}
                      xcmMessageId={vote.xcmMessageId}
                    />
                  </div>
                </div>

                {/* XCM message ID bar */}
                {vote.xcmMessageId && vote.xcmMessageId !== "0x" + "0".repeat(64) && (
                  <div className="px-5 py-2 border-t border-neutral-900 flex items-center gap-3">
                    <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-widest">XCM ID</span>
                    <span className="text-[9px] font-mono text-neutral-600 truncate">
                      {vote.xcmMessageId}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}