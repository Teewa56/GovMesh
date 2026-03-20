# GovMesh 🕸️

> **Cross-Parachain Governance Execution Layer on Polkadot Hub**

[![Polkadot Hub](https://img.shields.io/badge/Polkadot-Hub-E6007A?style=flat-square&logo=polkadot)](https://polkadot.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![PVM](https://img.shields.io/badge/PVM-PolkaVM-E6007A?style=flat-square)](https://github.com/paritytech/polkavm)
[![Track](https://img.shields.io/badge/Track-2%20PVM%20Smart%20Contracts-purple?style=flat-square)]()
[![Hackathon](https://img.shields.io/badge/Polkadot%20Solidity%20Hackathon-2026-pink?style=flat-square)]()

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem](#the-problem)
3. [The Solution](#the-solution)
4. [Track Alignment](#track-alignment)
5. [Architecture](#architecture)
6. [System Flow](#system-flow)
7. [Smart Contracts](#smart-contracts)
8. [Precompiles Used](#precompiles-used)
9. [XCM Integration](#xcm-integration)
10. [Tech Stack](#tech-stack)
11. [Folder Structure](#folder-structure)
12. [Getting Started](#getting-started)
13. [Environment Setup](#environment-setup)
14. [Deployment Guide](#deployment-guide)
15. [Testing](#testing)
16. [Frontend](#frontend)
17. [Roadmap](#roadmap)
18. [Team](#team)

---

## Overview

**GovMesh** is a unified, on-chain cross-parachain governance execution layer deployed on Polkadot Hub. It allows DOT holders to discover, read, deliberate, and vote on active governance proposals across multiple Polkadot parachains — from a single Solidity-powered interface — using native DOT as the voting weight token and XCM as the execution transport.

Instead of navigating to Moonbeam's governance portal, then Astar's, then Hydration's, and managing separate wallet interactions per chain, GovMesh aggregates live governance state via XCM message reads and precompile calls into one unified contract. Votes are submitted cross-chain — all from Polkadot Hub, all in one transaction session.

**This is not a governance dashboard. It is a governance execution layer.** The contract doesn't just display proposals — it routes signed vote commitments back to their origin parachains via XCM.

---

## The Problem

Polkadot's multi-chain architecture is one of its greatest strengths — and its biggest UX liability for governance.

- **Fragmentation:** Every parachain runs its own governance system (OpenGov modules, custom pallets, DAO contracts). Participating requires separately visiting each chain's dApp, connecting a wallet, and submitting a transaction per chain.
- **Low participation:** Because the friction is high, most DOT holders silently abstain from parachain governance, concentrating influence among a few active participants.
- **No cross-chain context:** Voters have no unified view of how proposals across chains interact — e.g., a treasury spend on one chain may be correlated with a protocol upgrade on another.
- **No native aggregation primitive:** There is no existing on-chain mechanism that composes governance reads and writes across parachains on Polkadot.

GovMesh fixes this.

---

## The Solution

GovMesh is built entirely on Polkadot Hub using Solidity smart contracts running on PolkaVM (PVM). It leverages three core Polkadot-native capabilities that are uniquely available on Polkadot Hub:

| Capability | GovMesh Usage |
|---|---|
| **XCM Precompile** | Read active governance proposals from connected parachains |
| **Native Assets Precompile** | Use DOT (native asset) as the voting weight token with no wrapping |
| **XCM Message Dispatch** | Send signed vote commitments back to parachain governance pallets |

### What a user can do with GovMesh:

1. **Connect once** — one wallet, one chain (Polkadot Hub)
2. **Browse** — see all active proposals across registered parachains in one feed
3. **Deliberate** — view proposal metadata, discussion links, and on-chain stats per proposal
4. **Vote** — submit Aye/Nay/Abstain with DOT conviction weight
5. **Confirm** — watch XCM delivery receipts confirm vote acceptance on the target parachain

---

## Track Alignment

GovMesh competes in **Track 2: PVM Smart Contracts** and deliberately hits all three sub-categories:

### ✅ Accessing Polkadot Native Functionality — Precompiles
GovMesh uses the XCM precompile (`0x0000...0800`) deployed on Polkadot Hub to dispatch cross-chain messages and the Native Assets precompile (`0x0000...0801`) to read DOT balances for voting weight calculation — without any ERC-20 wrapping.

### ✅ Applications Using Polkadot Native Assets
DOT is the governance token for GovMesh. Voting conviction is computed directly from the user's native DOT balance read via the assets precompile. No bridged or wrapped token is involved.

### ✅ PVM-Experiments: Solidity Calling Polkadot-Native Logic
The core dispatch path — from a Solidity function call → XCM message encoding → delivery to a remote parachain's governance pallet — is a novel composition that only works because PVM allows Solidity contracts to invoke XCM precompiles natively. This is the experiment: can Solidity be the control plane for Polkadot's cross-chain governance? GovMesh answers yes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POLKADOT HUB (EVM/PVM)                      │
│                                                                     │
│   ┌─────────────────┐     ┌──────────────────┐                      │
│   │  GovMeshRegistry│───▶ │  GovMeshVoting   │                      │
│   │  (Solidity)     │     │  (Solidity)      │                     │
│   │                 │     │                  │                     │
│   │ - Parachain reg │     │ - Vote commit    │                     │
│   │ - Proposal sync │     │ - Conviction calc│                     │
│   │ - Proposal store│     │ - Vote history   │                     │
│   └────────┬────────┘     └────────┬─────────┘                     │
│            │                       │                                │
│            ▼                       ▼                                │
│   ┌─────────────────────────────────────────┐                      │
│   │           XCM Dispatcher (Solidity)      │                      │
│   │   Encodes and dispatches XCM messages    │                      │
│   │   via the XCM Precompile (0x0800)        │                      │
│   └─────────────────┬───────────────────────┘                       │
│                     │                                               │
│   ┌─────────────────┼───────────────────────┐                      │
│   │  Native Assets  │  XCM Precompile        │                      │
│   │  Precompile     │  (0x0000...0800)        │                      │
│   │  (DOT balance)  │                        │                      │
│   └─────────────────┴────────────────────────┘                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │  XCM v5
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
   ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
   │  Moonbeam   │   │    Astar     │   │   Hydration      │
   │  OpenGov    │   │  Governance  │   │   Governance     │
   │  Pallet     │   │  Pallet      │   │   Pallet         │
   └─────────────┘   └──────────────┘   └──────────────────┘
```

### Component Breakdown

#### `GovMeshRegistry.sol`
The registry contract is the data layer. It maintains:
- A list of registered parachains (parachain ID + governance pallet address + XCM location)
- A cache of active proposals synced via XCM query responses
- Proposal metadata: title, description IPFS hash, voting end block, current tally
- Access control for admin-registered parachains and permissionless community registration (with stake)

#### `GovMeshVoting.sol`
The voting contract handles user vote commitments:
- Reads the user's DOT balance via the Native Assets precompile
- Computes conviction multiplier (1x–6x, matching OpenGov conviction voting)
- Records the vote commitment on-chain (Polkadot Hub)
- Dispatches the vote to the target parachain via `XCMDispatcher`

#### `XCMDispatcher.sol`
The execution layer. Encodes XCM `Transact` calls targeting the governance pallet on the remote parachain. Uses the XCM precompile to:
- Build a `MultiLocation` destination
- Encode the remote `vote(ref_index, vote)` call
- Dispatch the XCM message with appropriate fee handling via `BuyExecution`

---

## System Flow

### Proposal Sync Flow
```
Cron/Keeper trigger
       │
       ▼
GovMeshRegistry.syncProposals(parachainId)
       │
       ▼
XCMDispatcher.queryRemoteProposals()
       │  [XCM Query sent via precompile]
       ▼
Target Parachain Governance Pallet
       │  [XCM QueryResponse returned]
       ▼
GovMeshRegistry.onQueryResponse()  ← callback
       │
       ▼
Proposals stored on-chain (Polkadot Hub)
```

### Vote Execution Flow
```
User calls GovMeshVoting.vote(parachainId, proposalIndex, voteType, conviction)
       │
       ▼
Native Assets Precompile → fetch user DOT balance
       │
       ▼
Conviction weight computed = balance × multiplier
       │
       ▼
Vote commitment recorded in GovMeshVoting storage
       │
       ▼
XCMDispatcher.dispatchVote(destination, encodedCall)
       │
       ▼
XCM Precompile (0x0800) → sends XCM to target parachain
       │
       ▼
Target parachain executes vote on governance pallet
       │
       ▼
XCM receipt → emit VoteDelivered event on Hub
```

---

## Smart Contracts

### `GovMeshRegistry.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGovMeshRegistry {
    struct Parachain {
        uint32 id;
        string name;
        bytes xcmLocation;      // Encoded MultiLocation
        address govPallet;      // Remote governance pallet address (EVM-equiv)
        bool active;
    }

    struct Proposal {
        uint256 index;
        uint32 parachainId;
        string title;
        string metadataIpfsHash;
        uint256 endBlock;
        uint256 ayeVotes;
        uint256 nayVotes;
        bool open;
    }

    event ParachainRegistered(uint32 indexed id, string name);
    event ProposalSynced(uint32 indexed parachainId, uint256 proposalIndex);

    function registerParachain(uint32 id, string calldata name, bytes calldata xcmLocation) external;
    function syncProposals(uint32 parachainId) external;
    function getProposals(uint32 parachainId) external view returns (Proposal[] memory);
    function getActiveParachains() external view returns (Parachain[] memory);
}
```

### `GovMeshVoting.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGovMeshVoting {
    enum VoteType { Aye, Nay, Abstain }

    struct VoteRecord {
        address voter;
        uint32 parachainId;
        uint256 proposalIndex;
        VoteType voteType;
        uint8 conviction;       // 0–6 matching OpenGov conviction
        uint256 votingWeight;   // DOT balance × conviction multiplier
        uint256 timestamp;
        bool delivered;         // XCM delivery confirmed
    }

    event VoteCommitted(address indexed voter, uint32 parachainId, uint256 proposalIndex, VoteType voteType);
    event VoteDelivered(address indexed voter, uint32 parachainId, uint256 proposalIndex);

    function vote(
        uint32 parachainId,
        uint256 proposalIndex,
        VoteType voteType,
        uint8 conviction
    ) external;

    function getVoteHistory(address voter) external view returns (VoteRecord[] memory);
    function getProposalTally(uint32 parachainId, uint256 proposalIndex) external view returns (uint256 aye, uint256 nay);
}
```

### `XCMDispatcher.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// XCM Precompile interface (Polkadot Hub)
interface IXcmPrecompile {
    function xcmExecute(bytes memory message, uint64 maxWeight) external returns (uint32 outcome);
    function xcmSend(bytes memory dest, bytes memory message) external returns (bytes32 messageId);
}

// Native Assets Precompile interface
interface INativeAssets {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IXCMDispatcher {
    function dispatchVote(
        bytes calldata xcmDest,
        uint256 proposalIndex,
        bool aye,
        uint8 conviction,
        uint256 votingBalance
    ) external returns (bytes32 messageId);

    function queryRemoteProposals(bytes calldata xcmDest) external returns (bytes32 queryId);
}
```

---

## Precompiles Used

| Precompile | Address | Purpose |
|---|---|---|
| **XCM Interface** | `0x0000000000000000000000000000000000000800` | Send XCM messages to parachains |
| **Native Assets** | `0x0000000000000000000000000000000000000801` | Read DOT balances without wrapping |
| **Governance** | `0x0000000000000000000000000000000000000803` | Read Hub-level governance state |

> These are the standard precompile addresses on Polkadot Hub. Confirm against the official Polkadot Hub developer docs at deployment time as these may be finalized during the hackathon period.

---

## XCM Integration

GovMesh uses **XCM v5** message composition. The vote dispatch constructs a message with the following instructions:

```
WithdrawAsset(DOT fee amount)
BuyExecution(fee asset, Unlimited weight)
Transact {
  originKind: SovereignAccount,
  requireWeightAtMost: { refTime, proofSize },
  call: Encoded(governance.vote(index, vote))
}
RefundSurplus
DepositAsset(remaining → GovMesh contract)
```

The XCM destination is a `MultiLocation` pointing to the target parachain:
```
{ parents: 1, interior: X1(Parachain(parachainId)) }
```

The `Transact` payload is a SCALE-encoded call to the remote parachain's governance pallet — specifically the `vote(ref_index, vote)` extrinsic in the `pallet-democracy` or `pallet-referenda` module, depending on the parachain's governance implementation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract Language** | Solidity 0.8.28 |
| **Runtime** | PolkaVM (PVM) on Polkadot Hub |
| **Development Framework** | Hardhat 3 (with Polkadot Hub network config) |
| **Testing** | Hardhat + Chai + Ethers.js v6 |
| **XCM Encoding** | `@polkadot/api` + custom XCM builder utility |
| **SCALE Encoding** | `@polkadot/types` |
| **Frontend Framework** | Next.js 15 (App Router) |
| **Frontend Styling** | Tailwind CSS v4 |
| **Blockchain Client** | Ethers.js v6 / wagmi v2 |
| **Wallet** | RainbowKit (MetaMask, SubWallet, Talisman) |
| **Data Layer** | On-chain storage + IPFS (via Pinata) for proposal metadata |
| **Indexer** | Subsquid (for vote history and proposal event indexing) |
| **Contract Verification** | Blockscout (Polkadot Hub explorer) |

---

## Folder Structure

```
govmesh/
│
├── contracts/                          # All Solidity smart contracts
│   ├── core/
│   │   ├── GovMeshRegistry.sol         # Parachain + proposal registry
│   │   ├── GovMeshVoting.sol           # Vote commitment + weight logic
│   │   └── XCMDispatcher.sol          # XCM encoding + precompile dispatch
│   ├── interfaces/
│   │   ├── IGovMeshRegistry.sol
│   │   ├── IGovMeshVoting.sol
│   │   ├── IXCMDispatcher.sol
│   │   ├── IXcmPrecompile.sol         # Polkadot Hub XCM precompile interface
│   │   └── INativeAssets.sol          # Native assets precompile interface
│   ├── libraries/
│   │   ├── XCMEncoder.sol             # XCM instruction encoding helpers
│   │   └── ConvictionMath.sol         # Conviction multiplier computation
│   └── mocks/
│       ├── MockXcmPrecompile.sol       # For local testing
│       ├── MockNativeAssets.sol
│       └── MockGovernancePallet.sol
│
├── scripts/
│   ├── deploy/
│   │   ├── 00_deploy_registry.ts
│   │   ├── 01_deploy_voting.ts
│   │   ├── 02_deploy_dispatcher.ts
│   │   └── 03_register_parachains.ts
│   ├── tasks/
│   │   ├── sync-proposals.ts          # Keeper script: trigger proposal sync
│   │   └── check-delivery.ts          # Monitor XCM vote delivery
│   └── utils/
│       ├── xcm-builder.ts             # XCM MultiLocation + message builder
│       ├── scale-encoder.ts           # SCALE-encode remote call payloads
│       └── parachain-config.ts        # Known parachain IDs + governance info
│
├── test/
│   ├── unit/
│   │   ├── Registry.test.ts
│   │   ├── Voting.test.ts
│   │   └── XCMDispatcher.test.ts
│   ├── integration/
│   │   ├── VoteFlow.test.ts           # Full vote → XCM dispatch flow
│   │   └── ProposalSync.test.ts
│   └── fixtures/
│       ├── parachain-fixtures.ts
│       └── proposal-fixtures.ts
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Proposal feed (home)
│   │   ├── proposals/
│   │   │   └── [parachainId]/
│   │   │       └── [proposalIndex]/
│   │   │           └── page.tsx       # Individual proposal view + vote UI
│   │   ├── history/
│   │   │   └── page.tsx              # User vote history
│   │   └── parachains/
│   │       └── page.tsx              # Registered parachains list
│   ├── components/
│   │   ├── ProposalCard.tsx
│   │   ├── VoteModal.tsx
│   │   ├── ConvictionSlider.tsx
│   │   ├── XCMStatusBadge.tsx        # Live XCM delivery status indicator
│   │   ├── ParachainBadge.tsx
│   │   └── WalletConnect.tsx
│   ├── hooks/
│   │   ├── useGovMesh.ts             # Contract read/write hooks
│   │   ├── useProposals.ts
│   │   ├── useVoteHistory.ts
│   │   └── useXCMStatus.ts
│   ├── lib/
│   │   ├── contracts.ts              # ABI + address config
│   │   ├── wagmi.ts                  # wagmi + RainbowKit config
│   │   └── polkadot-hub-chain.ts     # Custom chain definition for Polkadot Hub
│   └── public/
│       └── govmesh-logo.svg
│
├── subsquid/                           # On-chain event indexer
│   ├── src/
│   │   ├── processor.ts
│   │   ├── handlers/
│   │   │   ├── voteCommitted.ts
│   │   │   ├── voteDelivered.ts
│   │   │   └── proposalSynced.ts
│   │   └── model/
│   │       └── generated/
│   └── schema.graphql
│
├── docs/
│   ├── architecture.md
│   ├── xcm-message-spec.md
│   ├── precompile-reference.md
│   └── parachain-integration-guide.md
│
├── hardhat.config.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9 (recommended) or npm
- A Polkadot Hub testnet account with test DOT
- MetaMask, SubWallet, or Talisman wallet configured for Polkadot Hub

### Installation

```bash
# Clone the repository
git clone https://github.com/teewa56/govmesh.git
cd govmesh

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

---

## Environment Setup

Create a `.env` file at the root with the following:

```env
# Deployment
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Polkadot Hub RPC
POLKADOT_HUB_RPC_URL=https://rpc.polkadot-hub.io
POLKADOT_HUB_CHAIN_ID=420420421  # Confirm this for testnet

# Precompile Addresses (Polkadot Hub)
XCM_PRECOMPILE_ADDRESS=0x0000000000000000000000000000000000000800
NATIVE_ASSETS_PRECOMPILE=0x0000000000000000000000000000000000000801

# IPFS (Pinata for proposal metadata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET=your_pinata_secret

# Blockscout verification
BLOCKSCOUT_API_KEY=your_blockscout_api_key
BLOCKSCOUT_URL=https://blockscout.polkadot-hub.io

# Frontend
NEXT_PUBLIC_POLKADOT_HUB_RPC=https://rpc.polkadot-hub.io
NEXT_PUBLIC_REGISTRY_ADDRESS=deployed_registry_address
NEXT_PUBLIC_VOTING_ADDRESS=deployed_voting_address
```

---

## Deployment Guide

### Step 1: Compile Contracts

```bash
pnpm hardhat compile
```

### Step 2: Run Tests (Local)

```bash
pnpm hardhat test
```

### Step 3: Deploy to Polkadot Hub Testnet

```bash
# Deploy in order — Registry first, then Voting (needs Registry address), then Dispatcher
pnpm hardhat run scripts/deploy/00_deploy_registry.ts --network polkadot-hub-testnet
pnpm hardhat run scripts/deploy/01_deploy_voting.ts --network polkadot-hub-testnet
pnpm hardhat run scripts/deploy/02_deploy_dispatcher.ts --network polkadot-hub-testnet

# Register initial parachains (Moonbeam, Astar, Hydration)
pnpm hardhat run scripts/deploy/03_register_parachains.ts --network polkadot-hub-testnet
```

### Step 4: Verify Contracts

```bash
pnpm hardhat verify --network polkadot-hub-testnet DEPLOYED_CONTRACT_ADDRESS
```

### Step 5: Launch Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### Hardhat Network Config (`hardhat.config.ts`)

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {},
    "polkadot-hub-testnet": {
      url: process.env.POLKADOT_HUB_RPC_URL!,
      chainId: 420420421,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: {
      "polkadot-hub-testnet": process.env.BLOCKSCOUT_API_KEY!,
    },
    customChains: [
      {
        network: "polkadot-hub-testnet",
        chainId: 420420421,
        urls: {
          apiURL: `${process.env.BLOCKSCOUT_URL}/api`,
          browserURL: process.env.BLOCKSCOUT_URL!,
        },
      },
    ],
  },
};

export default config;
```

---

## Testing

GovMesh has a three-layer test suite:

### Unit Tests

Each contract is tested in isolation with mock precompiles. Mock contracts replicate the XCM precompile and native assets precompile interfaces locally so Hardhat can simulate their behavior.

```bash
pnpm hardhat test test/unit/Registry.test.ts
pnpm hardhat test test/unit/Voting.test.ts
pnpm hardhat test test/unit/XCMDispatcher.test.ts
```

### Integration Tests

Integration tests simulate the full vote flow — from `vote()` call through XCM dispatch — using mock precompile contracts deployed in the same Hardhat environment.

```bash
pnpm hardhat test test/integration/VoteFlow.test.ts
```

### End-to-End (Testnet)

Manual E2E testing is done on Polkadot Hub testnet against real parachains. A Paseo (Polkadot's testnet relay chain) environment is used to test actual XCM delivery to Moonbase Alpha and Shibuya.

```bash
# Run the keeper to trigger a proposal sync
pnpm hardhat run scripts/tasks/sync-proposals.ts --network polkadot-hub-testnet

# Check XCM vote delivery status
pnpm hardhat run scripts/tasks/check-delivery.ts --network polkadot-hub-testnet
```

---

## Frontend

The frontend is a Next.js 15 app with three primary views:

### Proposal Feed (`/`)
- Lists all active proposals across registered parachains
- Filter by parachain, vote status, and end date
- Each card shows: parachain badge, proposal title, current tally, time remaining, and user's vote status

### Proposal Detail (`/proposals/[parachainId]/[proposalIndex]`)
- Full proposal metadata (pulled from IPFS hash stored on-chain)
- Live tally chart (aye vs nay DOT weight)
- Vote modal with conviction selector (1x–6x) — mirrors OpenGov UX exactly
- XCM delivery status tracker — shows: `Pending → Sent → Delivered` with the XCM message ID

### Vote History (`/history`)
- Full record of the user's votes across all parachains
- Delivery confirmation status per vote
- Exportable as a CSV

---

## Roadmap

### Hackathon Scope (MVP)
- [x] `GovMeshRegistry` — parachain + proposal storage
- [x] `GovMeshVoting` — vote commitment with conviction math
- [x] `XCMDispatcher` — XCM vote dispatch via precompile
- [x] Frontend — proposal feed, vote modal, history
- [x] Testnet deployment (Polkadot Hub testnet → Moonbase Alpha)
- [x] Full test suite (unit + integration)

### Post-Hackathon
- [ ] Proposal sync automation via on-chain keeper network
- [ ] Governance analytics dashboard (turnout, conviction distribution)
- [ ] Support for parachain-specific governance modules (not just `pallet-democracy`)
- [ ] DAO tooling: delegate voting, voting coalitions across parachains
- [ ] Mobile app (via WalletConnect + RainbowKit mobile)

---

## Team

| Name | Role |
|---|---|
| **Marvellous** | Protocol Architect, Smart Contract Developer, Full-Stack |

---

## License

MIT — see [LICENSE](./LICENSE)

---

> Built for the **Polkadot Solidity Hackathon 2026** — co-organized by OpenGuild and Web3 Foundation.
> Powered by Polkadot Hub, PolkaVM, and XCM.
