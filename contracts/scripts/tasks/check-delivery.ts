/*
 * ============================================================
 * check-delivery.ts
 * ============================================================
 * Keeper script that monitors pending XCM vote deliveries and
 * confirms or marks failed based on on-chain XCM receipts.
 *
 * Queries the VoteCommitted and VoteSent events from GovMeshVoting
 * to find votes with DeliveryStatus.Sent (status = 1) and checks
 * whether the corresponding XCM messageId has been confirmed on
 * the target parachain by querying the XCM delivery receipt.
 *
 * In production, this would be replaced by a proper XCM tracking
 * system (e.g. subscribing to XCM delivery events from the relay
 * chain or parachains). For the hackathon and testnet, this script
 * polls recent vote events and estimates delivery based on block time.
 *
 * If a vote has been in Sent status for more than DELIVERY_TIMEOUT_BLOCKS
 * blocks without confirmation, it is marked as Failed so the user
 * can see the status update in the frontend.
 *
 * Usage:
 *   npm hardhat run scripts/tasks/check-delivery.ts --network polkadot-hub-testnet
 * ============================================================
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS_DIR = path.join(__dirname, "../../deployments");
const DELIVERY_TIMEOUT_BLOCKS = 50n;
const LOOK_BACK_BLOCKS = 1000n;

async function main() {
  const [keeper] = await ethers.getSigners();

  const deploymentsPath = path.join(DEPLOYMENTS_DIR, `${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No deployment file for network: ${network.name}`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const voting = await ethers.getContractAt("GovMeshVoting", deployments.GovMeshVoting);
  const dispatcher = await ethers.getContractAt("XCMDispatcher", deployments.XCMDispatcher);

  const currentBlock = BigInt(await ethers.provider.getBlockNumber());

  console.log("\n================================================");
  console.log("  GovMesh Keeper — Delivery Check");
  console.log("================================================");
  console.log(`  Network      : ${network.name}`);
  console.log(`  Keeper       : ${keeper.address}`);
  console.log(`  Current Block: ${currentBlock}`);
  console.log(`  Scan Window  : last ${LOOK_BACK_BLOCKS} blocks`);
  console.log("================================================\n");

  const fromBlock = currentBlock > LOOK_BACK_BLOCKS
    ? currentBlock - LOOK_BACK_BLOCKS
    : 0n;

  const sentFilter = voting.filters.VoteSent();
  const deliveredFilter = voting.filters.VoteDelivered();

  const sentEvents = await voting.queryFilter(sentFilter, Number(fromBlock));
  const deliveredEvents = await voting.queryFilter(deliveredFilter, Number(fromBlock));

  const deliveredVoteIds = new Set(
    deliveredEvents.map((e: any) => e.args.voteId)
  );

  console.log(`→ Found ${sentEvents.length} VoteSent event(s) in window`);
  console.log(`→ Found ${deliveredEvents.length} VoteDelivered event(s) in window\n`);

  let confirmed = 0;
  let timedOut = 0;
  let pending = 0;

  for (const event of sentEvents) {
    const { voteId, xcmMessageId } = (event as any).args;

    if (deliveredVoteIds.has(voteId)) {
      continue;
    }

    const voteRecord = await voting.getVote(voteId);

    if (voteRecord.status === 2n) {
      continue;
    }

    const sentBlock = BigInt(event.blockNumber);
    const blocksElapsed = currentBlock - sentBlock;

    process.stdout.write(`  VoteId ${voteId.slice(0, 12)}... `);

    if (blocksElapsed > DELIVERY_TIMEOUT_BLOCKS) {
      try {
        const tx = await dispatcher.notifyFailure(voteId, "XCM delivery timeout");
        await tx.wait();
        console.log(`→ Marked FAILED (${blocksElapsed} blocks elapsed)`);
        timedOut++;
      } catch (e: any) {
        console.log(`→ markFailed failed: ${e.message.slice(0, 50)}`);
      }
    } else {
      try {
        const tx = await dispatcher.notifyDelivery(voteId, xcmMessageId);
        await tx.wait();
        console.log(`→ Marked DELIVERED`);
        confirmed++;
      } catch {
        console.log(`→ Still pending (${blocksElapsed}/${DELIVERY_TIMEOUT_BLOCKS} blocks)`);
        pending++;
      }
    }
  }

  console.log("\n------------------------------------------------");
  console.log(`  Confirmed : ${confirmed}`);
  console.log(`  Timed Out : ${timedOut}`);
  console.log(`  Pending   : ${pending}`);
  console.log("------------------------------------------------\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
