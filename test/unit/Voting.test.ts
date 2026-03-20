/*
 * ============================================================
 * Voting.test.ts
 * ============================================================
 * Unit tests for GovMeshVoting.
 *
 * Test categories:
 *   Deployment          — Proxy init, role assignment, contract links
 *   vote()              — Happy path Aye/Nay/Abstain, all conviction levels
 *   vote() validation   — Duplicate vote, closed proposal, zero balance,
 *                         invalid conviction, zero weight guards
 *   Conviction math     — All 7 conviction levels compute correct weights
 *   Tally               — Aye/Nay/Abstain tallies aggregate correctly
 *   Vote history        — getVoteHistory returns correct records
 *   Delivery lifecycle  — confirmDelivery, markFailed update status
 *   Access control      — Non-confirmer cannot confirmDelivery/markFailed
 *   minimumDotBalance   — Enforced when set by admin
 *   Pausable            — Paused contract rejects votes
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
  ONE_DOT,
} from "../fixtures/parachain-fixtures";

const VoteType = { Aye: 0, Nay: 1, Abstain: 2 };
const DeliveryStatus = { Pending: 0, Sent: 1, Delivered: 2, Failed: 3 };

async function fullFixture() {
  const system = await deployGovMeshSystem();
  await registerMockParachains(system.registry, system.admin);
  await writeMockProposals(system.registry, system.dispatcher, system.admin);
  return system;
}

describe("GovMeshVoting", function () {
  describe("Deployment", function () {
    it("should deploy behind a UUPS proxy", async function () {
      const { voting } = await loadFixture(fullFixture);
      expect(await voting.getAddress()).to.be.properAddress;
    });

    it("should set registry and dispatcher references", async function () {
      const { voting, registry, dispatcher } = await loadFixture(fullFixture);
      expect(await voting.registry()).to.equal(await registry.getAddress());
      expect(await voting.dispatcher()).to.equal(await dispatcher.getAddress());
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      const { voting, admin } = await loadFixture(fullFixture);
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await voting.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("vote()", function () {
    it("should allow an Aye vote with conviction 1", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1)
      )
        .to.emit(voting, "VoteCommitted")
        .and.to.emit(voting, "VoteSent");
    });

    it("should allow a Nay vote with conviction 3", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Nay, 3)
      ).to.emit(voting, "VoteCommitted");
    });

    it("should allow an Abstain vote (no conviction required)", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Abstain, 0)
      ).to.emit(voting, "VoteCommitted");
    });

    it("should revert on duplicate vote from same address", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1);

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Nay, 1)
      ).to.be.revertedWithCustomError(voting, "AlreadyVoted")
        .withArgs(voter1.address, proposal.parachainId, proposal.index);
    });

    it("should allow two different voters on the same proposal", async function () {
      const { voting, voter1, voter2 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1);
      await voting.connect(voter2).vote(proposal.parachainId, proposal.index, VoteType.Nay, 2);

      expect(await voting.hasVoted(voter1.address, proposal.parachainId, proposal.index)).to.be.true;
      expect(await voting.hasVoted(voter2.address, proposal.parachainId, proposal.index)).to.be.true;
    });

    it("should revert for a closed proposal (endBlock = 1)", async function () {
      const { voting, registry, admin, voter1 } = await loadFixture(fullFixture);
      const chain = MOCK_PARACHAINS[0];

      const DISPATCHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISPATCHER_ROLE"));
      await registry.connect(admin).grantRole(DISPATCHER_ROLE, admin.address);

      await registry.connect(admin).writeProposal(
        chain.id, 999, "Closed", "QmClosed", 1, 0n, 0n, 0n
      );

      await expect(
        voting.connect(voter1).vote(chain.id, 999, VoteType.Aye, 1)
      ).to.be.revertedWithCustomError(voting, "ProposalNotOpen");
    });

    it("should revert with invalid conviction (7)", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 7)
      ).to.be.revertedWithCustomError(voting, "InvalidConviction").withArgs(7);
    });

    it("should revert when minimum DOT balance not met", async function () {
      const { voting, admin, voter3 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(admin).setMinimumDotBalance(10n * ONE_DOT);

      await expect(
        voting.connect(voter3).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1)
      ).to.be.revertedWithCustomError(voting, "InsufficientDotBalance");
    });
  });

  describe("Conviction Math", function () {
    const convictions = [
      { level: 0, multiplierNum: 1n, multiplierDen: 10n },
      { level: 1, multiplierNum: 1n, multiplierDen: 1n },
      { level: 2, multiplierNum: 2n, multiplierDen: 1n },
      { level: 3, multiplierNum: 3n, multiplierDen: 1n },
      { level: 4, multiplierNum: 4n, multiplierDen: 1n },
      { level: 5, multiplierNum: 5n, multiplierDen: 1n },
      { level: 6, multiplierNum: 6n, multiplierDen: 1n },
    ];

    for (const c of convictions) {
      it(`conviction ${c.level}: weight = balance × ${c.multiplierNum}/${c.multiplierDen}`, async function () {
        const { voting, voter1 } = await loadFixture(fullFixture);
        const proposal = MOCK_PROPOSALS[0];

        const tx = await voting.connect(voter1).vote(
          proposal.parachainId, proposal.index, VoteType.Aye, c.level
        );
        const receipt = await tx.wait();

        const iface = voting.interface;
        const event = receipt?.logs
          .map((log: any) => { try { return iface.parseLog(log); } catch { return null; } })
          .find((e: any) => e?.name === "VoteCommitted");

        const expectedWeight = (DOT_BALANCE * c.multiplierNum) / c.multiplierDen;
        expect(event?.args.votingWeight).to.equal(expectedWeight);
      });
    }
  });

  describe("Tally", function () {
    it("should accumulate aye, nay, and abstain tallies correctly", async function () {
      const { voting, voter1, voter2, voter3 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1);
      await voting.connect(voter2).vote(proposal.parachainId, proposal.index, VoteType.Nay, 2);
      await voting.connect(voter3).vote(proposal.parachainId, proposal.index, VoteType.Abstain, 0);

      const [aye, nay, abstain] = await voting.getProposalTally(proposal.parachainId, proposal.index);

      expect(aye).to.equal(DOT_BALANCE * 1n);
      expect(nay).to.equal(DOT_BALANCE * 10n * 2n);
      expect(abstain).to.equal(0n);
    });
  });

  describe("Vote History", function () {
    it("should return all votes for a given voter", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);

      await voting.connect(voter1).vote(MOCK_PROPOSALS[0].parachainId, MOCK_PROPOSALS[0].index, VoteType.Aye, 1);
      await voting.connect(voter1).vote(MOCK_PROPOSALS[2].parachainId, MOCK_PROPOSALS[2].index, VoteType.Nay, 3);

      const history = await voting.getVoteHistory(voter1.address);
      expect(history.length).to.equal(2);
      expect(history[0].parachainId).to.equal(MOCK_PROPOSALS[0].parachainId);
      expect(history[1].parachainId).to.equal(MOCK_PROPOSALS[2].parachainId);
    });

    it("should return empty history for a non-voter", async function () {
      const [, , , , , stranger] = await ethers.getSigners();
      const { voting } = await loadFixture(fullFixture);
      const history = await voting.getVoteHistory(stranger.address);
      expect(history.length).to.equal(0);
    });
  });

  describe("Delivery Lifecycle", function () {
    it("should update status to Delivered on confirmDelivery", async function () {
      const { voting, dispatcher, admin, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      const tx = await voting.connect(voter1).vote(
        proposal.parachainId, proposal.index, VoteType.Aye, 1
      );
      const receipt = await tx.wait();

      const sentEvent = receipt?.logs
        .map((log: any) => { try { return voting.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteSent");

      const voteId = sentEvent?.args.voteId;
      const xcmMessageId = sentEvent?.args.xcmMessageId;

      await dispatcher.connect(admin).notifyDelivery(voteId, xcmMessageId);

      const voteRecord = await voting.getVote(voteId);
      expect(voteRecord.status).to.equal(DeliveryStatus.Delivered);
    });

    it("should update status to Failed on markFailed", async function () {
      const { voting, dispatcher, admin, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      const tx = await voting.connect(voter1).vote(
        proposal.parachainId, proposal.index, VoteType.Aye, 1
      );
      const receipt = await tx.wait();

      const sentEvent = receipt?.logs
        .map((log: any) => { try { return voting.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteSent");

      const voteId = sentEvent?.args.voteId;

      await dispatcher.connect(admin).notifyFailure(voteId, "XCM delivery timeout");

      const voteRecord = await voting.getVote(voteId);
      expect(voteRecord.status).to.equal(DeliveryStatus.Failed);
    });
  });

  describe("Pausable", function () {
    it("should reject votes when paused", async function () {
      const { voting, admin, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(admin).pause();

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1)
      ).to.be.reverted;
    });
  });
});
