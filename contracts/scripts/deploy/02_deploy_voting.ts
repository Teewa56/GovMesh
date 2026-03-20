/*
 * ============================================================
 * 02_deploy_voting.ts
 * ============================================================
 * Deploys the GovMeshVoting contract behind a UUPS proxy.
 *
 * Requires GovMeshRegistry and XCMDispatcher to be deployed.
 * Reads addresses from deployments/<network>.json.
 *
 * Steps:
 *   1. Load Registry and Dispatcher proxy addresses
 *   2. Deploy GovMeshVoting implementation + UUPS proxy
 *   3. Call initialize() with Registry + Dispatcher addresses
 *   4. Call Dispatcher.setVoting() to wire the Voting contract
 *      so Dispatcher can call confirmDelivery and markFailed
 *   5. Grant CONFIRMER_ROLE on Voting to Dispatcher address
 *   6. Write Voting address to deployment file
 *
 * After this script completes, all three core contracts are
 * deployed and wired together. Run 03_register_parachains.ts
 * to populate the Registry with initial parachain data.
 *
 * Usage:
 *   pnpm hardhat run scripts/deploy/02_deploy_voting.ts --network polkadot-hub-testnet
 * ============================================================
 */

import { ethers, upgrades, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS_DIR = path.join(__dirname, "../../deployments");

async function main() {
  const [deployer] = await ethers.getSigners();

  const deploymentsPath = path.join(DEPLOYMENTS_DIR, `${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("Deployment file not found. Run 00 and 01 first.");
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  if (!deployments.GovMeshRegistry || !deployments.XCMDispatcher) {
    throw new Error("Registry or Dispatcher not found. Run 00 and 01 scripts first.");
  }

  console.log("\n================================================");
  console.log("  GovMesh — Deploying GovMeshVoting");
  console.log("================================================");
  console.log(`  Network    : ${network.name}`);
  console.log(`  Deployer   : ${deployer.address}`);
  console.log(`  Registry   : ${deployments.GovMeshRegistry}`);
  console.log(`  Dispatcher : ${deployments.XCMDispatcher}`);
  console.log("================================================\n");

  console.log("→ Deploying GovMeshVoting implementation + proxy...");

  const VotingFactory = await ethers.getContractFactory("GovMeshVoting");

  const voting = await upgrades.deployProxy(
    VotingFactory,
    [deployer.address, deployments.GovMeshRegistry, deployments.XCMDispatcher],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await voting.waitForDeployment();

  const proxyAddress = await voting.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`✓ GovMeshVoting proxy deployed        : ${proxyAddress}`);
  console.log(`✓ GovMeshVoting implementation        : ${implAddress}`);

  console.log("\n→ Wiring Voting into Dispatcher...");
  const dispatcher = await ethers.getContractAt("XCMDispatcher", deployments.XCMDispatcher);
  const tx = await dispatcher.setVoting(proxyAddress);
  await tx.wait();
  console.log("✓ Dispatcher.setVoting() called");

  const VOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));
  const hasRole = await dispatcher.hasRole(VOTER_ROLE, proxyAddress);
  if (!hasRole) {
    await dispatcher.grantRole(VOTER_ROLE, proxyAddress);
    console.log("✓ VOTER_ROLE granted to Voting on Dispatcher");
  } else {
    console.log("✓ VOTER_ROLE already set on Dispatcher");
  }

  deployments.GovMeshVoting = proxyAddress;
  deployments.GovMeshVotingImpl = implAddress;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`✓ Deployment saved to deployments/${network.name}.json`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    await new Promise((r) => setTimeout(r, 30_000));
    try {
      await run("verify:verify", { address: implAddress, constructorArguments: [] });
      console.log("✓ Contract verified on Blockscout");
    } catch (e: any) {
      console.warn(`⚠ Verification failed: ${e.message}`);
    }
  }

  console.log("\n================================================");
  console.log("  GovMeshVoting deployment complete");
  console.log("  All 3 contracts deployed and wired.");
  console.log("  Run 03_register_parachains.ts next");
  console.log("================================================\n");

  console.log("Contract Summary:");
  console.log(`  GovMeshRegistry : ${deployments.GovMeshRegistry}`);
  console.log(`  XCMDispatcher   : ${deployments.XCMDispatcher}`);
  console.log(`  GovMeshVoting   : ${proxyAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
