import hre from 'hardhat';
import { OpooSDK } from 'opoo-sdk';
import { ContractRunner } from 'ethers-v6';
import { address } from './constants';
import { ResolveDispute } from './resolve-dispute';
import { TasksCache } from './tasks-cache';

const PAGE_SIZE = 80;
const textColorGreen = '\x1b[32m';
const textColorReset = '\x1b[0m';

export class LoopDisputes {
  scriptsCache: TasksCache = new TasksCache();

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
      const disputes = await sdk.batching.listDisputes(i * PAGE_SIZE, PAGE_SIZE);
      disputeData.push(...disputes);
    }

    for (const data of disputeData) {
      for (const dispute of data.disputes) {
        const status = Number(dispute.status);

        if (status > 0 && status - 1 <= 1) {
          if (await this.scriptsCache.isDisputeTaskCreated(dispute.disputeId)) {
            console.log(`task already created for disputeId: ${textColorGreen}${dispute.disputeId}${textColorReset}`);
          } else {
            // These are the the disputes that are active or escalated and can be resolved
            console.log(
              `creating task to resolve disputeId: ${textColorGreen}${
                dispute.disputeId
              }${textColorReset} dispute status: ${textColorGreen}${
                DisputeStatusMapping[dispute.status]
              }${textColorReset}`
            );

            // simulate the task -> create the gelato task -> save to cache the task created
            // TODO: test simulation -> if simulation is successful we can automate the task
            // disputeResolver.automateTask(address.deployed.ORACLE, dispute.disputeId);
            // If the task was successfully submitted to gelato we can set the cache
            console.log(
              `task created for disputeId: ${textColorGreen}${dispute.disputeId}${textColorReset}, saving to cache`
            );
            await this.scriptsCache.setDisputeTaskCreated(dispute.disputeId);
          }
        }
      }
    }
  }
}

const DisputeStatusMapping: Record<number, string> = {
  0: 'None',
  1: 'Active',
  2: 'Escalated',
  3: 'Won',
  4: 'Lost',
  5: 'NoResolution',
};
