/*
 * ============================================================
 * sync-proposals.ts
 * ============================================================
 * Keeper script that triggers proposal synchronization across
 * all active registered parachains in GovMeshRegistry.
 *
 * This script is intended to be run on a cron schedule (e.g.
 * every 10 minutes via a cloud scheduler or GitHub Actions).
 * It calls registry.syncProposals() for each active parachain,
 * which dispatches an XCM query to the remote parachain and
 * stores the response in the Registry when it returns.
 *
 * In production this role would be handled by a decentralized
 * keeper network (e.g. Gelato or a custom bonded keeper set).
 * For the hackathon, this script acts as the centralized keeper.
 *
 * Requires the deployer address to have SYNCER_ROLE on Registry.
 * This is granted during 00_deploy_registry.ts.
 *
 * Usage:
 *   npm hardhat run scripts/tasks/sync-proposals.ts --network polkadot-hub-testnet
 *
 * Cron (every 10 min):
 *   */10 * * * * cd /path/to/govmesh && npm hardhat run scripts/tasks/sync-proposals.ts --network polkadot-hub-testnet
 * ============================================================
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS_DIR = path.join(__dirname, "../../deployments");

async function main() {
  const [keeper] = await ethers.getSigners();

  const deploymentsPath = path.join(DEPLOYMENTS_DIR, `${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No deployment file for network: ${network.name}`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const registry = await ethers.getContractAt("GovMeshRegistry", deployments.GovMeshRegistry);

  console.log("\n================================================");
  console.log("  GovMesh Keeper — Proposal Sync");
  console.log("================================================");
  console.log(`  Network  : ${network.name}`);
  console.log(`  Keeper   : ${keeper.address}`);
  console.log(`  Time     : ${new Date().toISOString()}`);
  console.log("================================================\n");

  const activeChains = await registry.getActiveParachains();
  console.log(`→ Found ${activeChains.length} active parachain(s)\n`);

  let synced = 0;
  let failed = 0;

  for (const chain of activeChains) {
    process.stdout.write(`→ Syncing [${chain.id}] ${chain.name}... `);

    try {
      const tx = await registry.syncProposals(chain.id);
      const receipt = await tx.wait();
      console.log(`✓ (queryId dispatched, tx: ${receipt?.hash.slice(0, 10)}...)`);
      synced++;
    } catch (e: any) {
      console.log(`FAILED: ${e.message.slice(0, 80)}`);
      failed++;
    }
  }

  console.log("\n------------------------------------------------");
  console.log(`  Synced : ${synced}`);
  console.log(`  Failed : ${failed}`);
  console.log(`  Total  : ${activeChains.length}`);
  console.log("------------------------------------------------\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
