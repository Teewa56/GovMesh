# Precompile Reference

## Overview

Polkadot Hub exposes Substrate-level functionality to Solidity contracts via a set of system precompiles — EVM-compatible contracts deployed at fixed addresses that proxy calls into the Polkadot runtime. GovMesh uses two of these precompiles directly. This document is the authoritative reference for how GovMesh interacts with each one.

---

## 1. XCM Interface Precompile

**Address:** `0x0000000000000000000000000000000000000800`

**Used by:** `XCMDispatcher.sol`

**Purpose:** Dispatches XCM v5 messages to remote parachains and sends queries to read remote state.

### Interface

```solidity
interface IXcmPrecompile {
    function xcmExecute(
        bytes calldata message,
        uint64 maxWeight
    ) external returns (uint32 outcome);

    function xcmSend(
        bytes calldata dest,
        bytes calldata message
    ) external returns (bytes32 messageId);

    function xcmQuery(
        bytes calldata dest,
        bytes calldata queryData,
        address responder,
        uint64 timeout
    ) external returns (uint64 queryId);
}
```

### `xcmSend`

Dispatches an XCM message to a remote destination. The message is SCALE-encoded as a `VersionedXcm` byte array.

| Parameter | Type | Description |
|---|---|---|
| `dest` | `bytes` | SCALE-encoded `MultiLocation` of the destination |
| `message` | `bytes` | SCALE-encoded `VersionedXcm` message body |

**Returns:** A `bytes32` message ID that can be used to track delivery. Returns `bytes32(0)` on failure.

**GovMesh usage:** Called once per `dispatchVote()` invocation. The returned `messageId` is stored in `_dispatchedMessages[voteId]` and in the `VoteRecord` for frontend display.

**Failure modes:**
- Returns `bytes32(0)` if the XCM precompile rejects the message (malformed destination, insufficient sovereign balance, etc.)
- GovMesh checks for zero return and reverts with `XCMSendFailed` if encountered

### `xcmExecute`

Executes an XCM message locally on Polkadot Hub (not cross-chain). Used for local operations only — not used by GovMesh in the current version.

| Parameter | Type | Description |
|---|---|---|
| `message` | `bytes` | SCALE-encoded `VersionedXcm` message |
| `maxWeight` | `uint64` | Maximum ref_time weight units to allow |

**Returns:** Outcome code. `0` = Complete (success). Non-zero = error.

### `xcmQuery`

Sends an XCM query to a remote destination and registers a callback address for the response.

| Parameter | Type | Description |
|---|---|---|
| `dest` | `bytes` | SCALE-encoded `MultiLocation` of the query destination |
| `queryData` | `bytes` | Arbitrary data included in the query message |
| `responder` | `address` | Contract to call when the response arrives |
| `timeout` | `uint64` | Number of blocks before the query expires |

**Returns:** A `uint64` query ID. The response will arrive by calling `responder.onQueryResponse(queryId, responseData)`.

**GovMesh usage:** Called by `queryRemoteProposals()` to fetch active proposal state from each registered parachain during the sync flow.

---

## 2. Native Assets Precompile

**Address:** `0x0000000000000000000000000000000000000801`

**Used by:** `GovMeshVoting.sol`

**Purpose:** Read-only access to the native DOT token balance without any ERC-20 wrapping, bridging, or token transfers.

### Interface

```solidity
interface INativeAssets {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function lockedOf(address account) external view returns (uint256);
}
```

### `balanceOf`

Returns the total DOT balance (free + reserved + locked) of an address in Planck units.

| Parameter | Type | Description |
|---|---|---|
| `account` | `address` | The address to query |

**Returns:** Balance in Planck (10 decimal places). 1 DOT = `10_000_000_000` Planck.

**GovMesh usage:** Called once inside `GovMeshVoting.vote()` before conviction weight computation. The balance is read at the block of the vote transaction — it is not locked or reserved by GovMesh. The actual token lock (if any) occurs on the target parachain as a consequence of the governance vote.

### `totalSupply`

Returns the total circulating DOT supply on Polkadot Hub in Planck.

**GovMesh usage:** Not used in current version. Available for future quorum calculations.

### `lockedOf`

Returns the amount of DOT currently locked for any reason (staking, governance, vesting) for a given address.

**GovMesh usage:** Not used in current version. Available to implement a "free balance only" voting weight check if required by governance parameters.

---

## Denomination Reference

All DOT values returned by the Native Assets precompile are in **Planck**, the smallest denomination of DOT.

| Unit | Planck value | Example |
|---|---|---|
| 1 Planck | 1 | Minimum unit |
| 1 milli-DOT | 10,000,000 | 0.001 DOT |
| 1 DOT | 10,000,000,000 | Standard unit |
| 1 kilo-DOT | 10,000,000,000,000 | 1000 DOT |

The `formatDot()` and `formatDotShort()` utility functions in `frontend/lib/contracts.ts` handle the Planck-to-DOT conversion for display.

---

## Precompile Address Verification

Before deploying to Polkadot Hub mainnet, always verify the precompile addresses against the official Polkadot Hub documentation and the runtime source. Precompile addresses may differ between testnet and mainnet deployments, and between different Hub runtime versions.

**Recommended verification steps:**

1. Check the current Polkadot Hub runtime source at `https://github.com/paritytech/polkadot-sdk`
2. Confirm precompile addresses in the Hub EVM configuration
3. Deploy a lightweight test contract that calls each precompile and verify it returns expected data before deploying the full GovMesh system

If a precompile address changes in a future runtime upgrade, `XCMDispatcher` and `GovMeshVoting` can be upgraded via their UUPS proxy to use the new address without migrating storage.

---

## Gas Cost Reference

Precompile calls are significantly cheaper than equivalent Solidity contract calls because they execute natively in the Polkadot runtime rather than in the EVM/PVM. Approximate gas costs for GovMesh precompile calls:

| Call | Approximate EVM gas |
|---|---|
| `NativeAssets.balanceOf()` | ~3,000 |
| `XcmPrecompile.xcmSend()` | ~50,000–200,000 (varies with message size) |
| `XcmPrecompile.xcmQuery()` | ~30,000–100,000 |

These estimates are indicative. Actual costs depend on the Polkadot Hub runtime version and XCM message complexity. Always benchmark against the testnet before estimating production fee requirements.