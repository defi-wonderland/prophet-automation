import hre from 'hardhat';
import { OpooSDK } from 'opoo-sdk';
import { ContractRunner } from 'ethers-v6';
import { address } from '../constants';
import { ResolveDispute } from '../gelato-task-creation/resolve-dispute';
import { TasksCache } from '../utils/tasks-cache';
import { DisputeData } from 'opoo-sdk/dist/batching/getBatchDisputeData';

const PAGE_SIZE = 80;
const textColorGreen = '\x1b[32m';
const textColorReset = '\x1b[0m';
const TRIES = 5;

export class LoopDisputes {
  private scriptsCache: TasksCache = new TasksCache();
  private disputeResolver = new ResolveDispute();

  async listDisputes(sdk: OpooSDK, i: number, PAGE_SIZE: number): Promise<DisputeData[]> {
    const disputes = await sdk.batching.listDisputes(i * PAGE_SIZE, PAGE_SIZE);
    return disputes;
  }

  async processDisputeData(sdk: OpooSDK, disputeData: DisputeData[]) {
    console.log('processing dispute data', disputeData.length);
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

            try {
              console.log('simulating resolve dispute with disputeId: ', dispute.disputeId);
              // 1- Simulate
              const result = await sdk.helpers.callStatic('resolveDispute', dispute.disputeId);
              console.log('simulated successfully resolve dispute with disputeId: ', dispute.disputeId);

              // 2- Create the task in gelato
              // this.disputeResolver.automateTask(dispute.disputeId);
              // If the task was successfully submitted to gelato we can set the cache
              console.log(
                `task created for disputeId: ${textColorGreen}${dispute.disputeId}${textColorReset}, saving to cache`
              );

              // 3- Save to cache
              await this.scriptsCache.setDisputeTaskCreated(dispute.disputeId);
            } catch (error) {
              console.log('error simulating resolve dispute with disputeId: ', dispute.disputeId);
            }
          }
        }
      }
    }
  }

  public async loopDisputes() {
    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;
    const sdk = new OpooSDK(runner, address.deployed.ORACLE);

    // First we have to get the total requests count
    const totalRequests = await sdk.helpers.totalRequestCount();

    // Then we have to calculate how many call to the oracle to get the requests
    const totalCalls = Math.ceil(Number(totalRequests) / PAGE_SIZE);


    // Then we loop over the pages
    for (let i = 0; i < totalCalls; i++) {
      let disputeData: DisputeData[];
      console.log('getting requestIds', i * PAGE_SIZE, PAGE_SIZE);

      let j = TRIES;
      do {
        try {
          disputeData = await this.listDisputes(sdk, i, PAGE_SIZE);
          // If the data is correct we can break the loop
          break;
        } catch (error) {
          console.log('error getting requestIds, retrying', error);
        }

        j--;
        if (j === 0) {
          throw new Error('error getting requestIds, service unavailable');
        }
      } while (j > 0);

      await this.processDisputeData(sdk, disputeData);
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
