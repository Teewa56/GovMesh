# Parachain Integration Guide

## Overview

This guide covers how to add a new parachain to GovMesh, what information is required, how to derive the correct XCM location and governance pallet encoding, and how to verify the integration works end-to-end on testnet before going live.

---

## What GovMesh Needs from a Parachain

To register a parachain in GovMeshRegistry, four pieces of information are required:

| Field | Type | Description |
|---|---|---|
| `id` | `uint32` | The parachain's ID on the Polkadot relay chain |
| `name` | `string` | Human-readable name for display in the frontend |
| `xcmLocation` | `bytes` | SCALE-encoded `MultiLocation` for XCM routing |
| `govPalletEncoded` | `bytes` | SCALE-encoded pallet + call index prefix for the vote extrinsic |

---

## Step 1: Find the Parachain ID

Every Polkadot parachain has a unique numeric ID assigned by the relay chain. You can find the ID for any parachain:

- **Polkadot.js Apps:** Go to `Network → Parachains` on `polkadot.js.org/apps`
- **Subscan:** Search for the parachain name at `polkadot.subscan.io`
- **On-chain query:** Call `paras.paraLifecycles` or `parachainInfo.parachainId` on the target chain

Example IDs for currently supported chains:

| Chain | Mainnet ID | Testnet ID |
|---|---|---|
| Moonbeam | 2004 | 1000 (Moonbase Alpha on Paseo) |
| Astar | 2006 | 1000 (Shibuya) |
| Hydration | 2034 | 2034 |

---

## Step 2: Encode the XCM Location

The `xcmLocation` is a SCALE-encoded `MultiLocation` pointing to the parachain from the relay chain. For any parachain, the format is:

```
{ parents: 1, interior: X1(Parachain(id)) }
```

SCALE byte encoding:

```
0x 01           ← parents = 1
   01           ← X1 (one junction)
   00           ← Parachain junction variant
   [id as 4-byte little-endian]
```

**JavaScript helper:**

```typescript
function encodeParachainXcmLocation(parachainId: number): string {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(parachainId, 0);
  return "0x0101000" + buf.toString("hex");

  // Note: full encoding is 0x01 + 0x01 + 0x00 + 4-byte LE id
}
```

**Examples:**

| Chain | ID (decimal) | ID (hex LE) | xcmLocation |
|---|---|---|---|
| Moonbeam | 2004 | `D4070000` | `0x010100D4070000` |
| Astar | 2006 | `D6070000` | `0x010100D6070000` |
| Hydration | 2034 | `F27D0000` | `0x010100F27D0000` |

---

## Step 3: Find the Governance Pallet Call Prefix

The `govPalletEncoded` field is a 2-byte prefix `[pallet_index, call_index]` for the governance vote extrinsic on the target parachain. This identifies which pallet and which call should be invoked via `Transact`.

**How to find it:**

1. Open Polkadot.js Apps connected to the target parachain
2. Go to `Developer → Runtime → Calls`
3. Select the governance pallet (usually `democracy` or `referenda`)
4. Select the `vote` call
5. Note the pallet index and call index displayed

Alternatively, decode a known governance vote transaction from the target chain's block explorer and extract the first two bytes of the call data.

**Common governance pallets:**

| Pallet | Typical pallet index | Vote call index | Prefix |
|---|---|---|---|
| `pallet-democracy` | 0x15 (varies) | 0x00 | `0x1500` |
| `pallet-referenda` | 0x14 (varies) | 0x01 | `0x1401` |
| `pallet-conviction-voting` | 0x13 (varies) | 0x00 | `0x1300` |

**Important:** Pallet indices are chain-specific and can change between runtime upgrades. Always verify the correct index against the current runtime of the target chain before registering.

---

## Step 4: Fund the Sovereign Account

GovMesh's XCM vote dispatch messages use `WithdrawAsset` + `BuyExecution` to pay for execution on the target parachain. The assets are drawn from Polkadot Hub's sovereign account on the target chain.

**Sovereign account derivation:**

The sovereign account for Polkadot Hub (as a parachain) on another parachain is derived as:

