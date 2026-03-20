// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * INativeAssets
 * ============================================================
 * Interface for the Polkadot Hub Native Assets precompile deployed
 * at address 0x0000000000000000000000000000000000000801.
 *
 * This precompile exposes the native DOT token balance and supply
 * to Solidity contracts without requiring any ERC-20 wrapping.
 * DOT remains a native Polkadot asset — no bridge, no wrapping,
 * no additional trust assumptions.
 *
 * balanceOf   — Returns the raw DOT balance of any address in the
 *               smallest denomination (Planck, 10 decimals).
 *               This is used by GovMesh to compute conviction-
 *               weighted voting power without any token transfers.
 *
 * totalSupply — Returns the total circulating DOT supply on Hub.
 *               Used for governance quorum and participation metrics.
 *
 * lockedOf    — Returns the amount of DOT locked by the given address
 *               in any locking reason (staking, vesting, governance).
 *               GovMesh uses this to verify a user has free DOT
 *               available to back their conviction vote.
 *
 * Security Notes:
 *   - Read-only precompile. No transfer or approval functionality.
 *   - Values are denominated in Planck (1 DOT = 10^10 Planck).
 *   - Balances reflect the on-chain state at the current block.
 * ============================================================
 */

interface INativeAssets {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function lockedOf(address account) external view returns (uint256);
}
