/*
 * ============================================================
 * parachain-fixtures.ts
 * ============================================================
 * Shared test fixtures for parachain and proposal data.
 * Used across unit and integration test files.
 *
 * deployGovMeshSystem — Deploys the full system (all 3 core contracts
 *   + all 3 mocks) wired together, ready for testing. This is the
 *   primary fixture used in integration tests.
 *
 * deployRegistryOnly  — Deploys only Registry + Mocks. Used in
 *   unit tests that don't need the full system.
 *
 * MOCK_PARACHAINS     — Pre-built parachain config objects for tests.
 * MOCK_PROPOSALS      — Pre-built proposal data for tests.
 * DOT_BALANCE         — Standard test DOT balance (100 DOT in Planck).
 * ============================================================
 */

import { ethers, upgrades } from "hardhat";

export const DOT_PLANCK_DECIMALS = 10n;
export const ONE_DOT = 10n ** DOT_PLANCK_DECIMALS;
export const DOT_BALANCE = 100n * ONE_DOT;
export const MIN_DOT_BALANCE = 0n;

export const MOCK_PARACHAINS = [
  {
    id: 2004,
    name: "Moonbeam",
    xcmLocation: "0x01010000d4070000",
    govPalletEncoded: "0x2400",
  },
  {
    id: 2006,
    name: "Astar",
    xcmLocation: "0x01010000d6070000",
    govPalletEncoded: "0x2400",
  },
  {
    id: 2034,
    name: "Hydration",
    xcmLocation: "0x01010000f27d0000",
    govPalletEncoded: "0x2400",
  },
];

export const MOCK_PROPOSALS = [
  {
    index: 1,
    parachainId: 2004,
    title: "Moonbeam Treasury Proposal #1",
    metadataIpfsHash: "QmTreasury1Hash",
    endBlock: 9999999,
    ayeVotes: 1000n * ONE_DOT,
    nayVotes: 500n * ONE_DOT,
    abstainVotes: 100n * ONE_DOT,
  },
  {
    index: 2,
    parachainId: 2004,
    title: "Moonbeam Parameter Change #2",
    metadataIpfsHash: "QmParam2Hash",
    endBlock: 9999999,
    ayeVotes: 200n * ONE_DOT,
    nayVotes: 800n * ONE_DOT,
    abstainVotes: 50n * ONE_DOT,
  },
  {
    index: 1,
    parachainId: 2006,
    title: "Astar Runtime Upgrade",
    metadataIpfsHash: "QmRuntime1Hash",
    endBlock: 9999999,
    ayeVotes: 5000n * ONE_DOT,
    nayVotes: 100n * ONE_DOT,
    abstainVotes: 0n,
  },
];

export async function deployGovMeshSystem() {
  const [admin, keeper, voter1, voter2, voter3] = await ethers.getSigners();

  const MockXcmPrecompile = await ethers.getContractFactory("MockXcmPrecompile");
  const mockXcm = await MockXcmPrecompile.deploy();

  const MockNativeAssets = await ethers.getContractFactory("MockNativeAssets");
  const mockAssets = await MockNativeAssets.deploy();

  const MockGovernancePallet = await ethers.getContractFactory("MockGovernancePallet");
  const mockPallet = await MockGovernancePallet.deploy();

  const RegistryFactory = await ethers.getContractFactory("GovMeshRegistry");
  const registry = await upgrades.deployProxy(
    RegistryFactory,
    [admin.address],
    { kind: "uups", initializer: "initialize" }
  );
  await registry.waitForDeployment();

  const DispatcherFactory = await ethers.getContractFactory("XCMDispatcher");
  const dispatcher = await upgrades.deployProxy(
    DispatcherFactory,
    [admin.address, ethers.ZeroAddress, await registry.getAddress()],
    { kind: "uups", initializer: "initialize" }
  );
  await dispatcher.waitForDeployment();

  const VotingFactory = await ethers.getContractFactory("GovMeshVoting");
  const voting = await upgrades.deployProxy(
    VotingFactory,
    [admin.address, await registry.getAddress(), await dispatcher.getAddress()],
    { kind: "uups", initializer: "initialize" }
  );
  await voting.waitForDeployment();

  await registry.connect(admin).setDispatcher(await dispatcher.getAddress());
  await dispatcher.connect(admin).setVoting(await voting.getAddress());

  const SYNCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYNCER_ROLE"));
  await registry.connect(admin).grantRole(SYNCER_ROLE, keeper.address);

  await mockAssets.setBalance(voter1.address, DOT_BALANCE);
  await mockAssets.setBalance(voter2.address, DOT_BALANCE * 10n);
  await mockAssets.setBalance(voter3.address, ONE_DOT);

  return {
    registry,
    dispatcher,
    voting,
    mockXcm,
    mockAssets,
    mockPallet,
    admin,
    keeper,
    voter1,
    voter2,
    voter3,
  };
}

export async function deployRegistryOnly() {
  const [admin, keeper] = await ethers.getSigners();

  const MockXcmPrecompile = await ethers.getContractFactory("MockXcmPrecompile");
  const mockXcm = await MockXcmPrecompile.deploy();

  const RegistryFactory = await ethers.getContractFactory("GovMeshRegistry");
  const registry = await upgrades.deployProxy(
    RegistryFactory,
    [admin.address],
    { kind: "uups", initializer: "initialize" }
  );
  await registry.waitForDeployment();

  const SYNCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYNCER_ROLE"));
  await registry.connect(admin).grantRole(SYNCER_ROLE, keeper.address);

  return { registry, mockXcm, admin, keeper };
}

export async function registerMockParachains(registry: any, admin: any) {
  for (const chain of MOCK_PARACHAINS) {
    await registry.connect(admin).registerParachain(
      chain.id,
      chain.name,
      chain.xcmLocation,
      chain.govPalletEncoded
    );
  }
}

export async function writeMockProposals(registry: any, dispatcher: any, admin: any) {
  for (const proposal of MOCK_PROPOSALS) {
    const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
    await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

    await registry.connect(admin).writeProposal(
      proposal.parachainId,
      proposal.index,
      proposal.title,
      proposal.metadataIpfsHash,
      proposal.endBlock,
      proposal.ayeVotes,
      proposal.nayVotes,
      proposal.abstainVotes
    );
  }
}
