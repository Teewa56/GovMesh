# GovMesh Architecture

## Overview

GovMesh is a cross-parachain governance execution layer deployed on Polkadot Hub. It consists of three Solidity smart contracts running on PolkaVM, a Next.js frontend, and a Subsquid indexer for off-chain event processing. The system allows any DOT holder to discover and vote on governance proposals across all registered Polkadot parachains from a single wallet connection and a single transaction session on Polkadot Hub.

---

## Core Design Principles

**Single entrypoint.** Users interact only with Polkadot Hub. No direct interaction with target parachains is required. The complexity of cross-chain messaging is fully abstracted into the contract layer.

**Trust minimisation.** Vote dispatch uses native XCM — the same transport Polkadot itself uses for cross-chain operations. There is no bridge, no relayer, no wrapped token, and no third-party trust assumption between the user's vote and its delivery on the target parachain.

**Strict access control.** Every state-modifying path is gated by role. The flow of data through the system — from vote submission to XCM dispatch to delivery confirmation — can only be triggered by the correct authorised caller at each step.

**Checks-effects-interactions.** All state writes happen before external calls throughout the codebase. If an external call reverts, the entire transaction reverts, leaving no partial or inconsistent state.

---

## Contract Layer

### GovMeshRegistry

The registry is the data layer. It stores parachain configurations and cached proposal state synced from remote chains via XCM queries.

**Storage layout:**

```
_parachains: mapping(uint32 => Parachain)
_activeParachainIds: uint32[]
_proposals: mapping(uint32 => Proposal[])
_proposalIndexMap: mapping(uint32 => mapping(uint256 => uint256))
_pendingQueryParachain: mapping(uint64 => uint32)
```

The `_proposalIndexMap` provides O(1) lookup of a proposal by index without iterating the proposals array. It stores `array index + 1` (using 0 as a sentinel for "not found").

**Roles:**

| Role | Holder | Permissions |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Deployer | Register/deactivate parachains, set dispatcher, pause/unpause |
| `UPGRADER_ROLE` | Deployer | Authorize UUPS implementation upgrades |
| `SYNCER_ROLE` | Keeper address | Trigger `syncProposals()` |
| `DISPATCHER_ROLE` | XCMDispatcher address | Write proposal data via `onQueryResponse()` and `writeProposal()` |

---

### GovMeshVoting

The voting contract is the user-facing execution layer. It reads the caller's native DOT balance via the Native Assets precompile, computes conviction-weighted voting power, records the vote, and forwards it to XCMDispatcher.

**Vote lifecycle:**

```
vote() called by user
    │
    ├── isValidConviction()         ← ConvictionMath.sol
    ├── hasVoted check              ← _hasVoted mapping
    ├── balanceOf via precompile    ← INativeAssets
    ├── computeWeight()             ← ConvictionMath.sol
    ├── Write VoteRecord            ← _votes mapping
    ├── Update tally                ← _tallyStore mapping
    ├── emit VoteCommitted
    │
    └── dispatcher.dispatchVote()   ← external call (after all state writes)
            │
            └── Returns xcmMessageId
                    │
                    ├── Update VoteRecord.xcmMessageId
                    ├── Update VoteRecord.status = Sent
                    └── emit VoteSent
```

**Delivery confirmation (async, triggered by keeper):**

```
dispatcher.notifyDelivery(voteId, xcmMessageId)
    │
    └── voting.confirmDelivery()    ← CONFIRMER_ROLE only
            │
            ├── Update VoteRecord.status = Delivered
            └── emit VoteDelivered
```

**Roles:**

| Role | Holder | Permissions |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Deployer | Set registry/dispatcher, set minimum balance, pause/unpause |
| `UPGRADER_ROLE` | Deployer | Authorize UUPS upgrades |
| `CONFIRMER_ROLE` | XCMDispatcher address | Call `confirmDelivery()` and `markFailed()` |

---

### XCMDispatcher

The dispatcher is the XCM execution engine. It encodes XCM v5 messages using the XCMEncoder library and dispatches them via the XCM precompile at `0x0000000000000000000000000000000000000800`.

**Dispatch path:**

```
dispatchVote(params)               ← VOTER_ROLE only
    │
    ├── Validate xcmDest and maxWeight
    ├── Encode vote call (SCALE)    ← XCMEncoder.encodeVoteCall()
    ├── Encode XCM message          ← XCMEncoder.encodeVoteMessage()
    ├── Write sentinel to _dispatchedMessages   ← prevents duplicate dispatch
    │
    └── xcmPrecompile.xcmSend()    ← external call (after state write)
            │
            └── Returns bytes32 xcmMessageId
                    │
                    ├── Overwrite _dispatchedMessages[voteId] = xcmMessageId
                    └── emit VoteDispatched
```

**Query path (proposal sync):**

```
queryRemoteProposals(parachainId, xcmDest)   ← REGISTRY_ROLE only
    │
    ├── Increment _queryNonce
    ├── Store parachainId in _queryParachainMap[queryId]
    └── xcmPrecompile.xcmQuery()
            │
            └── Returns queryId

[async] onQueryResponse(queryId, responseData)   ← RESPONDER_ROLE only
    │
    ├── Look up parachainId from _queryParachainMap
    ├── Delete _queryParachainMap[queryId]
    └── registry.onQueryResponse()
```

