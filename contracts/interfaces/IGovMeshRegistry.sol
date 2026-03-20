// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * IGovMeshRegistry
 * ============================================================
 * Interface for the GovMeshRegistry contract.
 *
 * The Registry is the data layer of GovMesh. It maintains:
 *   1. A registry of connected parachains with their XCM locations
 *      and governance pallet identifiers.
 *   2. A cached store of active governance proposals synced from
 *      each registered parachain via XCM queries.
 *   3. Lifecycle management for proposals (open, closed, expired).
 *
 * Parachain   — A struct representing a registered parachain.
 *               Contains the parachain ID, human name, SCALE-encoded
 *               XCM MultiLocation, and an active flag.
 *
 * Proposal    — A struct representing a synced governance proposal.
 *               Contains the proposal index on the source chain, the
 *               parachain ID, IPFS hash for metadata, voting window,
 *               and current aggregated tally from the source chain.
 *
 * Events:
 *   ParachainRegistered  — Emitted when a new parachain is added.
 *   ParachainDeactivated — Emitted when a parachain is removed.
 *   ProposalSynced       — Emitted when a proposal is written to storage
 *                          from an XCM query response.
 *   ProposalClosed       — Emitted when a proposal passes its end block.
 *
 * Access:
 *   registerParachain    — Admin only (DEFAULT_ADMIN_ROLE).
 *   deactivateParachain  — Admin only.
 *   syncProposals        — Callable by SYNCER_ROLE (keeper) or admin.
 *   onQueryResponse      — Callable only by XCMDispatcher contract.
 *   All view functions   — Public.
 * ============================================================
 */

interface IGovMeshRegistry {
    struct Parachain {
        uint32 id;
        string name;
        bytes xcmLocation;
        bytes govPalletEncoded;
        bool active;
        uint256 registeredAt;
    }

    struct Proposal {
        uint256 index;
        uint32 parachainId;
        string title;
        string metadataIpfsHash;
        uint256 endBlock;
        uint256 ayeVotes;
        uint256 nayVotes;
        uint256 abstainVotes;
        bool open;
        uint256 lastSyncedAt;
    }

    event ParachainRegistered(uint32 indexed id, string name, uint256 timestamp);
    event ParachainDeactivated(uint32 indexed id, uint256 timestamp);
    event ProposalSynced(uint32 indexed parachainId, uint256 indexed proposalIndex, uint256 timestamp);
    event ProposalClosed(uint32 indexed parachainId, uint256 indexed proposalIndex, uint256 timestamp);

    error ParachainAlreadyRegistered(uint32 id);
    error ParachainNotFound(uint32 id);
    error ParachainInactive(uint32 id);
    error ProposalNotFound(uint32 parachainId, uint256 proposalIndex);
    error UnauthorizedCaller(address caller);
    error InvalidXcmLocation();
    error InvalidParachainId();

    function registerParachain(
        uint32 id,
        string calldata name,
        bytes calldata xcmLocation,
        bytes calldata govPalletEncoded
    ) external;

    function deactivateParachain(uint32 id) external;

    function syncProposals(uint32 parachainId) external;

    function onQueryResponse(
        uint64 queryId,
        uint32 parachainId,
        bytes calldata responseData
    ) external;

    function getProposals(uint32 parachainId) external view returns (Proposal[] memory);
    function getProposal(uint32 parachainId, uint256 proposalIndex) external view returns (Proposal memory);
    function getActiveParachains() external view returns (Parachain[] memory);
    function getParachain(uint32 id) external view returns (Parachain memory);
    function isProposalOpen(uint32 parachainId, uint256 proposalIndex) external view returns (bool);
}
