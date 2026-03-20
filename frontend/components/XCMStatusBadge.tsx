"use client";

import { XCMStatus } from "@/hooks/useXCMStatus";

interface XCMStatusBadgeProps {
  status: XCMStatus;
  xcmMessageId?: string | null;
}

const CONFIG: Record<XCMStatus, { label: string; color: string; pulse: boolean }> = {
  idle:      { label: "—",            color: "#555",    pulse: false },
  pending:   { label: "Pending",      color: "#F59E0B", pulse: true  },
  sent:      { label: "Sent via XCM", color: "#3B82F6", pulse: true  },
  delivered: { label: "Delivered ✓",  color: "#22C55E", pulse: false },
  failed:    { label: "Failed",       color: "#EF4444", pulse: false },
};

export function XCMStatusBadge({ status, xcmMessageId }: XCMStatusBadgeProps) {
  const { label, color, pulse } = CONFIG[status];

  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-2 text-xs font-mono font-semibold"
        style={{ color }}
      >
        <span
          className={`w-2 h-2 rounded-full ${pulse ? "animate-pulse" : ""}`}
          style={{ backgroundColor: color, boxShadow: pulse ? `0 0 8px ${color}` : "none" }}
        />
        {label}
      </span>
      {xcmMessageId && status !== "idle" && (
        <span className="text-[10px] font-mono text-neutral-600 truncate max-w-[180px]">
          {xcmMessageId.slice(0, 18)}…
        </span>
      )}
    </div>
  );
}
