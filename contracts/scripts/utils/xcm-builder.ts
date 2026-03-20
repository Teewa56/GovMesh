/*
 * ============================================================
 * xcm-builder.ts
 * ============================================================
 * Off-chain TypeScript utilities for constructing and inspecting
 * XCM v5 MultiLocation and message structures.
 *
 * These are used in deployment scripts and keeper tasks to:
 *   - Build XCM destination byte arrays for contract calls
 *   - Validate XCM locations before on-chain submission
 *   - Decode XCM message IDs from transaction receipts
 *   - Estimate XCM execution weights for fee estimation
 *
 * buildParachainDestination — Encodes a parachain MultiLocation
 *   as a hex byte string. This is the xcmDest parameter passed
 *   to GovMeshRegistry.registerParachain and XCMDispatcher.
 *
 * estimateVoteWeight — Returns conservative ref_time and proofSize
 *   estimates for a governance vote Transact instruction.
 *   These are upper bounds — unused weight is refunded via
 *   RefundSurplus in the XCM message.
 *
 * decodeXcmMessageId — Extracts the bytes32 message ID from a
 *   transaction receipt that called xcmSend on the precompile.
 *
 * validateXcmLocation — Sanity-checks that a byte string is a
 *   well-formed encoded MultiLocation before submitting on-chain.
 * ============================================================
 */

import { ethers } from "ethers";

export interface XcmWeight {
  refTime: bigint;
  proofSize: bigint;
}

export interface XcmMultiLocation {
  parents: number;
  interior: { parachain: number } | "Here";
}

export function buildParachainDestination(parachainId: number): string {
  if (parachainId <= 0 || parachainId > 0xffffffff) {
    throw new Error(`Invalid parachain ID: ${parachainId}`);
  }

  const idBuffer = Buffer.alloc(4);
  idBuffer.writeUInt32LE(parachainId, 0);

  const location = Buffer.concat([
    Buffer.from([0x01]),
    Buffer.from([0x01]),
    Buffer.from([0x00]),
    idBuffer,
  ]);

  return "0x" + location.toString("hex");
}

export function buildRelayChainDestination(): string {
  return "0x0100";
}

export function estimateVoteWeight(includeBuffer: boolean = true): XcmWeight {
  const baseRefTime = BigInt(500_000_000);
  const baseProofSize = BigInt(32_768);
  const bufferMultiplier = includeBuffer ? BigInt(2) : BigInt(1);

  return {
    refTime: baseRefTime * bufferMultiplier,
    proofSize: baseProofSize * bufferMultiplier,
  };
}

export function estimateQueryWeight(): XcmWeight {
  return {
    refTime: BigInt(200_000_000),
    proofSize: BigInt(16_384),
  };
}

export function validateXcmLocation(xcmLocationHex: string): boolean {
  if (!xcmLocationHex.startsWith("0x")) return false;

  const bytes = Buffer.from(xcmLocationHex.slice(2), "hex");

  if (bytes.length < 2) return false;

  const parents = bytes[0];
  if (parents > 2) return false;

  if (bytes.length === 2 && bytes[1] === 0x00) return true;

  if (bytes.length >= 6) {
    const junctionVariant = bytes[2];
    if (junctionVariant === 0x00) return true;
  }

  return false;
}

export function decodeXcmMessageId(
  receipt: ethers.TransactionReceipt,
  xcmPrecompileAddress: string
): string | null {
  const xcmSendTopic = ethers.id("XcmSent(bytes,bytes,bytes32)");

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() === xcmPrecompileAddress.toLowerCase() &&
      log.topics[0] === xcmSendTopic
    ) {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "bytes", "bytes32"],
        log.data
      );
      return decoded[2] as string;
    }
  }

  return null;
}

export function encodeConvictionVote(
  aye: boolean,
  abstain: boolean,
  conviction: number
): number {
  if (conviction < 0 || conviction > 6) {
    throw new Error(`Invalid conviction: ${conviction}. Must be 0–6.`);
  }

  if (abstain) return 0x02;
  if (aye) return 0x80 | (conviction & 0x7f);
  return conviction & 0x7f;
}

export function formatDot(planck: bigint): string {
  const dot = planck / BigInt(10_000_000_000);
  const remainder = planck % BigInt(10_000_000_000);
  return `${dot}.${remainder.toString().padStart(10, "0")} DOT`;
}
