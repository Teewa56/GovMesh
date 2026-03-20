# XCM Message Specification

## Overview

GovMesh constructs XCM v5 messages in Solidity using the `XCMEncoder` library and dispatches them via the Polkadot Hub XCM precompile. This document specifies the exact structure of every XCM message type used by the protocol, the SCALE encoding of each field, and the expected remote execution behaviour.

---

## Message Type 1: Vote Dispatch

Sent by `XCMDispatcher.dispatchVote()` to deliver a governance vote to a remote parachain.

### Full Instruction Sequence

```
VersionedXcm::V5([
  WithdrawAsset([
    (MultiLocation { parents: 1, interior: Here }, Fungible(FEE_PLANCK))
  ]),
  BuyExecution {
    fees: (MultiLocation { parents: 1, interior: Here }, Fungible(FEE_PLANCK)),
    weight_limit: Limited { ref_time: MAX_REF_TIME, proof_size: MAX_PROOF_SIZE }
  },
  Transact {
    origin_kind: OriginKind::SovereignAccount,
    require_weight_at_most: Weight { ref_time: MAX_REF_TIME, proof_size: MAX_PROOF_SIZE },
    call: DoubleEncoded { encoded: VOTE_CALL_BYTES }
  },
  RefundSurplus,
  DepositAsset {
    assets: Wild(AllCounted(1)),
    beneficiary: MultiLocation { parents: 0, interior: X1(AccountId32 { network: None, id: DISPATCHER_SOVEREIGN }) }
  }
])
```

### Parameter Values

| Parameter | Value | Notes |
|---|---|---|
| `FEE_PLANCK` | `10_000_000_000` | 1 DOT, held in dispatcher sovereign account |
| `MAX_REF_TIME` | `1_000_000_000` | Conservative upper bound, surplus refunded |
| `MAX_PROOF_SIZE` | `65_536` | 64KB, surplus refunded |
| `origin_kind` | `SovereignAccount` | Vote is cast from GovMesh sovereign on target chain |

### Destination Encoding

The destination `MultiLocation` for a parachain is encoded as:

```
bytes: 0x01 01 00 [id_u32_le]
       │    │  │   └─ Parachain ID as 4-byte little-endian
       │    │  └───── Parachain junction variant (0x00)
       │    └──────── X1 junction count prefix (one junction)
       └───────────── parents = 1 (go up to relay chain)
```

Example — Moonbeam (ID 2004 = 0x000007D4):

```
0x 01 01 00 D4070000
```

### Vote Call Encoding (Transact Payload)

The `call` field inside `Transact` is a SCALE-encoded governance pallet extrinsic. For parachains using `pallet-democracy` or `pallet-referenda`:

```
[pallet_index: u8][call_index: u8][ref_index: compact<u32>][vote_byte_variant: u8][vote_byte: u8]
```

#### Vote Byte Encoding

The vote is encoded as a single byte following the `Standard` variant prefix (`0x00`):

```
Aye  with conviction C:  0x80 | C       (e.g. Aye conviction 2 = 0x82)
Nay  with conviction C:  0x00 | C       (e.g. Nay conviction 3 = 0x03)
Abstain:                 0x02            (Split abstain variant)
```

#### Full Example — Aye, Conviction 2, Proposal Index 7

```
Pallet index:   0x15        (democracy pallet, chain-specific)
Call index:     0x00        (vote call)
Ref index:      0x1C        (compact encoding of 7)
Variant:        0x00        (Standard vote variant)
Vote byte:      0x82        (Aye = 0x80 | conviction 2)

Full bytes: 0x 15 00 1C 00 82
```

### SCALE Compact Encoding Reference

| Value range | Encoding | Example |
|---|---|---|
| 0–63 | `value << 2` (1 byte) | 7 → `0x1C` |
| 64–16383 | `(value << 2) \| 0x01` (2 bytes LE) | 100 → `0x9101` |
| 16384–1073741823 | `(value << 2) \| 0x02` (4 bytes LE) | 65536 → `0x02000402` |
| ≥ 1073741824 | Big-integer mode (variable) | — |

---

## Message Type 2: Proposal State Query

Sent by `XCMDispatcher.queryRemoteProposals()` to read active proposal state from a remote parachain.

