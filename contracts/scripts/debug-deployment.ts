import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("Debugging deployment...");

  const [admin, keeper] = await ethers.getSigners();
  console.log("Admin address:", admin.address);
  console.log("Keeper address:", keeper.address);

  const MockXcmPrecompile = await ethers.getContractFactory("MockXcmPrecompile");
  const mockXcm = await MockXcmPrecompile.deploy();
  await mockXcm.waitForDeployment();
  console.log("MockXcm deployed at:", await mockXcm.getAddress());

  const MockNativeAssets = await ethers.getContractFactory("MockNativeAssets");
  const mockAssets = await MockNativeAssets.deploy();
  await mockAssets.waitForDeployment();
  console.log("MockAssets deployed at:", await mockAssets.getAddress());

  const RegistryFactory = await ethers.getContractFactory("GovMeshRegistry");
  const registry = await upgrades.deployProxy(
    RegistryFactory,
    [admin.address],
    { kind: "uups", initializer: "initialize" }
  );
  await registry.waitForDeployment();
  console.log("Registry deployed at:", await registry.getAddress());
  console.log("Registry target:", registry.target);

  const DispatcherFactory = await ethers.getContractFactory("XCMDispatcher");
  const dispatcher = await upgrades.deployProxy(
    DispatcherFactory,
    [admin.address, ethers.ZeroAddress, await registry.getAddress()],
    { kind: "uups", initializer: "initialize" }
  );
  await dispatcher.waitForDeployment();
  console.log("Dispatcher deployed at:", await dispatcher.getAddress());

  const VotingFactory = await ethers.getContractFactory("GovMeshVoting");
  const voting = await upgrades.deployProxy(
    VotingFactory,
    [admin.address, await registry.getAddress(), await dispatcher.getAddress()],
    { kind: "uups", initializer: "initialize" }
  );
  await voting.waitForDeployment();
  console.log("Voting deployed at:", await voting.getAddress());

  // Set up relationships
  await registry.connect(admin).setDispatcher(await dispatcher.getAddress());
  await dispatcher.connect(admin).setVoting(await voting.getAddress());
  await dispatcher.connect(admin).setXcmPrecompile(await mockXcm.getAddress());
  await voting.connect(admin).setNativeAssets(await mockAssets.getAddress());

  const SYNCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYNCER_ROLE"));
  await registry.connect(admin).grantRole(SYNCER_ROLE, keeper.address);

  // Register a parachain
  await registry.connect(admin).registerParachain(
    2004,
    "Moonbeam",
    "0x01010000d4070000",
    "0x2400"
  );

  console.log("Setup complete. Testing syncProposals...");

  try {
    await registry.connect(keeper).syncProposals(2004);
    console.log("syncProposals succeeded!");
  } catch (error) {
    console.error("syncProposals failed:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});