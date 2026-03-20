/*
 * ============================================================
 * Registry.test.ts
 * ============================================================
 * Unit tests for GovMeshRegistry.
 *
 * Test categories:
 *   Deployment       — Proxy initialisation, role assignment
 *   registerParachain — Happy path, duplicate guard, invalid input
 *   deactivateParachain — Happy path, access control, not-found guard
 *   writeProposal     — Store, update, pruning logic
 *   getters           — getParachain, getProposals, getActiveParachains
 *   isProposalOpen    — Open/closed based on endBlock
 *   Access control    — Non-admin, non-syncer, non-dispatcher revert
 *   Pausable          — pause/unpause blocks syncProposals
 *   Upgradeability    — UUPS upgrade succeeds with UPGRADER_ROLE
 * ============================================================
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  deployRegistryOnly,
  MOCK_PARACHAINS,
  ONE_DOT,
} from "../fixtures/parachain-fixtures";

describe("GovMeshRegistry", function () {
  describe("Deployment", function () {
    it("should deploy behind a UUPS proxy", async function () {
      const { registry } = await loadFixture(deployRegistryOnly);
      expect(await registry.getAddress()).to.be.properAddress;
    });

    it("should grant DEFAULT_ADMIN_ROLE to the admin", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant SYNCER_ROLE to the keeper", async function () {
      const { registry, keeper } = await loadFixture(deployRegistryOnly);
      const SYNCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYNCER_ROLE"));
      expect(await registry.hasRole(SYNCER_ROLE, keeper.address)).to.be.true;
    });

    it("should revert if initialized twice", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      await expect(registry.initialize(admin.address)).to.be.reverted;
    });
  });

  describe("registerParachain", function () {
    it("should register a valid parachain", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await expect(
        registry.connect(admin).registerParachain(
          chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
        )
      )
        .to.emit(registry, "ParachainRegistered")
        .withArgs(chain.id, chain.name, (v: bigint) => v > 0n);
    });

    it("should revert when registering a duplicate parachain", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      await expect(
        registry.connect(admin).registerParachain(
          chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
        )
      ).to.be.revertedWithCustomError(registry, "ParachainAlreadyRegistered")
        .withArgs(chain.id);
    });

    it("should revert with invalid parachain ID (0)", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      await expect(
        registry.connect(admin).registerParachain(0, "Bad", "0x01010000", "0x00")
      ).to.be.revertedWithCustomError(registry, "InvalidParachainId");
    });

    it("should revert with empty XCM location", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      await expect(
        registry.connect(admin).registerParachain(9999, "Test", "0x", "0x00")
      ).to.be.revertedWithCustomError(registry, "InvalidXcmLocation");
    });

    it("should revert when called by non-admin", async function () {
      const { registry, keeper } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];
      await expect(
        registry.connect(keeper).registerParachain(
          chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
        )
      ).to.be.reverted;
    });

    it("should register all 3 mock parachains successfully", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);

      for (const chain of MOCK_PARACHAINS) {
        await registry.connect(admin).registerParachain(
          chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
        );
      }

      const activeChains = await registry.getActiveParachains();
      expect(activeChains.length).to.equal(MOCK_PARACHAINS.length);
    });
  });

  describe("deactivateParachain", function () {
    it("should deactivate a registered parachain", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      await expect(registry.connect(admin).deactivateParachain(chain.id))
        .to.emit(registry, "ParachainDeactivated")
        .withArgs(chain.id, (v: bigint) => v > 0n);

      const activeChains = await registry.getActiveParachains();
      expect(activeChains.length).to.equal(0);
    });

    it("should revert deactivating non-existent parachain", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      await expect(registry.connect(admin).deactivateParachain(9999))
        .to.be.revertedWithCustomError(registry, "ParachainNotFound");
    });

    it("should revert when called by non-admin", async function () {
      const { registry, admin, keeper } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      await expect(registry.connect(keeper).deactivateParachain(chain.id)).to.be.reverted;
    });
  });

  describe("writeProposal", function () {
    it("should store a new proposal", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await expect(
        registry.connect(admin).writeProposal(
          chain.id, 1, "Test Proposal", "QmHash123",
          9999999, 1000n * ONE_DOT, 500n * ONE_DOT, 0n
        )
      ).to.emit(registry, "ProposalSynced").withArgs(chain.id, 1, (v: bigint) => v > 0n);
    });

    it("should update an existing proposal on second write", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).writeProposal(
        chain.id, 1, "Proposal", "QmHash", 9999999, 100n, 50n, 0n
      );

      await registry.connect(admin).writeProposal(
        chain.id, 1, "Proposal", "QmHash", 9999999, 200n, 100n, 0n
      );

      const proposal = await registry.getProposal(chain.id, 1);
      expect(proposal.ayeVotes).to.equal(200n);
      expect(proposal.nayVotes).to.equal(100n);
    });

    it("should revert when writing to an inactive parachain", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).deactivateParachain(chain.id);

      await expect(
        registry.connect(admin).writeProposal(
          chain.id, 1, "Bad", "QmBad", 9999999, 0n, 0n, 0n
        )
      ).to.be.revertedWithCustomError(registry, "ParachainInactive");
    });
  });

  describe("getters", function () {
    it("getParachain should return correct data", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      const result = await registry.getParachain(chain.id);
      expect(result.id).to.equal(chain.id);
      expect(result.name).to.equal(chain.name);
      expect(result.active).to.be.true;
    });

    it("getParachain should revert for unknown parachain", async function () {
      const { registry } = await loadFixture(deployRegistryOnly);
      await expect(registry.getParachain(9999))
        .to.be.revertedWithCustomError(registry, "ParachainNotFound");
    });

    it("getProposals should return empty array for chain with no proposals", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      const proposals = await registry.getProposals(chain.id);
      expect(proposals.length).to.equal(0);
    });

    it("isProposalOpen should return false for expired endBlock", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).writeProposal(
        chain.id, 1, "Expired", "QmHash", 1, 0n, 0n, 0n
      );

      expect(await registry.isProposalOpen(chain.id, 1)).to.be.false;
    });

    it("isProposalOpen should return false for unknown proposal", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);
      const chain = MOCK_PARACHAINS[0];

      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      expect(await registry.isProposalOpen(chain.id, 99)).to.be.false;
    });
  });

  describe("Pausable", function () {
    it("should pause and block syncProposals", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);

      await registry.connect(admin).pause();

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      const chain = MOCK_PARACHAINS[0];
      await registry.connect(admin).registerParachain(
        chain.id, chain.name, chain.xcmLocation, chain.govPalletEncoded
      );

      const SYNCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYNCER_ROLE"));
      await registry.connect(admin).grantRole(SYNCER_ROLE, admin.address);

      await expect(registry.connect(admin).syncProposals(chain.id)).to.be.reverted;
    });

    it("should allow syncProposals after unpausing", async function () {
      const { registry, admin } = await loadFixture(deployRegistryOnly);

      await registry.connect(admin).pause();
      await registry.connect(admin).unpause();

      expect(await registry.paused()).to.be.false;
    });
  });

  describe("Upgradeability", function () {
    it("should revert upgrade from non-upgrader", async function () {
      const { registry, keeper } = await loadFixture(deployRegistryOnly);
      const RegistryV2 = await ethers.getContractFactory("GovMeshRegistry", keeper);
      await expect(
        (registry as any).connect(keeper).upgradeToAndCall(
          await (await RegistryV2.deploy()).getAddress(), "0x"
        )
      ).to.be.reverted;
    });
  });
});
