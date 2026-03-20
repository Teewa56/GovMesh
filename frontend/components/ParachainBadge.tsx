"use client";

import { PARACHAIN_COLORS, PARACHAIN_NAMES } from "@/lib/contracts";

interface ParachainBadgeProps {
  parachainId: number;
  name?: string;
  size?: "sm" | "md";
}

export function ParachainBadge({ parachainId, name, size = "md" }: ParachainBadgeProps) {
  const color = PARACHAIN_COLORS[parachainId] || "#E6007A";
  const label = name || PARACHAIN_NAMES[parachainId] || `Chain ${parachainId}`;

  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold tracking-widest uppercase ${px}`}
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      {label}
    </span>
  );
}
