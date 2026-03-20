"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConvictionSlider } from "./ConvictionSlider";
import { XCMStatusBadge } from "./XCMStatusBadge";
import { ParachainBadge } from "./ParachainBadge";
import { useVote } from "@/hooks/useGovMesh";
import { XCMStatus } from "@/hooks/useXCMStatus";
import { VOTE_TYPE } from "@/lib/contracts";

interface VoteModalProps {
  open: boolean;
  onClose: () => void;
  parachainId: number;
  proposalIndex: number;
  proposalTitle: string;
  dotBalance?: bigint;
}

type VoteChoice = "aye" | "nay" | "abstain" | null;

export function VoteModal({
  open,
  onClose,
  parachainId,
  proposalIndex,
  proposalTitle,
  dotBalance,
}: VoteModalProps) {
  const { address } = useAccount();
  const [choice, setChoice] = useState<VoteChoice>(null);
  const [conviction, setConviction] = useState(1);
  const [xcmStatus, setXcmStatus] = useState<XCMStatus>("idle");

  const { submitVote, hash, isPending, isConfirming, isSuccess, error } = useVote();

  useEffect(() => {
    if (isPending || isConfirming) setXcmStatus("pending");
    if (isSuccess) setXcmStatus("sent");
  }, [isPending, isConfirming, isSuccess]);

  useEffect(() => {
    if (!open) {
      setChoice(null);
      setConviction(1);
      setXcmStatus("idle");
    }
  }, [open]);

  if (!open) return null;

  const voteTypeNum =
    choice === "aye" ? VOTE_TYPE.Aye : choice === "nay" ? VOTE_TYPE.Nay : VOTE_TYPE.Abstain;

  function handleVote() {
    if (!choice || !address) return;
    submitVote(parachainId, proposalIndex, voteTypeNum, conviction);
  }

  const btnBase = "flex-1 py-3 rounded-xl font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200 border";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-neutral-800 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #111111 100%)" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <ParachainBadge parachainId={parachainId} size="sm" />
              <p className="mt-2 text-white font-light text-base leading-snug">{proposalTitle}</p>
              <p className="text-xs font-mono text-neutral-600 mt-1">Proposal #{proposalIndex}</p>
            </div>
            <button onClick={onClose} className="text-neutral-600 hover:text-white text-xl mt-0.5 transition-colors">×</button>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          {/* Vote Choice */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Your Vote</span>
            <div className="flex gap-3">
              <button
                className={`${btnBase} ${
                  choice === "aye"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_16px_rgba(34,197,94,0.2)]"
                    : "border-neutral-800 text-neutral-600 hover:border-emerald-800 hover:text-emerald-600"
                }`}
                onClick={() => setChoice("aye")}
              >
                Aye
              </button>
              <button
                className={`${btnBase} ${
                  choice === "nay"
                    ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.2)]"
                    : "border-neutral-800 text-neutral-600 hover:border-red-900 hover:text-red-600"
                }`}
                onClick={() => setChoice("nay")}
              >
                Nay
              </button>
              <button
                className={`${btnBase} ${
                  choice === "abstain"
                    ? "bg-neutral-600/30 border-neutral-500 text-neutral-300"
                    : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                }`}
                onClick={() => setChoice("abstain")}
              >
                Abstain
              </button>
            </div>
          </div>

          {/* Conviction — hidden for abstain */}
          {choice && choice !== "abstain" && (
            <ConvictionSlider value={conviction} onChange={setConviction} dotBalance={dotBalance} />
          )}

          {/* XCM Status */}
          {xcmStatus !== "idle" && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">XCM Dispatch</span>
              <XCMStatusBadge status={xcmStatus} xcmMessageId={hash} />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs font-mono text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
              {(error as any).shortMessage || error.message}
            </p>
          )}

          {/* Submit */}
          {!isSuccess ? (
            <button
              disabled={!choice || !address || isPending || isConfirming}
              onClick={handleVote}
              className="w-full py-4 rounded-xl font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: choice ? "linear-gradient(135deg, #E6007A, #9f0057)" : "#1a1a1a",
                color: choice ? "white" : "#555",
                boxShadow: choice ? "0 0 24px rgba(230,0,122,0.3)" : "none",
              }}
            >
              {!address
                ? "Connect Wallet"
                : isPending
                ? "Confirm in Wallet..."
                : isConfirming
                ? "Broadcasting XCM..."
                : `Cast Vote via XCM`}
            </button>
          ) : (
            <div className="text-center py-4">
              <p className="text-emerald-400 font-mono text-sm font-bold">✓ Vote submitted via XCM</p>
              <p className="text-neutral-600 font-mono text-xs mt-1">Your vote is being delivered cross-chain</p>
              <button onClick={onClose} className="mt-4 text-xs font-mono text-neutral-500 underline">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
