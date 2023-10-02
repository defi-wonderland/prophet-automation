import hre from 'hardhat';
import { ProphetSDK } from '@defi-wonderland/prophet-sdk';
import { ContractRunner } from 'ethers-v6';
import { TEXT_COLOR_GREEN, TEXT_COLOR_RESET, TRIES, address } from '../constants';
import { ResolveDispute } from '../gelato-task-creation/resolve-dispute';
import { TasksCache } from '../utils/tasks-cache';
import { DisputeData } from '@defi-wonderland/prophet-sdk/dist/batching/getBatchDisputeData';
import { sleep } from '../utils/utils';

const PAGE_SIZE = 80;

export class ResolveDisputes {
  private scriptsCache: TasksCache = new TasksCache();
  private disputeResolver = new ResolveDispute();

  async listDisputes(sdk: ProphetSDK, i: number, PAGE_SIZE: number): Promise<DisputeData[]> {
    const disputes = await sdk.batching.listDisputes(i * PAGE_SIZE, PAGE_SIZE);
    return disputes;
  }

  async processDisputeData(sdk: ProphetSDK, disputeData: DisputeData[], startingIndex: number) {
    console.log('processing dispute data', disputeData.length);

    let index = startingIndex;
    let firstNonResolvedDisputeIndex = Number.MAX_SAFE_INTEGER;

    for (const data of disputeData) {
      for (const dispute of data.disputes) {
        const status = Number(dispute.status);

        if (!data.isFinalized && status < 3) {
          // If the request is not finalized and can have a dispute in the future or already has a dispute
          firstNonResolvedDisputeIndex = Math.min(firstNonResolvedDisputeIndex, index);
        }

        if (status > 0 && status - 1 <= 1) {
          if (await this.scriptsCache.isDisputeTaskCreated(dispute.disputeId)) {
            console.log(
              `task already created for disputeId: ${TEXT_COLOR_GREEN}${dispute.disputeId}${TEXT_COLOR_RESET}`
            );
          } else {
            // These are the the disputes that are active or escalated and can be resolved
            console.log(
              `creating task to resolve disputeId: ${TEXT_COLOR_GREEN}${
                dispute.disputeId
              }${TEXT_COLOR_RESET} dispute status: ${TEXT_COLOR_GREEN}${
                DisputeStatusMapping[dispute.status]
              }${TEXT_COLOR_RESET}`
            );

            // simulate the task -> create the gelato task -> save to cache the task created
            try {
              console.log('simulating resolve dispute with disputeId: ', dispute.disputeId);
              // 1- Simulate
              await sdk.helpers.callStatic('resolveDispute', dispute.disputeId);
              console.log('simulated successfully resolve dispute with disputeId: ', dispute.disputeId);

              // 2- Create the task in gelato
              this.disputeResolver.automateTask(dispute.disputeId);
              // If the task was successfully submitted to gelato we can set the cache
              console.log(
                `task created for disputeId: ${TEXT_COLOR_GREEN}${dispute.disputeId}${TEXT_COLOR_RESET}, saving to cache`
              );

              // 3- Save to cache
              await this.scriptsCache.setDisputeTaskCreated(dispute.disputeId);
            } catch (error) {
              console.log('error simulating resolve dispute with disputeId: ', dispute.disputeId);
            }
          }
        }
      }
      ++index;
    }

    if (firstNonResolvedDisputeIndex != Number.MAX_SAFE_INTEGER) {
      console.log('saving firstNonResolvedDisputeIndex', firstNonResolvedDisputeIndex);
      await this.scriptsCache.setFirstNonResolvedDisputeRequestIndex(firstNonResolvedDisputeIndex);
    }

    console.log('firstNonResolvedDisputeIndex', firstNonResolvedDisputeIndex);
  }

  public async run() {
    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;
    const sdk = new ProphetSDK(runner, address.deployed.ORACLE);

    let firstNonResolvedDispute = await this.scriptsCache.getFirstNonResolvedDisputeRequestIndex();
    firstNonResolvedDispute = firstNonResolvedDispute ? firstNonResolvedDispute : 0;
    console.log('firstNonResolvedDispute', firstNonResolvedDispute);

    // First we have to get the total requests count
    const totalRequests = await sdk.helpers.totalRequestCount();

    // Then we have to calculate how many call to the oracle to get the requests
    const totalCalls = Math.ceil(Number(totalRequests) / PAGE_SIZE);

    let disputesData: DisputeData[] = [];

    const startingPage = Math.floor(firstNonResolvedDispute / PAGE_SIZE);

    // Then we loop over the pages
    for (let i = startingPage; i < totalCalls; i++) {
      console.log('getting requests', i * PAGE_SIZE, PAGE_SIZE * i + PAGE_SIZE);

      let j = TRIES;
      do {
        try {
          disputesData = [...disputesData, ...(await this.listDisputes(sdk, i, PAGE_SIZE))];

          if (firstNonResolvedDispute >= i * PAGE_SIZE && firstNonResolvedDispute <= i * PAGE_SIZE + PAGE_SIZE) {
            if (firstNonResolvedDispute > PAGE_SIZE) {
              disputesData = disputesData.slice(firstNonResolvedDispute - PAGE_SIZE * i, disputesData.length);
            } else {
              disputesData = disputesData.slice(firstNonResolvedDispute, disputesData.length);
            }
          }
          // If the data is correct we can break the loop
          break;
        } catch (error) {
          console.log('error getting requests, retrying', error);
          await sleep(2000);
        }

        j--;
        if (j === 0) {
          throw new Error('error getting requests, service unavailable');
        }
      } while (j > 0);
    }

    disputesData = disputesData.slice(0, Number(totalRequests) - firstNonResolvedDispute);
    await this.processDisputeData(sdk, disputesData, firstNonResolvedDispute);
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
