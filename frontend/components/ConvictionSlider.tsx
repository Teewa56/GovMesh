"use client";

import { CONVICTION_LABELS } from "@/lib/contracts";

interface ConvictionSliderProps {
  value: number;
  onChange: (v: number) => void;
  dotBalance?: bigint;
}

const ONE_DOT = 10_000_000_000n;

function computeWeight(balance: bigint, conviction: number): bigint {
  if (conviction === 0) return balance / 10n;
  return balance * BigInt(conviction);
}

function formatDot(planck: bigint): string {
  const dot = Number(planck) / Number(ONE_DOT);
  if (dot >= 1_000_000) return `${(dot / 1_000_000).toFixed(2)}M DOT`;
  if (dot >= 1_000) return `${(dot / 1_000).toFixed(2)}K DOT`;
  return `${dot.toFixed(4)} DOT`;
}

export function ConvictionSlider({ value, onChange, dotBalance }: ConvictionSliderProps) {
  const weight = dotBalance !== undefined ? computeWeight(dotBalance, value) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Conviction</span>
        {weight !== null && (
          <span className="text-xs font-mono text-[#E6007A]">
            {formatDot(weight)} weight
          </span>
        )}
      </div>

      <input
        type="range"
        min={0}
        max={6}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 appearance-none rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #E6007A ${(value / 6) * 100}%, #2a2a2a ${(value / 6) * 100}%)`,
          accentColor: "#E6007A",
        }}
      />

      <div className="flex justify-between text-[9px] font-mono text-neutral-600">
        {[0,1,2,3,4,5,6].map((v) => (
          <span
            key={v}
            className={`cursor-pointer transition-colors ${v === value ? "text-[#E6007A]" : "hover:text-neutral-400"}`}
            onClick={() => onChange(v)}
          >
            {v === 0 ? "0.1×" : `${v}×`}
          </span>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <p className="text-xs font-mono text-neutral-300">{CONVICTION_LABELS[value]}</p>
        <p className="text-[10px] font-mono text-neutral-600 mt-1">
          Token lock applied on the target parachain after vote
        </p>
      </div>
    </div>
  );
}
