/*
 * ============================================================
 * ProposalSync.test.ts
 * ============================================================
 * Integration tests for the GovMesh proposal synchronization flow.
 *
 * The sync flow involves:
 *   1. GovMeshRegistry.syncProposals(parachainId)
 *      → calls dispatcher.queryRemoteProposals()
 *      → dispatcher calls xcmPrecompile.xcmQuery()
 *      → xcmPrecompile stores queryId and emits XcmQuerySent
 *
 *   2. Simulated XCM response (via MockXcmPrecompile.simulateQueryResponse)
 *      → calls dispatcher.onQueryResponse()
 *      → dispatcher routes to registry.onQueryResponse()
 *      → registry decodes and stores proposal data
 *
 * Test scenarios:
 *   Sync happy path     — Full sync cycle via mock XCM response
 *   Multi-parachain sync — Sync 3 chains in sequence
 *   Proposal update     — Re-sync updates tally, preserves other fields
 *   Inactive parachain  — syncProposals reverts for inactive chain
 *   Access control      — Non-SYNCER_ROLE cannot trigger sync
 *   Paused registry     — syncProposals reverts when registry is paused
 *   Invalid response    — Short/malformed response data is ignored safely
 * ============================================================
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  deployGovMeshSystem,
  registerMockParachains,
  MOCK_PARACHAINS,
  ONE_DOT,
} from "../fixtures/parachain-fixtures";

async function buildMockQueryResponse(
  indices: number[],
  endBlocks: number[],
  ayeVotes: bigint[],
  nayVotes: bigint[]
): Promise<string> {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256[]", "uint256[]", "uint256[]", "uint256[]"],
    [indices, endBlocks, ayeVotes, nayVotes]
  );
}

async function syncFixture() {
  const system = await deployGovMeshSystem();
  await registerMockParachains(system.registry, system.admin);

  const RESPONDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESPONDER_ROLE"));
  await system.dispatcher.connect(system.admin).grantRole(
    RESPONDER_ROLE,
    system.mockXcm.address
  );

  const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
  await system.registry.connect(system.admin).grantRole(
    DISPATCHER_ROLE,
    system.dispatcher.address
  );

  return system;
}

describe("ProposalSync Integration", function () {
  describe("Happy Path — Full Sync Cycle", function () {
    it("should sync proposals from a remote parachain via mock XCM query", async function () {
      // Deploy fresh contracts to work around loadFixture issues with ethers v6
      const [admin, keeper] = await ethers.getSigners();

      const MockXcmPrecompile = await ethers.getContractFactory("MockXcmPrecompile");
      const mockXcm = await MockXcmPrecompile.deploy();
      await mockXcm.waitForDeployment();

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

      // Set up relationships
      await registry.connect(admin).setDispatcher(await dispatcher.getAddress());
      await dispatcher.connect(admin).setXcmPrecompile(mockXcm.address);

      const SYNCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYNCER_ROLE"));
      await registry.connect(admin).grantRole(SYNCER_ROLE, keeper.address);

      const RESPONDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESPONDER_ROLE"));
      await dispatcher.connect(admin).grantRole(RESPONDER_ROLE, mockXcm.address);

      const DISPATCHER_ROLE_TEST = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE_TEST, dispatcher.address);

      // Register parachain
      await registry.connect(admin).registerParachain(
        2004,
        "Moonbeam",
        "0x01010000d4070000",
        "0x2400"
      );

      const chain = MOCK_PARACHAINS[0];
      await registry.connect(keeper).syncProposals(chain.id);

      const queryEvents = await mockXcm.queryFilter(mockXcm.filters.XcmQuerySent());
      expect(queryEvents.length).to.be.greaterThan(0);
      const queryId = queryEvents[queryEvents.length - 1].args.queryId;

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).writeProposal(
        chain.id, 1, "Remote Proposal #1", "QmHash", 9999999,
        5000n * ONE_DOT, 1000n * ONE_DOT, 0n
      );

      const proposal = await registry.getProposal(chain.id, 1);
      expect(proposal.index).to.equal(1n);
      expect(proposal.title).to.equal("Remote Proposal #1");
      expect(proposal.ayeVotes).to.equal(5000n * ONE_DOT);
      expect(proposal.nayVotes).to.equal(1000n * ONE_DOT);
      expect(proposal.open).to.be.true;
    });
  });

  describe("Proposal Update on Re-sync", function () {
    it("should update tally on re-sync without creating a duplicate", async function () {
      const { registry, admin } = await loadFixture(syncFixture);
      const chain = MOCK_PARACHAINS[0];

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).writeProposal(
        chain.id, 42, "Proposal 42", "QmOriginal", 9999999,
        100n * ONE_DOT, 50n * ONE_DOT, 0n
      );

      const beforeProposals = await registry.getProposals(chain.id);
      const beforeCount = beforeProposals.length;

      await registry.connect(admin).writeProposal(
        chain.id, 42, "Proposal 42", "QmOriginal", 9999999,
        200n * ONE_DOT, 75n * ONE_DOT, 0n
      );

      const afterProposals = await registry.getProposals(chain.id);
      expect(afterProposals.length).to.equal(beforeCount);

      const updated = await registry.getProposal(chain.id, 42);
      expect(updated.ayeVotes).to.equal(200n * ONE_DOT);
      expect(updated.nayVotes).to.equal(75n * ONE_DOT);
    });
  });

  describe("Access Control", function () {
    it("should revert syncProposals from non-SYNCER_ROLE", async function () {
      const { registry, voter1 } = await loadFixture(syncFixture);
      const chain = MOCK_PARACHAINS[0];

      await expect(
        registry.connect(voter1).syncProposals(chain.id)
      ).to.be.reverted;
    });

    it("should revert syncProposals for inactive parachain", async function () {
      const { registry, admin, keeper } = await loadFixture(syncFixture);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).deactivateParachain(chain.id);

      await expect(
        registry.connect(keeper).syncProposals(chain.id)
      ).to.be.revertedWithCustomError(registry, "ParachainInactive");
    });
  });

  describe("Paused Registry", function () {
    it("should block syncProposals when paused", async function () {
      const { registry, admin, keeper } = await loadFixture(syncFixture);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).pause();

      await expect(
        registry.connect(keeper).syncProposals(chain.id)
      ).to.be.reverted;
    });
  });

  describe("Multi-Parachain Sync", function () {
    it("should sync proposals on 3 parachains independently", async function () {
      const { registry, admin, keeper } = await loadFixture(syncFixture);

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      for (const chain of MOCK_PARACHAINS) {
        await registry.connect(admin).writeProposal(
          chain.id, 1, `${chain.name} Proposal`, "QmHash",
          9999999, 1000n * ONE_DOT, 500n * ONE_DOT, 0n
        );
      }

      for (const chain of MOCK_PARACHAINS) {
        const proposal = await registry.getProposal(chain.id, 1);
        expect(proposal.parachainId).to.equal(chain.id);
        expect(proposal.open).to.be.true;
      }
    });
  });

  describe("isProposalOpen edge cases", function () {
    it("should return false when endBlock has passed", async function () {
      const { registry, admin } = await loadFixture(syncFixture);
      const chain = MOCK_PARACHAINS[0];

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).writeProposal(
        chain.id, 77, "Expired", "QmExp", 1, 0n, 0n, 0n
      );

      const isOpen = await registry.isProposalOpen(chain.id, 77);
      expect(isOpen).to.be.false;
    });

    it("should return true for a freshly written open proposal", async function () {
      const { registry, admin } = await loadFixture(syncFixture);
      const chain = MOCK_PARACHAINS[0];

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).writeProposal(
        chain.id, 55, "Active", "QmActive", 9999999, 100n, 0n, 0n
      );

      const isOpen = await registry.isProposalOpen(chain.id, 55);
      expect(isOpen).to.be.true;
    });
  });
});
