import hre from 'hardhat';
import { ProphetSDK } from '@defi-wonderland/prophet-sdk';
import { ContractRunner } from 'ethers-v6';
import { TEXT_COLOR_GREEN, TEXT_COLOR_RESET, TRIES, address } from '../constants';
import { ResolveDispute } from '../gelato-task-creation/resolve-dispute';
import { TasksCache } from '../utils/tasks-cache';
import { DisputeData } from '@defi-wonderland/prophet-sdk/dist/batching/getBatchDisputeData';
import { sleep } from '../utils/utils';

const PAGE_SIZE = 50;

export class ResolveDisputes {
  private scriptsCache: TasksCache = new TasksCache();
  private disputeResolver = new ResolveDispute();

  private async listDisputes(sdk: ProphetSDK, startIndex: number, amount: number): Promise<DisputeData[]> {
    const disputes = await sdk.batching.listDisputes(startIndex, amount);
    return disputes;
  }

  async processDisputeData(sdk: ProphetSDK, disputeData: DisputeData[], startingIndex: number) {
    console.log('processing dispute data', disputeData.length);

    let index = startingIndex;
    let firstNonResolvedDisputeIndex = Number.MAX_SAFE_INTEGER;

    for (const data of disputeData) {
      if (!data.isFinalized) {
        // It could have a dispute in the future since it's not finalized
        firstNonResolvedDisputeIndex = Math.min(firstNonResolvedDisputeIndex, index);

        for (const dispute of data.disputes) {
          const status = Number(dispute.status);

          if (DISPUTE_STATUS[status] == 'Active' || DISPUTE_STATUS[status] == 'Escalated') {
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
                  DISPUTE_STATUS[dispute.status]
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
      }

      ++index;
    }

    firstNonResolvedDisputeIndex =
      firstNonResolvedDisputeIndex == Number.MAX_SAFE_INTEGER ? index : firstNonResolvedDisputeIndex;
    console.log('saving firstNonResolvedDisputeIndex', firstNonResolvedDisputeIndex);
    await this.scriptsCache.setFirstNonResolvedDisputeRequestIndex(firstNonResolvedDisputeIndex);
  }

  public async run() {
    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;
    const sdk = new ProphetSDK(runner, address.deployed.ORACLE);

    let firstNonResolvedDispute = await this.scriptsCache.getFirstNonResolvedDisputeRequestIndex();
    firstNonResolvedDispute = firstNonResolvedDispute ? firstNonResolvedDispute : 0;
    console.log('firstNonResolvedDispute', firstNonResolvedDispute);

    // First get the total requests count
    const totalRequests = await sdk.helpers.totalRequestCount();

    // Calculate how many call to the oracle to get the requests
    const totalCalls = Math.ceil(Number(totalRequests) / PAGE_SIZE);

    let disputesData: DisputeData[] = [];

    const startingPage = Math.floor(firstNonResolvedDispute / PAGE_SIZE);

    // Loop over the pages
    for (let i = startingPage; i < totalCalls; i++) {
      const startIndex = i * PAGE_SIZE;
      console.log('getting requests', startIndex, startIndex + PAGE_SIZE);

      let j = TRIES;
      do {
        try {
          disputesData = [...disputesData, ...(await this.listDisputes(sdk, startIndex, PAGE_SIZE))].filter(
            (data) => data.requestId != address.zero
          );

          if (firstNonResolvedDispute >= i * PAGE_SIZE && firstNonResolvedDispute <= i * PAGE_SIZE + PAGE_SIZE) {
            if (firstNonResolvedDispute > PAGE_SIZE) {
              disputesData = disputesData.slice(firstNonResolvedDispute - PAGE_SIZE * i, disputesData.length);
            } else {
              disputesData = disputesData.slice(firstNonResolvedDispute, disputesData.length);
            }
          }
          // If the data is correct break the loop
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

const DISPUTE_STATUS: Record<number, string> = {
  0: 'None',
  1: 'Active',
  2: 'Escalated',
  3: 'Won',
  4: 'Lost',
  5: 'NoResolution',
};
