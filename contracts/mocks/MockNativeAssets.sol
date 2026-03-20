// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * MockNativeAssets
 * ============================================================
 * Test double for the Polkadot Hub Native Assets precompile.
 *
 * Allows test harnesses to set arbitrary DOT balances per address
 * to test voting weight computation across all conviction levels,
 * minimum balance enforcement, and zero-balance edge cases.
 *
 * setBalance   — Set a mock DOT balance for any address (test only).
 * setLocked    — Set a mock locked DOT amount for any address.
 * balanceOf    — Returns the configured balance for the given account.
 * lockedOf     — Returns the configured locked amount.
 * totalSupply  — Returns the configured total supply.
 * ============================================================
 */

import "../interfaces/INativeAssets.sol";

contract MockNativeAssets is INativeAssets {
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _locked;
    uint256 private _totalSupply;

    function setBalance(address account, uint256 amount) external {
        _balances[account] = amount;
    }

    function setLocked(address account, uint256 amount) external {
        _locked[account] = amount;
    }

    function setTotalSupply(uint256 amount) external {
        _totalSupply = amount;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function lockedOf(address account) external view override returns (uint256) {
        return _locked[account];
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
}