```
blake2_256(b"para" ++ encode_u32_le(HUB_PARACHAIN_ID))[0..32]
```

You can calculate this with `@polkadot/util-crypto`:

```typescript
import { u8aToHex } from "@polkadot/util";
import { blake2AsU8a } from "@polkadot/util-crypto";

const hubParachainId = 1000; // replace with actual Hub parachain ID
const prefix = new Uint8Array([0x70, 0x61, 0x72, 0x61]); // "para"
const idBytes = new Uint8Array(4);
new DataView(idBytes.buffer).setUint32(0, hubParachainId, true); // little-endian
const input = new Uint8Array([...prefix, ...idBytes, ...new Uint8Array(32)]);
const sovereignAccount = u8aToHex(blake2AsU8a(input, 256).slice(0, 32));
```

Fund this address on the target parachain with enough DOT to cover XCM execution fees. A reserve of 10–100 DOT is sufficient for testnet. Production reserves should be sized based on expected vote volume and fee costs.

---

## Step 5: Register the Parachain

Once you have all four fields, call `GovMeshRegistry.registerParachain()` from the admin address:

```typescript
import { ethers } from "hardhat";

const registry = await ethers.getContractAt("GovMeshRegistry", REGISTRY_ADDRESS);

await registry.registerParachain(
  2004,                         // id
  "Moonbeam",                   // name
  "0x010100D4070000",           // xcmLocation
  "0x1500"                      // govPalletEncoded (democracy.vote)
);
```

Or use the deployment script:

```bash
npm hardhat run scripts/deploy/03_register_parachains.ts --network polkadot-hub-testnet
```

To add a new parachain beyond the initial three, add an entry to `scripts/utils/parachain-config.ts` and re-run the registration script.

---

## Step 6: Verify on Testnet

After registering, verify the integration works end-to-end:

**1. Confirm registration:**

```typescript
const chain = await registry.getParachain(2004);
console.log(chain.name, chain.active); // "Moonbeam", true
```

**2. Write a test proposal:**

```typescript
const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
await registry.grantRole(DISPATCHER_ROLE, adminAddress);

await registry.writeProposal(
  2004, 1, "Test Proposal", "QmTestHash",
  9999999, 0n, 0n, 0n
);
```

**3. Submit a test vote:**

```typescript
const voting = await ethers.getContractAt("GovMeshVoting", VOTING_ADDRESS);
await voting.vote(2004, 1, 0, 1); // Aye, conviction 1
```

**4. Check XCM dispatch:**

Inspect the transaction logs for `VoteDispatched` on the XCMDispatcher and `VoteSent` on GovMeshVoting. Verify the `xcmMessageId` is non-zero.

**5. Monitor delivery:**

Run the check-delivery task and watch for `VoteDelivered` events:

```bash
npm hardhat run scripts/tasks/check-delivery.ts --network polkadot-hub-testnet
```

**6. Verify on target chain:**

Connect Polkadot.js Apps to the target testnet parachain and check whether the governance vote from Polkadot Hub's sovereign account appears in the democracy/referenda pallet.

---

## Troubleshooting

**XCM send returns zero messageId:**
- Check the dispatcher sovereign account has enough DOT on the target chain to pay execution fees
- Verify the `xcmLocation` bytes are correctly encoded (parents=1, correct parachain ID)
- Confirm the XCM precompile address is correct for the current Hub runtime

**Vote delivered but wrong vote recorded on target:**
- Check the `govPalletEncoded` prefix is correct for the current target chain runtime
- Verify the pallet index hasn't changed in a recent runtime upgrade
- Decode the raw `Transact` call bytes using SCALE and compare to expected extrinsic

**Proposal not showing in frontend:**
- Confirm the proposal was written to the Registry via `writeProposal()` or a sync cycle
- Check that `endBlock` is in the future relative to the current block number
- Verify the `isProposalOpen()` view function returns `true`

**Sovereign account balance depleted:**
- Top up the Hub sovereign account on the target parachain
- Consider implementing an automated treasury top-up mechanism for production