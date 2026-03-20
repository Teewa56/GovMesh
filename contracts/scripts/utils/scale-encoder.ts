/*
 * ============================================================
 * scale-encoder.ts
 * ============================================================
 * Off-chain SCALE encoding utilities for constructing the
 * governance pallet call payloads used in XCM Transact instructions.
 *
 * SCALE (Simple Concatenated Aggregate Little-Endian) is the
 * binary encoding format used throughout Substrate/Polkadot.
 * These utilities mirror the on-chain XCMEncoder.sol library
 * but operate off-chain for script validation and test fixture
 * generation.
 *
 * encodeU32LE      — 4-byte little-endian uint32
 * encodeU64LE      — 8-byte little-endian uint64
 * encodeCompact    — SCALE compact integer (variable length)
 * encodeVoteCall   — Full encoded governance vote extrinsic
 *                    call data for a pallet-democracy or
 *                    pallet-referenda vote instruction
 * encodeBytes      — SCALE length-prefixed byte array
 *
 * The encodeVoteCall output is what gets placed inside the
 * Transact XCM instruction's `call` field. It is SCALE-encoded,
 * not ABI-encoded. The pallet index and call index prefix the
 * actual call parameters.
 *
 * Pallet indices vary by parachain. The default (0x15, 0x00)
 * corresponds to pallet-democracy vote on many Substrate chains.
 * Override with the correct indices for each target parachain.
 * ============================================================
 */

export function encodeU32LE(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

export function encodeU64LE(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value, 0);
  return buf;
}

export function encodeCompact(value: bigint): Buffer {
  if (value < BigInt(0x40)) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(Number(value) << 2, 0);
    return buf;
  } else if (value < BigInt(0x4000)) {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE((Number(value) << 2) | 0x01, 0);
    return buf;
  } else if (value < BigInt(0x40000000)) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE((Number(value) << 2) | 0x02, 0);
    return buf;
  } else {
    let v = value;
    const bytes: number[] = [];
    while (v > BigInt(0)) {
      bytes.push(Number(v & BigInt(0xff)));
      v >>= BigInt(8);
    }
    const prefix = ((bytes.length - 4) << 2) | 0x03;
    return Buffer.from([prefix, ...bytes]);
  }
}

export function encodeBytes(data: Buffer): Buffer {
  const lengthPrefix = encodeCompact(BigInt(data.length));
  return Buffer.concat([lengthPrefix, data]);
}

export interface VoteCallOptions {
  refIndex: number;
  aye: boolean;
  abstain: boolean;
  conviction: number;
  palletIndex?: number;
  callIndex?: number;
}

export function encodeVoteCall(opts: VoteCallOptions): string {
  const {
    refIndex,
    aye,
    abstain,
    conviction,
    palletIndex = 0x15,
    callIndex = 0x00,
  } = opts;

  if (conviction < 0 || conviction > 6) {
    throw new Error(`Invalid conviction ${conviction}. Must be 0–6.`);
  }

  let voteByte: number;
  if (abstain) {
    voteByte = 0x02;
  } else if (aye) {
    voteByte = 0x80 | (conviction & 0x7f);
  } else {
    voteByte = conviction & 0x7f;
  }

  const compactIndex = encodeCompact(BigInt(refIndex));

  const call = Buffer.concat([
    Buffer.from([palletIndex, callIndex]),
    compactIndex,
    Buffer.from([0x00]),
    Buffer.from([voteByte]),
  ]);

  return "0x" + call.toString("hex");
}

export function decodeCompact(data: Buffer, offset: number = 0): { value: bigint; bytesRead: number } {
  const mode = data[offset] & 0x03;

  if (mode === 0x00) {
    return { value: BigInt(data[offset] >> 2), bytesRead: 1 };
  } else if (mode === 0x01) {
    const v = ((data[offset + 1] << 8) | data[offset]) >> 2;
    return { value: BigInt(v), bytesRead: 2 };
  } else if (mode === 0x02) {
    const v =
      ((data[offset + 3] << 24) |
        (data[offset + 2] << 16) |
        (data[offset + 1] << 8) |
        data[offset]) >>>
      2;
    return { value: BigInt(v), bytesRead: 4 };
  } else {
    const byteCount = (data[offset] >> 2) + 4;
    let value = BigInt(0);
    for (let i = 0; i < byteCount; i++) {
      value |= BigInt(data[offset + 1 + i]) << BigInt(i * 8);
    }
    return { value, bytesRead: byteCount + 1 };
  }
}

export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace("0x", ""), "hex");
}
