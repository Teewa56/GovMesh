// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * ConvictionMath
 * ============================================================
 * Pure math library for OpenGov-compatible conviction vote weight
 * calculation. Used exclusively by GovMeshVoting.
 *
 * Polkadot's OpenGov conviction model works as follows:
 *   Conviction 0 → 0.1x weight, no token lock
 *   Conviction 1 → 1x weight,   locked for 1 enactment period
 *   Conviction 2 → 2x weight,   locked for 2 enactment periods
 *   Conviction 3 → 3x weight,   locked for 4 enactment periods
 *   Conviction 4 → 4x weight,   locked for 8 enactment periods
 *   Conviction 5 → 5x weight,   locked for 16 enactment periods
 *   Conviction 6 → 6x weight,   locked for 32 enactment periods
 *
 * GovMesh records and dispatches conviction level to the target
 * parachain. The actual token locking happens on the remote chain
 * inside the governance pallet — not in GovMesh contracts.
 * GovMesh only computes the weight for local tally aggregation.
 *
 * Precision:
 *   Conviction 0 uses integer division: balance / 10.
 *   Convictions 1-6 use multiplication: balance * conviction.
 *   Overflow is impossible for realistic DOT supplies because
 *   the max supply is ~1.27B DOT (1.27 × 10^19 Planck) which
 *   fits within uint256 even at 6x multiplier.
 *
 * computeWeight    — Returns the final voting weight in Planck.
 * multiplierOf     — Returns numerator and denominator for a given
 *                    conviction level (useful for frontend display).
 * isValidConviction — Returns true if conviction is in 0–6 range.
 * ============================================================
 */

library ConvictionMath {
    uint8 public constant MAX_CONVICTION = 6;
    uint256 public constant CONVICTION_ZERO_DENOMINATOR = 10;

    function computeWeight(
        uint256 dotBalance,
        uint8 conviction
    ) internal pure returns (uint256 weight) {
        if (conviction == 0) {
            return dotBalance / CONVICTION_ZERO_DENOMINATOR;
        }
        return dotBalance * uint256(conviction);
    }

    function multiplierOf(
        uint8 conviction
    ) internal pure returns (uint256 numerator, uint256 denominator) {
        if (conviction == 0) {
            return (1, 10);
        }
        return (uint256(conviction), 1);
    }

    function isValidConviction(uint8 conviction) internal pure returns (bool) {
        return conviction <= MAX_CONVICTION;
    }

    function lockPeriods(uint8 conviction) internal pure returns (uint256 periods) {
        if (conviction == 0) return 0;
        if (conviction == 1) return 1;
        if (conviction == 2) return 2;
        if (conviction == 3) return 4;
        if (conviction == 4) return 8;
        if (conviction == 5) return 16;
        return 32;
    }
}
