import hre from 'hardhat';
import { OpooSDK, RequestFullData } from 'opoo-sdk';
import { ContractRunner } from 'ethers-v6';
import { TEXT_COLOR_GREEN, TEXT_COLOR_RESET, TRIES, address } from '../constants';
import { TasksCache } from '../utils/tasks-cache';
import { FinalizeRequest } from '../gelato-task-creation/finalize-request';
import { sleep } from '../utils/utils';

const PAGE_SIZE = 6;

export class LoopRequests {
  private scriptsCache: TasksCache = new TasksCache();
  private requestFinalizer = new FinalizeRequest();

  async listRequests(sdk: OpooSDK, i: number, PAGE_SIZE: number): Promise<RequestFullData[]> {
    const requests = await sdk.batching.listRequests(i * PAGE_SIZE, PAGE_SIZE);
    return requests;
  }

  async processRequestData(sdk: OpooSDK, requestData: RequestFullData[]) {
    console.log('processing request data', requestData.length);
    for (const data of requestData) {
      let created = false;
      const finalized = data.request.finalizedAt != 0;

      if (await this.scriptsCache.isFinalizeRequestTaskCreated(data.requestId) || finalized) {
        console.log(
          `task already created or finalized for requestId: ${TEXT_COLOR_GREEN}${data.request.requestId}${TEXT_COLOR_RESET}`
        );
      } else {
        for (const response of data.responses) {
          try {
            // simulate the task -> create the gelato task -> save to cache the task created
            // 1- Simulate
            await sdk.helpers.callStatic('finalize(bytes32,bytes32)', data.requestId, response.responseId);
            console.log(
              `simulated successfully finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response.responseId}${TEXT_COLOR_RESET}`
            );

            // 2- Create the task in gelato
            //this.requestFinalizer.automateTask(data.requestId, response.responseId);
            // If the task was successfully submitted to gelato we can set the cache
            console.log(
              `task created for requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response.responseId}${TEXT_COLOR_RESET}, saving to cache`
            );

            // 3- Save to cache
            await this.scriptsCache.setFinalizeRequestTaskCreated(data.requestId);
            // Continue with the next request
            created = true;
            break;
          } catch (error) {
            console.log(
              `error simulating finalize request with requestId: ${TEXT_COLOR_GREEN}${data.request.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response.responseId}${TEXT_COLOR_RESET}`
            );
          }
        }

        if (!created) {
          // If creating the task with the responses failed we try to create the task without the responseId
          try {
            // simulate the task -> create the gelato task -> save to cache the task created
            // 1- Simulate
            await sdk.helpers.callStatic('finalize(bytes32)', data.requestId);
            console.log(
              `simulated successfully finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}`
            );

            // 2- Create the task in gelato
            this.requestFinalizer.automateTask(data.requestId);
            // If the task was successfully submitted to gelato we can set the cache
            console.log(
              `task created for requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}, saving to cache`
            );

            // 3- Save to cache
            await this.scriptsCache.setFinalizeRequestTaskCreated(data.requestId);
            break;
          } catch (error) {
            console.log(
              `error simulating finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}`
            );
          }
        }
      }
    }
  }

  public async loopRequests() {
    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;
    const sdk = new OpooSDK(runner, address.deployed.ORACLE);

    // First we have to get the total requests count
    const totalRequests = await sdk.helpers.totalRequestCount();

    // Then we have to calculate how many call to the oracle to get the requests
    const totalCalls = Math.ceil(Number(totalRequests) / PAGE_SIZE);

    // Then we loop over the pages
    for (let i = 0; i < totalCalls; i++) {
      let requestsData: RequestFullData[];
      console.log('getting requests', i * PAGE_SIZE, PAGE_SIZE);

      let j = TRIES;
      do {
        try {
          requestsData = await this.listRequests(sdk, i, PAGE_SIZE);
          // If the data is correct we can break the loop
          break;
        } catch (error) {
          console.log('error getting requests, retrying', j);
          await sleep(2000);
        }

        j--;
        if (j === 0) {
          throw new Error('error getting requests, service unavailable');
        }
      } while (j > 0);

      await this.processRequestData(sdk, requestsData);
    }
  }
}
