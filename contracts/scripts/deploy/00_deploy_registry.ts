/*
 * ============================================================
 * 00_deploy_registry.ts
 * ============================================================
 * Deploys the GovMeshRegistry contract behind a UUPS proxy.
 *
 * Deployment order matters:
 *   Registry must be deployed first because Voting and Dispatcher
 *   both take the Registry address as a constructor argument.
 *
 * Steps:
 *   1. Deploy the GovMeshRegistry implementation contract
 *   2. Deploy an ERC1967 UUPS proxy pointing to the implementation
 *   3. Call initialize() on the proxy with the deployer as admin
 *   4. Grant SYNCER_ROLE to the deployer address for testnet (keeper
 *      address should replace this in production)
 *   5. Write deployed addresses to deployments/<network>.json for
 *      use by subsequent deployment scripts
 *
 * Verification:
 *   Contract is submitted to Blockscout after deployment.
 *   Set BLOCKSCOUT_API_KEY and BLOCKSCOUT_URL in .env.
 *
 * Usage:
 *   npm hardhat run scripts/deploy/00_deploy_registry.ts --network polkadot-hub-testnet
 * ============================================================
 */

import { ethers, upgrades, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS_DIR = path.join(__dirname, "../../deployments");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n================================================");
  console.log("  GovMesh — Deploying GovMeshRegistry");
  console.log("================================================");
  console.log(`  Network  : ${network.name}`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} DOT`);
  console.log("================================================\n");

  console.log("→ Deploying GovMeshRegistry implementation + proxy...");

  const RegistryFactory = await ethers.getContractFactory("GovMeshRegistry");

  const registry = await upgrades.deployProxy(
    RegistryFactory,
    [deployer.address],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await registry.waitForDeployment();

  const proxyAddress = await registry.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`✓ GovMeshRegistry proxy deployed     : ${proxyAddress}`);
  console.log(`✓ GovMeshRegistry implementation     : ${implAddress}`);

  const SYNCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYNCER_ROLE"));
  await registry.grantRole(SYNCER_ROLE, deployer.address);
  console.log(`✓ SYNCER_ROLE granted to deployer    : ${deployer.address}`);

  const deploymentData: Record<string, string> = {};
  const deploymentsPath = path.join(DEPLOYMENTS_DIR, `${network.name}.json`);

  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  if (fs.existsSync(deploymentsPath)) {
    Object.assign(deploymentData, JSON.parse(fs.readFileSync(deploymentsPath, "utf8")));
  }

  deploymentData.GovMeshRegistry = proxyAddress;
  deploymentData.GovMeshRegistryImpl = implAddress;
  deploymentData.deployer = deployer.address;
  deploymentData.network = network.name;
  deploymentData.deployedAt = new Date().toISOString();

  fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentData, null, 2));
  console.log(`✓ Deployment saved to deployments/${network.name}.json`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n→ Waiting 5 blocks before verification...");
    await new Promise((r) => setTimeout(r, 30_000));

    try {
      await run("verify:verify", {
        address: implAddress,
        constructorArguments: [],
      });
      console.log("✓ Contract verified on Blockscout");
    } catch (e: any) {
      console.warn(`⚠ Verification failed: ${e.message}`);
    }
  }

  console.log("\n================================================");
  console.log("  GovMeshRegistry deployment complete");
  console.log("  Run 01_deploy_voting.ts next");
  console.log("================================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
