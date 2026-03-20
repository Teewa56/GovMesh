/*
 * ============================================================
 * parachain-config.ts
 * ============================================================
 * Central configuration for all parachains GovMesh supports.
 *
 * Each entry contains:
 *   id              — Polkadot parachain ID (u32)
 *   name            — Human-readable name for UI display
 *   xcmLocation     — SCALE-encoded MultiLocation bytes for XCM dispatch
 *                     Format: { parents: 1, interior: X1(Parachain(id)) }
 *   govPalletEncoded — SCALE-encoded governance pallet identifier used
 *                      in the Transact XCM instruction call prefix
 *   testnet         — Corresponding testnet parachain ID on Paseo/Rococo
 *
 * XCM Location Encoding:
 *   0x01             — parents = 1 (go up to relay chain)
 *   0x01             — X1 junction (one junction)
 *   0x00             — Parachain junction variant
 *   [id as 4-byte LE] — parachain ID little-endian
 *
 * Adding a new parachain:
 *   1. Add an entry to SUPPORTED_PARACHAINS
 *   2. Confirm the governance pallet call prefix on that chain
 *   3. Run scripts/deploy/03_register_parachains.ts
 * ============================================================
 */

export interface ParachainConfig {
  id: number;
  name: string;
  xcmLocation: string;
  govPalletEncoded: string;
  testnetId: number;
  testnetName: string;
  rpcUrl: string;
  testnetRpcUrl: string;
}

function encodeParachainXcmLocation(parachainId: number): string {
  const idHex = parachainId.toString(16).padStart(8, "0");
  const leHex =
    idHex.slice(6, 8) +
    idHex.slice(4, 6) +
    idHex.slice(2, 4) +
    idHex.slice(0, 2);
  return `0x01010000${leHex}`;
}

export const SUPPORTED_PARACHAINS: ParachainConfig[] = [
  {
    id: 2004,
    name: "Moonbeam",
    xcmLocation: encodeParachainXcmLocation(2004),
    govPalletEncoded: "0x2400",
    testnetId: 1000,
    testnetName: "Moonbase Alpha",
    rpcUrl: "wss://wss.api.moonbeam.network",
    testnetRpcUrl: "wss://wss.api.moonbase.moonbeam.network",
  },
  {
    id: 2006,
    name: "Astar",
    xcmLocation: encodeParachainXcmLocation(2006),
    govPalletEncoded: "0x2400",
    testnetId: 1000,
    testnetName: "Shibuya",
    rpcUrl: "wss://rpc.astar.network",
    testnetRpcUrl: "wss://rpc.shibuya.astar.network",
  },
  {
    id: 2034,
    name: "Hydration",
    xcmLocation: encodeParachainXcmLocation(2034),
    govPalletEncoded: "0x2400",
    testnetId: 2034,
    testnetName: "Hydration Testnet",
    rpcUrl: "wss://rpc.hydradx.cloud",
    testnetRpcUrl: "wss://rpc.nice.hydration.cloud",
  },
];

export const PARACHAIN_BY_ID = Object.fromEntries(
  SUPPORTED_PARACHAINS.map((p) => [p.id, p])
);

export const TESTNET_PARACHAIN_BY_ID = Object.fromEntries(
  SUPPORTED_PARACHAINS.map((p) => [p.testnetId, p])
);

export function getParachainConfig(id: number): ParachainConfig {
  const config = PARACHAIN_BY_ID[id];
  if (!config) throw new Error(`Parachain ${id} not found in config`);
  return config;
}

export function isTestnet(networkName: string): boolean {
  return (
    networkName.includes("testnet") ||
    networkName.includes("paseo") ||
    networkName.includes("rococo") ||
    networkName === "localhost" ||
    networkName === "hardhat"
  );
}
