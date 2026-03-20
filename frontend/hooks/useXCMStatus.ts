"use client";

import { useState, useEffect } from "react";
import { useWatchContractEvent } from "wagmi";
import { CONTRACT_ADDRESSES, VOTING_ABI, DELIVERY_STATUS } from "@/lib/contracts";

export type XCMStatus = "idle" | "pending" | "sent" | "delivered" | "failed";

export function useXCMStatus(voteId: `0x${string}` | null) {
  const [status, setStatus] = useState<XCMStatus>("idle");
  const [xcmMessageId, setXcmMessageId] = useState<string | null>(null);

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.voting,
    abi: VOTING_ABI,
    eventName: "VoteDelivered",
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as any).args;
        if (args?.voteId === voteId) {
          setStatus("delivered");
        }
      }
    },
    enabled: !!voteId,
  });

  function setVoteSent(msgId: string) {
    setXcmMessageId(msgId);
    setStatus("sent");
  }

  function reset() {
    setStatus("idle");
    setXcmMessageId(null);
  }

  return { status, xcmMessageId, setVoteSent, reset };
}

export function statusFromNumber(n: number): XCMStatus {
  if (n === DELIVERY_STATUS.Pending) return "pending";
  if (n === DELIVERY_STATUS.Sent) return "sent";
  if (n === DELIVERY_STATUS.Delivered) return "delivered";
  if (n === DELIVERY_STATUS.Failed) return "failed";
  return "idle";
}

export function statusLabel(s: XCMStatus): string {
  const map: Record<XCMStatus, string> = {
    idle: "—",
    pending: "Pending",
    sent: "Sent via XCM",
    delivered: "Delivered",
    failed: "Failed",
  };
  return map[s];
}
