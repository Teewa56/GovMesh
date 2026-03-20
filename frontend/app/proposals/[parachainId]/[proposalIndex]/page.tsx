"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useProposal } from "@/hooks/useProposals";
import { ParachainBadge } from "@/components/ParachainBadge";
import { VoteModal } from "@/components/VoteModal";
import { XCMStatusBadge } from "@/components/XCMStatusBadge";
import { formatDot, ONE_DOT } from "@/lib/contracts";

const ONE_DOT_N = 10_000_000_000n;

function TallyBar({ aye, nay, abstain }: { aye: bigint; nay: bigint; abstain: bigint }) {
  const total = aye + nay + abstain;
  if (total === 0n) return (
    <div className="h-3 w-full rounded-full bg-neutral-900" />
  );

  const ayePct = Math.round((Number(aye) / Number(total)) * 100);
  const nayPct = Math.round((Number(nay) / Number(total)) * 100);
  const abstPct = 100 - ayePct - nayPct;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-3 w-full rounded-full bg-neutral-900 overflow-hidden flex">
        {ayePct > 0 && (
          <div className="h-full" style={{ width: `${ayePct}%`, background: "linear-gradient(90deg, #16a34a, #22c55e)" }} />
        )}
        {abstPct > 0 && (
          <div className="h-full bg-neutral-700" style={{ width: `${abstPct}%` }} />
        )}
        {nayPct > 0 && (
          <div className="h-full" style={{ width: `${nayPct}%`, background: "linear-gradient(90deg, #dc2626, #ef4444)" }} />
        )}
      </div>
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-emerald-400">Aye {ayePct}%</span>
        {abstPct > 0 && <span className="text-neutral-500">Abstain {abstPct}%</span>}
        <span className="text-red-400">Nay {nayPct}%</span>
      </div>
    </div>
  );
}

export default function ProposalPage() {
  const params = useParams();
  const parachainId = Number(params.parachainId);
  const proposalIndex = Number(params.proposalIndex);

  const { address } = useAccount();
  const { data: proposal, isLoading } = useProposal(parachainId, proposalIndex);
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-neutral-900 rounded-xl w-48" />
        <div className="h-32 bg-neutral-900 rounded-2xl" />
        <div className="h-24 bg-neutral-900 rounded-2xl" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-4xl">🕸️</p>
        <p className="font-mono text-sm text-neutral-600">Proposal not found</p>
        <Link href="/" className="text-xs font-mono text-[#E6007A]">← Back to feed</Link>
      </div>
    );
  }

  const aye = (proposal as any).ayeVotes ?? 0n;
  const nay = (proposal as any).nayVotes ?? 0n;
  const abstain = (proposal as any).abstainVotes ?? 0n;
  const open = (proposal as any).open;

  return (
    <div className="flex flex-col gap-8 animate-fade-up max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-neutral-600">
        <Link href="/" className="hover:text-neutral-400 transition-colors">Proposals</Link>
        <span>/</span>
        <ParachainBadge parachainId={parachainId} size="sm" />
        <span>/</span>
        <span className="text-neutral-400">#{proposalIndex}</span>
      </div>

      {/* Title card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <ParachainBadge parachainId={parachainId} />
            <h1 className="text-xl font-semibold text-white leading-snug">
              {(proposal as any).title}
            </h1>
          </div>
          <span className={`shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
            open
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-900"
              : "text-neutral-600 bg-neutral-900 border-neutral-800"
          }`}>
            {open ? "Active" : "Closed"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
          {[
            { label: "Proposal ID", value: `#${proposalIndex}` },
            { label: "Parachain", value: `ID ${parachainId}` },
            { label: "End Block", value: `#${(proposal as any).endBlock?.toString()}` },
            { label: "Last Synced", value: new Date(Number((proposal as any).lastSyncedAt) * 1000).toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{label}</p>
              <p className="text-sm font-mono text-neutral-300 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tally card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col gap-5">
        <h2 className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Current Tally</h2>

        <TallyBar aye={aye} nay={nay} abstain={abstain} />

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Aye", value: aye, color: "#22c55e" },
            { label: "Nay", value: nay, color: "#ef4444" },
            { label: "Abstain", value: abstain, color: "#737373" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-neutral-900 p-3 text-center">
              <p className="text-xs font-mono font-bold" style={{ color }}>
                {formatDot(value)}
              </p>
              <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* IPFS metadata */}
      {(proposal as any).metadataIpfsHash && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Proposal Metadata</p>
            <p className="text-xs font-mono text-neutral-400 mt-1 truncate max-w-[260px]">
              {(proposal as any).metadataIpfsHash}
            </p>
          </div>
          <a
            href={`https://ipfs.io/ipfs/${(proposal as any).metadataIpfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[#E6007A] hover:underline shrink-0"
          >
            IPFS ↗
          </a>
        </div>
      )}

      {/* Vote button */}
      {open && address && (
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-4 rounded-2xl font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #E6007A, #9f0057)",
            color: "white",
            boxShadow: "0 0 32px rgba(230,0,122,0.25)",
          }}
        >
          Cast Vote via XCM
        </button>
      )}

      {!address && open && (
        <p className="text-center text-xs font-mono text-neutral-600 py-4">
          Connect your wallet to vote on this proposal
        </p>
      )}

      <VoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        parachainId={parachainId}
        proposalIndex={proposalIndex}
        proposalTitle={(proposal as any).title}
      />
    </div>
  );
}