### Full Instruction Sequence

```
VersionedXcm::V5([
  UnpaidExecution {
    weight_limit: Unlimited,
    check_origin: None
  },
  ReportError {
    query_id: QUERY_ID,
    dest: MultiLocation { parents: 1, interior: X1(Parachain(HUB_ID)) },
    max_weight: Weight { ref_time: 1_000_000, proof_size: 4_096 }
  },
  Transact {
    origin_kind: OriginKind::Superuser,
    require_weight_at_most: Weight { ref_time: 500_000_000, proof_size: 32_768 },
    call: DoubleEncoded { encoded: QUERY_PROPOSALS_CALL_BYTES }
  },
  ReportTransact {
    query_id: QUERY_ID,
    dest: MultiLocation { parents: 1, interior: X1(Parachain(HUB_ID)) },
    max_weight: Weight { ref_time: 1_000_000, proof_size: 4_096 }
  }
])
```

### Query Response Handling

When the remote chain responds, the XCM precompile delivers the response to the `responder` address specified in `xcmQuery()`. This triggers `XCMDispatcher.onQueryResponse()` which routes the decoded response bytes to `GovMeshRegistry.onQueryResponse()` for storage.

Response data format (ABI-encoded for testnet, SCALE for production):

```solidity
abi.encode(
  uint256[] indices,      // proposal indices active on remote chain
  uint256[] endBlocks,    // end block for each proposal
  uint256[] ayeVotes,     // current aye tally in Planck
  uint256[] nayVotes      // current nay tally in Planck
)
```

---

## XCM Execution Weight Model

XCM execution weight on Polkadot uses a two-dimensional weight model:

| Dimension | Unit | Description |
|---|---|---|
| `ref_time` | picoseconds | Computational time, analogous to EVM gas |
| `proof_size` | bytes | Size of storage proof required for execution |

GovMesh uses conservative upper bounds for both dimensions and includes `RefundSurplus` + `DepositAsset` to return any unspent weight back to the dispatcher sovereign account. This means over-estimating weight is safe — it costs slightly more DOT upfront but the surplus is refunded atomically in the same XCM message.

### Recommended Bounds

| Operation | ref_time | proof_size |
|---|---|---|
| `pallet-democracy::vote` | 500_000_000 | 32_768 |
| `pallet-referenda::vote` | 600_000_000 | 65_536 |
| Proposal state query | 200_000_000 | 16_384 |

These values should be benchmarked against each target parachain's actual weight costs in production and adjusted accordingly.

---

## Sovereign Account Derivation

When GovMesh's XCM message arrives on a remote parachain, it executes as the `SovereignAccount` of Polkadot Hub on that parachain. The sovereign account address is derived deterministically:

```
sovereign = blake2_256("para" ++ encode_u32_le(HUB_PARACHAIN_ID) ++ 0x00...00)[0..32]
```

This account must hold a sufficient DOT balance on each target parachain to cover the `BuyExecution` fee. For testnet, this is funded manually. For production, a small DOT reserve mechanism should be implemented in the GovMesh treasury.

---

## Error Handling

If XCM execution fails on the remote chain (e.g., the proposal is closed, the sovereign account has insufficient balance, or the weight limit is exceeded), the XCM runtime on the remote chain produces an error outcome. This is surfaced to GovMesh via:

1. A `QueryResponse` with an error outcome code if `ReportError` is included
2. A `notifyFailure()` call from the keeper after the delivery timeout elapses

In both cases, `GovMeshVoting.markFailed()` is called with the voteId, setting the record status to `Failed` and emitting `VoteFailed`. The user can see this in the history page.

---

## XCM Version Compatibility

GovMesh targets **XCM v5**. The Polkadot Hub XCM precompile accepts SCALE-encoded `VersionedXcm` which includes a version prefix byte:

| Version | Prefix |
|---|---|
| V2 | `0x02` |
| V3 | `0x03` |
| V4 | `0x04` |
| V5 | `0x05` |

All `encodeVoteMessage()` outputs from `XCMEncoder.sol` include the `0x05` version prefix. If a target parachain only supports V3 or V4, the message must be downgraded using the `XcmVersionWrapper` instruction. This case is not yet handled by GovMesh and would require a per-parachain version configuration in the Registry.