"use client";

import { useState } from "react";
import Link from "next/link";
import { ParachainBadge } from "./ParachainBadge";
import { VoteModal } from "./VoteModal";
import { useAccount } from "wagmi";

interface Proposal {
  index: bigint;
  parachainId: number;
  title: string;
  metadataIpfsHash: string;
  endBlock: bigint;
  ayeVotes: bigint;
  nayVotes: bigint;
  abstainVotes: bigint;
  open: boolean;
  lastSyncedAt: bigint;
}

interface ProposalCardProps {
  proposal: Proposal;
  dotBalance?: bigint;
  hasVoted?: boolean;
}

const ONE_DOT = 10_000_000_000n;

function formatDotShort(planck: bigint): string {
  const dot = Number(planck) / Number(ONE_DOT);
  if (dot >= 1_000_000) return `${(dot / 1_000_000).toFixed(1)}M`;
  if (dot >= 1_000) return `${(dot / 1_000).toFixed(1)}K`;
  return dot.toFixed(0);
}

function getTallyPercent(aye: bigint, nay: bigint): number {
  const total = aye + nay;
  if (total === 0n) return 50;
  return Math.round((Number(aye) / Number(total)) * 100);
}

export function ProposalCard({ proposal, dotBalance, hasVoted }: ProposalCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { address } = useAccount();

  const ayePercent = getTallyPercent(proposal.ayeVotes, proposal.nayVotes);
  const nayPercent = 100 - ayePercent;
  const totalVotes = proposal.ayeVotes + proposal.nayVotes;

  return (
    <>
      <div
        className="group relative rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden transition-all duration-300 hover:border-neutral-700 hover:shadow-[0_0_32px_rgba(230,0,122,0.06)]"
      >
        {/* Accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(90deg, transparent, #E6007A, transparent)" }}
        />

        <div className="p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <ParachainBadge parachainId={proposal.parachainId} size="sm" />
              <Link
                href={`/proposals/${proposal.parachainId}/${proposal.index}`}
                className="text-white text-sm font-light leading-snug hover:text-[#E6007A] transition-colors line-clamp-2"
              >
                {proposal.title}
              </Link>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  proposal.open
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-900"
                    : "text-neutral-600 bg-neutral-900 border border-neutral-800"
                }`}
              >
                {proposal.open ? "Active" : "Closed"}
              </span>
              <span className="text-[10px] font-mono text-neutral-700">#{proposal.index.toString()}</span>
            </div>
          </div>

          {/* Tally bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-emerald-400">Aye {formatDotShort(proposal.ayeVotes)} DOT</span>
              <span className="text-neutral-600">{formatDotShort(totalVotes)} total</span>
              <span className="text-red-400">{formatDotShort(proposal.nayVotes)} DOT Nay</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-900 overflow-hidden flex">
              <div
                className="h-full rounded-l-full transition-all duration-500"
                style={{
                  width: `${ayePercent}%`,
                  background: "linear-gradient(90deg, #16a34a, #22c55e)",
                }}
              />
              <div
                className="h-full rounded-r-full"
                style={{
                  width: `${nayPercent}%`,
                  background: "linear-gradient(90deg, #dc2626, #ef4444)",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-700">
              Block #{proposal.endBlock.toString()}
            </span>

            {hasVoted ? (
              <span className="text-[10px] font-mono text-[#E6007A] bg-[#E6007A]/10 border border-[#E6007A]/20 px-3 py-1.5 rounded-full">
                ✓ Voted
              </span>
            ) : proposal.open && address ? (
              <button
                onClick={() => setModalOpen(true)}
                className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200"
                style={{
                  background: "rgba(230,0,122,0.12)",
                  color: "#E6007A",
                  border: "1px solid rgba(230,0,122,0.3)",
                }}
              >
                Vote
              </button>
            ) : (
              <Link
                href={`/proposals/${proposal.parachainId}/${proposal.index}`}
                className="text-[10px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                View →
              </Link>
            )}
          </div>
        </div>
      </div>

      <VoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        parachainId={proposal.parachainId}
        proposalIndex={Number(proposal.index)}
        proposalTitle={proposal.title}
        dotBalance={dotBalance}
      />
    </>
  );
}
