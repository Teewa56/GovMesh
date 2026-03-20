/*
 * ============================================================
 * 01_deploy_dispatcher.ts
 * ============================================================
 * Deploys the XCMDispatcher contract behind a UUPS proxy.
 *
 * Requires GovMeshRegistry to be deployed first.
 * Reads the Registry address from deployments/<network>.json.
 *
 * Steps:
 *   1. Load Registry proxy address from deployment file
 *   2. Deploy XCMDispatcher implementation + UUPS proxy
 *   3. Call initialize() with Registry address
 *      (Voting address is set in step 02 after Voting is deployed)
 *   4. Write Dispatcher address to deployment file
 *   5. Call Registry.setDispatcher() so Registry can route
 *      query responses through Dispatcher
 *
 * Note:
 *   The XCM precompile address (0x0800) is hardcoded in the
 *   XCMDispatcher contract. It does not need to be passed here.
 *   Confirm the precompile address against Polkadot Hub docs
 *   before mainnet deployment.
 *
 * Usage:
 *   npm hardhat run scripts/deploy/01_deploy_dispatcher.ts --network polkadot-hub-testnet
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
    throw new Error(`No deployment file found for network: ${network.name}. Run 00_deploy_registry.ts first.`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  if (!deployments.GovMeshRegistry) {
    throw new Error("GovMeshRegistry not found in deployment file. Run 00_deploy_registry.ts first.");
  }

  console.log("\n================================================");
  console.log("  GovMesh — Deploying XCMDispatcher");
  console.log("================================================");
  console.log(`  Network  : ${network.name}`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Registry : ${deployments.GovMeshRegistry}`);
  console.log("================================================\n");

  console.log("→ Deploying XCMDispatcher implementation + proxy...");

  const DispatcherFactory = await ethers.getContractFactory("XCMDispatcher");

  const PLACEHOLDER_VOTING = ethers.ZeroAddress;

  const dispatcher = await upgrades.deployProxy(
    DispatcherFactory,
    [deployer.address, PLACEHOLDER_VOTING, deployments.GovMeshRegistry],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await dispatcher.waitForDeployment();

  const proxyAddress = await dispatcher.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`✓ XCMDispatcher proxy deployed        : ${proxyAddress}`);
  console.log(`✓ XCMDispatcher implementation        : ${implAddress}`);

  console.log("\n→ Wiring Dispatcher into Registry...");
  const registry = await ethers.getContractAt("GovMeshRegistry", deployments.GovMeshRegistry);
  const tx = await registry.setDispatcher(proxyAddress);
  await tx.wait();
  console.log("✓ Registry.setDispatcher() called");

  deployments.XCMDispatcher = proxyAddress;
  deployments.XCMDispatcherImpl = implAddress;
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
  console.log("  XCMDispatcher deployment complete");
  console.log("  Run 02_deploy_voting.ts next");
  console.log("================================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
