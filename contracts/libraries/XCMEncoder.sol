// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * XCMEncoder
 * ============================================================
 * Pure encoding library for constructing XCM v5 messages and
 * SCALE-encoded governance pallet calls in Solidity.
 *
 * XCM messages on Polkadot are SCALE-encoded byte arrays.
 * This library provides builder functions that produce the
 * correct byte sequences for the GovMesh vote dispatch and
 * proposal query flows.
 *
 * Key concepts encoded here:
 *
 * MultiLocation — A relative path to a cross-chain destination.
 *   For a parachain: { parents: 1, interior: X1(Parachain(id)) }
 *   Encoded as: 0x01 (parents=1) + 0x00 (X1 junction count prefix)
 *               + 0x00 (Parachain junction variant) + SCALE(id as u32)
 *
 * AssetId (DOT) — The native relay token represented as:
 *   { Concrete: { parents: 1, interior: Here } }
 *   Encoded as: 0x00 (Concrete variant) + 0x01 (parents=1) + 0x00 (Here)
 *
 * XCM Instructions:
 *   WithdrawAsset  — variant 0x00
 *   BuyExecution   — variant 0x06
 *   Transact       — variant 0x06 (in v5 encoding context)
 *   RefundSurplus  — variant 0x0d
 *   DepositAsset   — variant 0x08
 *
 * Note on SCALE encoding:
 *   uint32 → 4 bytes little-endian
 *   uint64 → 8 bytes little-endian
 *   Compact integers use the SCALE compact encoding (variable length)
 *   Byte arrays are prefixed with their compact-encoded length
 *
 * encodeVoteCall      — Encodes the remote governance pallet
 *                       vote(ref_index, vote) extrinsic call.
 *                       The vote byte encodes both the type (Aye/Nay)
 *                       and the conviction in a single u8.
 *
 * encodeVoteMessage   — Assembles the full XCM v5 message for a
 *                       vote dispatch including all 5 instructions.
 *
 * encodeQueryMessage  — Assembles an XCM query message targeting
 *                       the remote governance pallet state.
 *
 * encodeParachainDest — Encodes a parachain destination MultiLocation
 *                       as a SCALE byte array ready for the precompile.
 *
 * encodeU32LE         — Utility: encodes a uint32 as 4-byte little-endian.
 * encodeCompact       — Utility: SCALE compact-encodes a uint256.
 * ============================================================
 */

library XCMEncoder {
    uint8 private constant JUNCTION_PARACHAIN = 0x00;
    uint8 private constant JUNCTION_ACCOUNT_ID32 = 0x01;
    uint8 private constant ASSET_CONCRETE = 0x00;
    uint8 private constant WITHDRAW_ASSET = 0x00;
    uint8 private constant BUY_EXECUTION = 0x06;
    uint8 private constant TRANSACT = 0x07;
    uint8 private constant REFUND_SURPLUS = 0x0d;
    uint8 private constant DEPOSIT_ASSET = 0x08;

    function encodeParachainDest(uint32 parachainId) internal pure returns (bytes memory) {
        return abi.encodePacked(
            uint8(0x01),
            uint8(0x01),
            JUNCTION_PARACHAIN,
            encodeU32LE(parachainId)
        );
    }

    function encodeVoteCall(
        uint256 refIndex,
        bool aye,
        bool abstain,
        uint8 conviction
    ) internal pure returns (bytes memory) {
        uint8 voteByte;
        if (abstain) {
            voteByte = 0x02;
        } else if (aye) {
            voteByte = 0x80 | (conviction & 0x7F);
        } else {
            voteByte = conviction & 0x7F;
        }

        bytes memory compactIndex = encodeCompact(refIndex);

        return abi.encodePacked(
            uint8(0x15),
            uint8(0x00),
            compactIndex,
            uint8(0x00),
            voteByte
        );
    }

    function encodeVoteMessage(
        uint32 parachainId,
        bytes memory encodedCall,
        uint64 maxRefTime,
        uint64 proofSize,
        uint128 feeDotPlanck
    ) internal pure returns (bytes memory) {
        bytes memory dotAsset = encodeDotAsset(feeDotPlanck);
        bytes memory weightLimit = encodeWeightLimit(maxRefTime, proofSize);
        bytes memory transactPayload = encodeTransact(encodedCall, maxRefTime, proofSize);

        return abi.encodePacked(
            uint8(0x05),
            WITHDRAW_ASSET, dotAsset,
            BUY_EXECUTION, dotAsset, weightLimit,
            TRANSACT, transactPayload,
            REFUND_SURPLUS,
            DEPOSIT_ASSET, encodeParachainDest(parachainId)
        );
    }

    function encodeDotAsset(uint128 amountPlanck) internal pure returns (bytes memory) {
        bytes memory dotLocation = abi.encodePacked(
            uint8(0x01),
            uint8(0x00)
        );
        return abi.encodePacked(
            uint8(0x01),
            ASSET_CONCRETE,
            dotLocation,
            uint8(0x00),
            encodeCompact(amountPlanck)
        );
    }

    function encodeTransact(
        bytes memory call,
        uint64 maxRefTime,
        uint64 proofSize
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(
            uint8(0x01),
            encodeU64LE(maxRefTime),
            encodeU64LE(proofSize),
            encodeCompact(call.length),
            call
        );
    }

    function encodeWeightLimit(
        uint64 refTime,
        uint64 proofSize
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(
            uint8(0x00),
            encodeU64LE(refTime),
            encodeU64LE(proofSize)
        );
    }

    function encodeU32LE(uint32 value) internal pure returns (bytes memory) {
        bytes memory result = new bytes(4);
        result[0] = bytes1(uint8(value));
        result[1] = bytes1(uint8(value >> 8));
        result[2] = bytes1(uint8(value >> 16));
        result[3] = bytes1(uint8(value >> 24));
        return result;
    }

    function encodeU64LE(uint64 value) internal pure returns (bytes memory) {
        bytes memory result = new bytes(8);
        for (uint8 i = 0; i < 8; i++) {
            result[i] = bytes1(uint8(value >> (i * 8)));
        }
        return result;
    }

    function encodeCompact(uint256 value) internal pure returns (bytes memory) {
        if (value < 0x40) {
            return abi.encodePacked(uint8(value << 2));
        } else if (value < 0x4000) {
            uint16 v = uint16((value << 2) | 0x01);
            return abi.encodePacked(uint8(v), uint8(v >> 8));
        } else if (value < 0x40000000) {
            uint32 v = uint32((value << 2) | 0x02);
            return abi.encodePacked(
                uint8(v), uint8(v >> 8), uint8(v >> 16), uint8(v >> 24)
            );
        } else {
            bytes memory bigInt = new bytes(33);
            uint256 i = 0;
            uint256 v = value;
            while (v > 0) {
                bigInt[i + 1] = bytes1(uint8(v));
                v >>= 8;
                i++;
            }
            bigInt[0] = bytes1(uint8(((i - 4) << 2) | 0x03));
            bytes memory trimmed = new bytes(i + 1);
            for (uint256 j = 0; j <= i; j++) {
                trimmed[j] = bigInt[j];
            }
            return trimmed;
        }
    }
}