**Roles:**

| Role | Holder | Permissions |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Deployer | Set voting/registry, set responder, notify delivery/failure |
| `UPGRADER_ROLE` | Deployer | Authorize UUPS upgrades |
| `VOTER_ROLE` | GovMeshVoting address | Call `dispatchVote()` |
| `REGISTRY_ROLE` | GovMeshRegistry address | Call `queryRemoteProposals()` |
| `RESPONDER_ROLE` | XCM system responder | Call `onQueryResponse()` |

---

## Library Layer

### XCMEncoder.sol

Pure Solidity library for constructing SCALE-encoded XCM v5 messages. All functions are `internal pure` — no storage reads, no external calls, no gas overhead beyond computation.

Key encoding functions:

- `encodeParachainDest(uint32)` — Encodes `{ parents: 1, interior: X1(Parachain(id)) }` as bytes
- `encodeVoteCall(index, aye, abstain, conviction)` — Encodes the remote governance pallet call
- `encodeVoteMessage(parachainId, call, refTime, proofSize, fee)` — Assembles full XCM message
- `encodeCompact(uint256)` — SCALE compact integer encoding (variable 1–5 bytes)
- `encodeU32LE(uint32)` — 4-byte little-endian encoding
- `encodeU64LE(uint64)` — 8-byte little-endian encoding

### ConvictionMath.sol

Pure library for OpenGov conviction weight computation.

- `computeWeight(balance, conviction)` — Returns `balance / 10` for conviction 0, `balance * conviction` for 1–6
- `isValidConviction(conviction)` — Returns true if `conviction <= 6`
- `lockPeriods(conviction)` — Returns the number of enactment periods for lock (0, 1, 2, 4, 8, 16, 32)
- `multiplierOf(conviction)` — Returns `(numerator, denominator)` pair for display

---

## Precompile Layer

GovMesh uses two system precompiles deployed on Polkadot Hub:

| Precompile | Address | Used by |
|---|---|---|
| XCM Interface | `0x0000000000000000000000000000000000000800` | XCMDispatcher — send and query |
| Native Assets | `0x0000000000000000000000000000000000000801` | GovMeshVoting — DOT balance reads |

These precompiles are native Polkadot Hub system contracts. They expose Substrate-level functionality (XCM dispatch, asset balance reads) to the EVM/PVM execution environment. No wrapper contracts or bridges are involved.

---

## Indexer Layer (Subsquid)

The Subsquid processor subscribes to three events emitted by GovMeshVoting and GovMeshRegistry:

- `VoteCommitted` — New vote recorded on Polkadot Hub
- `VoteDelivered` — XCM delivery confirmed
- `ProposalSynced` — Proposal written to registry from XCM query response

Indexed data is exposed via a GraphQL API consumed by the frontend for vote history queries and proposal tally displays. The frontend primarily reads from the contracts directly (wagmi `useReadContract`) for live data and falls back to the Subsquid GraphQL endpoint for historical aggregation.

---

## Data Flow Summary

```
User
  │
  │  vote(parachainId, proposalIndex, voteType, conviction)
  ▼
GovMeshVoting (Polkadot Hub)
  │ reads DOT balance ──── INativeAssets precompile
  │ computes weight   ──── ConvictionMath library
  │ stores VoteRecord
  │
  │ dispatchVote()
  ▼
XCMDispatcher (Polkadot Hub)
  │ encodes vote call  ──── XCMEncoder library (SCALE)
  │ encodes XCM msg   ──── XCMEncoder library (XCM v5)
  │
  │ xcmSend()
  ▼
XCM Precompile (0x0800)
  │
  │  [XCM transport across Polkadot relay chain]
  ▼
Target Parachain Governance Pallet
  │ executes vote(refIndex, voteType)
  │
  │  [async] XCM delivery receipt
  ▼
XCMDispatcher.onQueryResponse() / notifyDelivery()
  │
  ▼
GovMeshVoting.confirmDelivery()
  │ VoteRecord.status = Delivered
  │ emit VoteDelivered
  ▼
Subsquid Indexer
  │ indexes VoteDelivered event
  ▼
Frontend (history page)
  shows Delivered status to user
```

---

## Upgrade Path

All three core contracts use the UUPS (Universal Upgradeable Proxy Standard) pattern from OpenZeppelin. The proxy address is stable — only the implementation can be replaced. Upgrades require `UPGRADER_ROLE` and are executed via `upgrades.upgradeProxy()` in Hardhat.

Storage layout compatibility is maintained via the `__gap` reserved storage slots in each contract (50 slots in Registry, 45 in Voting, 48 in Dispatcher). New storage variables added in future versions must be appended before the gap and must reduce the gap size accordingly.

The `_disableInitializers()` call in each constructor prevents the implementation contract from being initialized directly, ensuring all state lives exclusively in proxy storage.