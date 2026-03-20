/*
 * ============================================================
 * 03_register_parachains.ts
 * ============================================================
 * Registers the initial set of supported parachains into the
 * GovMeshRegistry contract after all three core contracts are
 * deployed and wired.
 *
 * Reads the list of parachains from scripts/utils/parachain-config.ts.
 * On testnet, uses testnet parachain IDs and XCM locations.
 * On mainnet, uses production parachain IDs.
 *
 * Steps:
 *   1. Load Registry address from deployments/<network>.json
 *   2. Determine if running on testnet or mainnet
 *   3. For each parachain in SUPPORTED_PARACHAINS:
 *      a. Check if already registered (skip if so)
 *      b. Validate XCM location format
 *      c. Call registry.registerParachain()
 *      d. Confirm registration via getParachain()
 *   4. Print summary of all registered parachains
 *
 * This script is idempotent — running it twice will not
 * re-register already registered parachains.
 *
 * Usage:
 *   pnpm hardhat run scripts/deploy/03_register_parachains.ts --network polkadot-hub-testnet
 * ============================================================
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { SUPPORTED_PARACHAINS, isTestnet } from "../utils/parachain-config";
import { validateXcmLocation } from "../utils/xcm-builder";

const DEPLOYMENTS_DIR = path.join(__dirname, "../../deployments");

async function main() {
  const [deployer] = await ethers.getSigners();

  const deploymentsPath = path.join(DEPLOYMENTS_DIR, `${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("Deployment file not found. Run deploy scripts 00–02 first.");
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  if (!deployments.GovMeshRegistry) {
    throw new Error("GovMeshRegistry not found in deployment file.");
  }

  const onTestnet = isTestnet(network.name);

  console.log("\n================================================");
  console.log("  GovMesh — Registering Parachains");
  console.log("================================================");
  console.log(`  Network    : ${network.name} (${onTestnet ? "testnet" : "mainnet"})`);
  console.log(`  Deployer   : ${deployer.address}`);
  console.log(`  Registry   : ${deployments.GovMeshRegistry}`);
  console.log(`  Parachains : ${SUPPORTED_PARACHAINS.length}`);
  console.log("================================================\n");

  const registry = await ethers.getContractAt("GovMeshRegistry", deployments.GovMeshRegistry);

  let registered = 0;
  let skipped = 0;
  let failed = 0;

  for (const parachain of SUPPORTED_PARACHAINS) {
    const id = onTestnet ? parachain.testnetId : parachain.id;
    const name = onTestnet ? parachain.testnetName : parachain.name;

    process.stdout.write(`→ Registering ${name} (id: ${id})... `);

    try {
      const existing = await registry.getParachain(id).catch(() => null);
      if (existing && existing.active) {
        console.log("skipped (already registered)");
        skipped++;
        continue;
      }

      if (!validateXcmLocation(parachain.xcmLocation)) {
        console.log("FAILED (invalid XCM location)");
        failed++;
        continue;
      }

      const tx = await registry.registerParachain(
        id,
        name,
        parachain.xcmLocation,
        parachain.govPalletEncoded
      );

      const receipt = await tx.wait();

      const event = receipt?.logs
        .map((log: any) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e: any) => e?.name === "ParachainRegistered");

      if (event) {
        console.log(`✓ (tx: ${receipt?.hash.slice(0, 10)}...)`);
        registered++;
      } else {
        console.log("⚠ (no event emitted)");
        failed++;
      }
    } catch (e: any) {
      console.log(`FAILED: ${e.message.slice(0, 60)}`);
      failed++;
    }
  }

  console.log("\n------------------------------------------------");
  console.log(`  Registered : ${registered}`);
  console.log(`  Skipped    : ${skipped}`);
  console.log(`  Failed     : ${failed}`);
  console.log("------------------------------------------------");

  console.log("\n→ Verifying registered parachains...");
  const activeChains = await registry.getActiveParachains();
  console.log(`  Active parachains in registry: ${activeChains.length}`);
  for (const chain of activeChains) {
    console.log(`    [${chain.id}] ${chain.name}`);
  }

  console.log("\n================================================");
  console.log("  GovMesh deployment fully complete.");
  console.log("  System is ready for proposal sync and voting.");
  console.log("================================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
