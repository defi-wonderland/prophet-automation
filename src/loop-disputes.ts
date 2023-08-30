import hre from 'hardhat';
import { OpooSDK } from 'opoo-sdk';
import { ContractRunner } from 'ethers-v6';
import { address } from './constants';
import { ResolveDispute } from './resolve-dispute';

const PAGE_SIZE = 50;
const textColorGreen = "\x1b[32m";
const textColorReset = "\x1b[0m";

export class LoopDisputes {
  public async loopDisputes() {
    const disputeResolver = new ResolveDispute();

    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;

    const sdk = new OpooSDK(runner, address.deployed.ORACLE);

    // First we have to get the total requests count
    const totalRequests = await sdk.helpers.totalRequestCount();

    // Then we have to calculate how many call to the oracle to get the requests
    const totalCalls = Math.ceil(Number(totalRequests) / PAGE_SIZE);

    const disputeData = [];
    // Then we loop over the pages
    for (let i = 0; i < totalCalls; i++) {
      console.log('getting requestIds', i * PAGE_SIZE, PAGE_SIZE);
      const disputes = await sdk.batching.getDisputeData(i * PAGE_SIZE, PAGE_SIZE);
      disputeData.push(...disputes);
    }

    for (const data of disputeData) {
      for (const dispute of data.disputes) {
        const status = Number(dispute.status);

        if (status > 0 && status - 1 <= 1) {
          // These are the the disputes that are active or escalated and can be resolved
          console.log(`creating task to resolve disputeId: ${textColorGreen}${dispute.disputeId}${textColorReset} dispute status: ${textColorGreen}${DisputeStatusMapping[dispute.status]}${textColorReset}`);
          disputeResolver.automateTask(address.deployed.ORACLE, dispute.disputeId);
        }
      }
    }
  }
}

const DisputeStatusMapping: Record<number, string> = {
  0: "None",
  1: "Active",
  2: "Escalated",
  3: "Won",
  4: "Lost",
  5: "NoResolution",
};
