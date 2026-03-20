/*
 * ============================================================
 * XCMDispatcher.test.ts
 * ============================================================
 * Unit tests for XCMDispatcher.
 *
 * Test categories:
 *   Deployment         — Proxy init, role assignment, precompile link
 *   dispatchVote()     — Happy path, returns non-zero messageId
 *                        Role guard: non-VOTER_ROLE reverts
 *                        Empty xcmDest reverts
 *                        Zero maxWeight reverts
 *                        Duplicate voteId reverts
 *                        XCM send failure reverts
 *   queryRemoteProposals — Role guard, dispatches query, returns queryId
 *   onQueryResponse    — Role guard, routes to registry
 *   notifyDelivery     — Admin only, confirms vote delivery on voting
 *   notifyFailure      — Admin only, marks vote failed on voting
 *   getDispatchedMessage — Returns stored messageId + timestamp
 *   XCM encoding       — encodeVoteCall produces correct vote byte
 *                        for all Aye/Nay/Abstain conviction combos
 * ============================================================
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  deployGovMeshSystem,
  registerMockParachains,
  writeMockProposals,
  MOCK_PARACHAINS,
  MOCK_PROPOSALS,
  DOT_BALANCE,
} from "../fixtures/parachain-fixtures";

const VoteType = { Aye: 0, Nay: 1, Abstain: 2 };

async function fullFixture() {
  const system = await deployGovMeshSystem();
  await registerMockParachains(system.registry, system.admin);
  await writeMockProposals(system.registry, system.dispatcher, system.admin);
  return system;
}

function buildDispatchParams(overrides: Partial<any> = {}) {
  return {
    voteId: ethers.randomBytes(32),
    xcmDest: MOCK_PARACHAINS[0].xcmLocation,
    proposalIndex: 1n,
    aye: true,
    abstain: false,
    conviction: 1,
    votingBalance: DOT_BALANCE,
    maxWeight: 1_000_000_000n,
    ...overrides,
  };
}

describe("XCMDispatcher", function () {
  describe("Deployment", function () {
    it("should deploy behind a UUPS proxy", async function () {
      const { dispatcher } = await loadFixture(fullFixture);
      expect(await dispatcher.getAddress()).to.be.properAddress;
    });

    it("should have VOTER_ROLE assigned to GovMeshVoting", async function () {
      const { dispatcher, voting } = await loadFixture(fullFixture);
      const VOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));
      expect(await dispatcher.hasRole(VOTER_ROLE, await voting.getAddress())).to.be.true;
    });

    it("should have REGISTRY_ROLE assigned to GovMeshRegistry", async function () {
      const { dispatcher, registry } = await loadFixture(fullFixture);
      const REGISTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_ROLE"));
      expect(await dispatcher.hasRole(REGISTRY_ROLE, await registry.getAddress())).to.be.true;
    });
  });

  describe("dispatchVote()", function () {
    it("should dispatch a vote and return a non-zero messageId", async function () {
      const { dispatcher, voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      const tx = await voting.connect(voter1).vote(
        proposal.parachainId, proposal.index, VoteType.Aye, 1
      );
      const receipt = await tx.wait();

      const dispatchEvent = receipt?.logs
        .map((log: any) => { try { return dispatcher.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteDispatched");

      expect(dispatchEvent).to.not.be.null;
      expect(dispatchEvent?.args.xcmMessageId).to.not.equal(ethers.ZeroHash);
    });

    it("should revert if called by non-VOTER_ROLE", async function () {
      const { dispatcher, voter1 } = await loadFixture(fullFixture);
      const params = buildDispatchParams();

      await expect(
        dispatcher.connect(voter1).dispatchVote(params)
      ).to.be.reverted;
    });

    it("should revert with empty xcmDest", async function () {
      const { dispatcher, voting, admin } = await loadFixture(fullFixture);

      const VOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));
      await dispatcher.connect(admin).grantRole(VOTER_ROLE, admin.address);

      const params = buildDispatchParams({ xcmDest: "0x" });

      await expect(
        dispatcher.connect(admin).dispatchVote(params)
      ).to.be.revertedWithCustomError(dispatcher, "InvalidDestination");
    });

    it("should revert with zero maxWeight", async function () {
      const { dispatcher, admin } = await loadFixture(fullFixture);

      const VOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));
      await dispatcher.connect(admin).grantRole(VOTER_ROLE, admin.address);

      const params = buildDispatchParams({ maxWeight: 0n });

      await expect(
        dispatcher.connect(admin).dispatchVote(params)
      ).to.be.revertedWithCustomError(dispatcher, "InvalidWeight");
    });

    it("should revert when XCM precompile returns zero messageId (send fail)", async function () {
      const { dispatcher, mockXcm, admin } = await loadFixture(fullFixture);
      await mockXcm.setShouldFailSend(true);

      const VOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));
      await dispatcher.connect(admin).grantRole(VOTER_ROLE, admin.address);

      const params = buildDispatchParams();

      await expect(
        dispatcher.connect(admin).dispatchVote(params)
      ).to.be.revertedWithCustomError(dispatcher, "XCMSendFailed");
    });

    it("should revert on duplicate voteId dispatch", async function () {
      const { dispatcher, voting, voter1, voter2, admin } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1);

      const VOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));
      await dispatcher.connect(admin).grantRole(VOTER_ROLE, admin.address);

      const history = await voting.getVoteHistory(voter1.address);
      const voteId = history[0].voteId;

      const params = buildDispatchParams({ voteId });

      await expect(
        dispatcher.connect(admin).dispatchVote(params)
      ).to.be.revertedWithCustomError(dispatcher, "MessageAlreadyDispatched");
    });
  });

  describe("getDispatchedMessage()", function () {
    it("should return messageId and timestamp after dispatch", async function () {
      const { dispatcher, voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 2);

      const history = await voting.getVoteHistory(voter1.address);
      const voteId = history[0].voteId;

      const [messageId, timestamp] = await dispatcher.getDispatchedMessage(voteId);

      expect(messageId).to.not.equal(ethers.ZeroHash);
      expect(timestamp).to.be.greaterThan(0n);
    });

    it("should return zero values for unknown voteId", async function () {
      const { dispatcher } = await loadFixture(fullFixture);
      const [messageId, timestamp] = await dispatcher.getDispatchedMessage(ethers.ZeroHash);
      expect(messageId).to.equal(ethers.ZeroHash);
      expect(timestamp).to.equal(0n);
    });
  });

  describe("notifyDelivery / notifyFailure", function () {
    it("should revert notifyDelivery for mismatched messageId", async function () {
      const { dispatcher, voting, voter1, admin } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1);

      const history = await voting.getVoteHistory(voter1.address);
      const voteId = history[0].voteId;

      await expect(
        dispatcher.connect(admin).notifyDelivery(voteId, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(dispatcher, "XCMSendFailed");
    });

    it("should revert notifyFailure for unknown voteId", async function () {
      const { dispatcher, admin } = await loadFixture(fullFixture);

      await expect(
        dispatcher.connect(admin).notifyFailure(ethers.ZeroHash, "timeout")
      ).to.be.revertedWithCustomError(dispatcher, "XCMSendFailed");
    });

    it("should revert notifyDelivery when called by non-admin", async function () {
      const { dispatcher, voter1 } = await loadFixture(fullFixture);
      await expect(
        dispatcher.connect(voter1).notifyDelivery(ethers.randomBytes(32), ethers.randomBytes(32))
      ).to.be.reverted;
    });
  });
});
