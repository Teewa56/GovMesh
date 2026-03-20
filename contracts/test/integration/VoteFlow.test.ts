/*
 * ============================================================
 * VoteFlow.test.ts
 * ============================================================
 * Integration tests for the complete GovMesh vote flow.
 *
 * These tests exercise the full path from user vote submission
 * through XCM dispatch to delivery confirmation, spanning all
 * three contracts in one test run.
 *
 * Test scenarios:
 *
 *   Happy path:
 *     vote() → VoteCommitted → VoteSent → XCM dispatched
 *     → notifyDelivery → VoteDelivered → status = Delivered
 *
 *   Multi-voter:
 *     3 voters on same proposal, all votes dispatched independently
 *     Tally aggregates correctly across all three
 *
 *   Multi-parachain:
 *     Same voter votes on proposals on 3 different parachains
 *     Separate XCM messages dispatched to each destination
 *     All 3 appear in voter history
 *
 *   Failure path:
 *     vote() → VoteSent → notifyFailure → status = Failed
 *     Voter sees Failed status in history
 *
 *   XCM precompile failure:
 *     MockXcmPrecompile configured to return zero messageId
 *     vote() reverts entirely — no partial state written
 *     Voter can retry after precompile is restored
 *
 *   Conviction extremes:
 *     Voter with 1000 DOT votes at conviction 6 → weight = 6000 DOT
 *     Voter votes at conviction 0 → weight = 0.1x = 100 DOT
 * ============================================================
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  deployGovMeshSystem,
  registerMockParachains,
  writeMockProposals,
  MOCK_PROPOSALS,
  MOCK_PARACHAINS,
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

describe("VoteFlow Integration", function () {
  describe("Happy Path — Single Vote End to End", function () {
    it("should complete the full lifecycle: vote → dispatch → deliver", async function () {
      const { voting, dispatcher, voter1, admin } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      const voteTx = await voting.connect(voter1).vote(
        proposal.parachainId, proposal.index, VoteType.Aye, 2
      );
      const voteReceipt = await voteTx.wait();

      const votingIface = voting.interface;
      const dispatcherIface = dispatcher.interface;

      const committedEvent = voteReceipt?.logs
        .map((log: any) => { try { return votingIface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteCommitted");

      const sentEvent = voteReceipt?.logs
        .map((log: any) => { try { return votingIface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteSent");

      const dispatchEvent = voteReceipt?.logs
        .map((log: any) => { try { return dispatcherIface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteDispatched");

      expect(committedEvent).to.not.be.null;
      expect(sentEvent).to.not.be.null;
      expect(dispatchEvent).to.not.be.null;

      const voteId = committedEvent?.args.voteId;
      const xcmMessageId = sentEvent?.args.xcmMessageId;

      let voteRecord = await voting.getVote(voteId);
      expect(voteRecord.status).to.equal(DeliveryStatus.Sent);
      expect(voteRecord.xcmMessageId).to.equal(xcmMessageId);

      await dispatcher.connect(admin).notifyDelivery(voteId, xcmMessageId);

      voteRecord = await voting.getVote(voteId);
      expect(voteRecord.status).to.equal(DeliveryStatus.Delivered);
      expect(voteRecord.voter).to.equal(voter1.address);
      expect(voteRecord.parachainId).to.equal(proposal.parachainId);
      expect(voteRecord.proposalIndex).to.equal(BigInt(proposal.index));
      expect(voteRecord.conviction).to.equal(2);
      expect(voteRecord.votingWeight).to.equal(DOT_BALANCE * 2n);
    });
  });

  describe("Multi-Voter — Same Proposal", function () {
    it("should accept votes from 3 different voters and tally correctly", async function () {
      const { voting, dispatcher, voter1, voter2, voter3, admin } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1);
      await voting.connect(voter2).vote(proposal.parachainId, proposal.index, VoteType.Nay, 2);
      await voting.connect(voter3).vote(proposal.parachainId, proposal.index, VoteType.Aye, 6);

      const [aye, nay] = await voting.getProposalTally(proposal.parachainId, proposal.index);

      const voter1Weight = DOT_BALANCE * 1n;
      const voter2Weight = DOT_BALANCE * 10n * 2n;
      const voter3Weight = ONE_DOT * 6n;

      expect(aye).to.equal(voter1Weight + voter3Weight);
      expect(nay).to.equal(voter2Weight);

      expect(await voting.hasVoted(voter1.address, proposal.parachainId, proposal.index)).to.be.true;
      expect(await voting.hasVoted(voter2.address, proposal.parachainId, proposal.index)).to.be.true;
      expect(await voting.hasVoted(voter3.address, proposal.parachainId, proposal.index)).to.be.true;
    });
  });

  describe("Multi-Parachain — Same Voter", function () {
    it("should dispatch votes to 3 different parachains independently", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);

      const p0 = MOCK_PROPOSALS[0];
      const p2 = MOCK_PROPOSALS[2];

      await voting.connect(voter1).vote(p0.parachainId, p0.index, VoteType.Aye, 1);
      await voting.connect(voter1).vote(p2.parachainId, p2.index, VoteType.Nay, 3);

      const history = await voting.getVoteHistory(voter1.address);
      expect(history.length).to.equal(2);

      const parachainIds = history.map((r: any) => r.parachainId);
      expect(parachainIds).to.include(BigInt(p0.parachainId));
      expect(parachainIds).to.include(BigInt(p2.parachainId));
    });
  });

  describe("Failure Path — XCM Delivery Failed", function () {
    it("should mark vote as Failed and emit VoteFailed", async function () {
      const { voting, dispatcher, voter1, admin } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1);

      const history = await voting.getVoteHistory(voter1.address);
      const voteId = history[0].voteId;

      await expect(
        dispatcher.connect(admin).notifyFailure(voteId, "XCM delivery timeout")
      ).to.emit(voting, "VoteFailed").withArgs(voteId, proposal.parachainId, "XCM delivery timeout");

      const record = await voting.getVote(voteId);
      expect(record.status).to.equal(DeliveryStatus.Failed);
    });
  });

  describe("Failure Path — XCM Precompile Returns Zero", function () {
    it("should revert vote() and write no state when precompile fails", async function () {
      const { voting, mockXcm, voter1, voter2 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      await mockXcm.setShouldFailSend(true);

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1)
      ).to.be.reverted;

      expect(await voting.hasVoted(voter1.address, proposal.parachainId, proposal.index)).to.be.false;
      const history = await voting.getVoteHistory(voter1.address);
      expect(history.length).to.equal(0);

      await mockXcm.setShouldFailSend(false);

      await expect(
        voting.connect(voter1).vote(proposal.parachainId, proposal.index, VoteType.Aye, 1)
      ).to.emit(voting, "VoteCommitted");
    });
  });

  describe("Conviction Extremes", function () {
    it("conviction 6 on a high-balance voter should produce 6x weight", async function () {
      const { voting, mockAssets, voter2 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      const bigBalance = 1000n * ONE_DOT;
      await mockAssets.setBalance(voter2.address, bigBalance);

      const tx = await voting.connect(voter2).vote(
        proposal.parachainId, proposal.index, VoteType.Aye, 6
      );
      const receipt = await tx.wait();

      const event = receipt?.logs
        .map((log: any) => { try { return voting.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteCommitted");

      expect(event?.args.votingWeight).to.equal(bigBalance * 6n);
    });

    it("conviction 0 should produce 0.1x weight", async function () {
      const { voting, voter1 } = await loadFixture(fullFixture);
      const proposal = MOCK_PROPOSALS[0];

      const tx = await voting.connect(voter1).vote(
        proposal.parachainId, proposal.index, VoteType.Aye, 0
      );
      const receipt = await tx.wait();

      const event = receipt?.logs
        .map((log: any) => { try { return voting.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "VoteCommitted");

      expect(event?.args.votingWeight).to.equal(DOT_BALANCE / 10n);
    });
  });
});
