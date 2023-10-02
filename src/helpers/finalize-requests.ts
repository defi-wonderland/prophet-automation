import hre from 'hardhat';
import { ProphetSDK } from '@defi-wonderland/prophet-sdk';
import { ContractRunner } from 'ethers-v6';
import { TEXT_COLOR_GREEN, TEXT_COLOR_RESET, TRIES, address } from '../constants';
import { TasksCache } from '../utils/tasks-cache';
import { FinalizeRequest } from '../gelato-task-creation/finalize-request';
import { sleep } from '../utils/utils';
import { RequestForFinalizeData } from '@defi-wonderland/prophet-sdk/dist/batching/getBatchRequestForFinalizeData';

const PAGE_SIZE = 100;

export class FinalizeRequests {
  private scriptsCache: TasksCache = new TasksCache();
  private requestFinalizer = new FinalizeRequest();

  async listRequests(sdk: ProphetSDK, i: number, PAGE_SIZE: number): Promise<RequestForFinalizeData[]> {
    const requests = await sdk.batching.listRequestsForFinalize(i * PAGE_SIZE, PAGE_SIZE);
    return requests;
  }

  async processRequestData(sdk: ProphetSDK, requestData: RequestForFinalizeData[], startingIndex: number) {
    console.log('processing request data', requestData.length);
    let firstNonFinalizedRequest = Number.MAX_SAFE_INTEGER;
    let index = startingIndex;

    for (const data of requestData) {
      ++index;
      const finalized = data.finalizedAt != 0;

      if ((await this.scriptsCache.isFinalizeRequestTaskCreated(data.requestId)) || finalized) {
        console.log(
          `task already created or finalized for requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}`
        );
      } else {
        for (const response of data.responses) {
          try {
            // simulate the task -> create the gelato task -> save to cache the task created
            // 1- Simulate
            await sdk.helpers.callStatic('finalize(bytes32,bytes32)', data.requestId, response);
            console.log(
              `simulated successfully finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response}${TEXT_COLOR_RESET}`
            );

            // 2- Create the task in gelato
            //this.requestFinalizer.automateTask(data.requestId, response.responseId);
            // If the task was successfully submitted to gelato we can set the cache
            console.log(
              `task created for requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response}${TEXT_COLOR_RESET}, saving to cache`
            );

            // 3- Save to cache
            await this.scriptsCache.setFinalizeRequestTaskCreated(data.requestId);
            // Continue with the next request
            continue;
          } catch (error) {
            console.log(
              `error simulating finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response}${TEXT_COLOR_RESET}`
            );
          }
        }

        // If creating the task with the responses failed we try to create the task without the responseId
        try {
          // simulate the task -> create the gelato task -> save to cache the task created
          // 1- Simulate
          await sdk.helpers.callStatic('finalize(bytes32)', data.requestId);
          console.log(
            `simulated successfully finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}`
          );

          // 2- Create the task in gelato
          // this.requestFinalizer.automateTask(data.requestId);
          // If the task was successfully submitted to gelato we can set the cache
          console.log(
            `task created for requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}, saving to cache`
          );

          // 3- Save to cache
          await this.scriptsCache.setFinalizeRequestTaskCreated(data.requestId);
          continue;
        } catch (error) {
          firstNonFinalizedRequest = Math.min(firstNonFinalizedRequest, index - 1);
          console.log(
            `error simulating finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}`
          );
        }
      }
    }

    if (firstNonFinalizedRequest != Number.MAX_SAFE_INTEGER) {
      console.log('saving firstNonFinalizedRequest', firstNonFinalizedRequest);
      await this.scriptsCache.setFirstNonFinalizedRequestIndex(firstNonFinalizedRequest);
    }

    console.log('firstNonFinalizedRequest', firstNonFinalizedRequest);
  }

  public async run() {
    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;

    const sdk = new ProphetSDK(runner, address.deployed.ORACLE);
    let firstNonFinalizedRequest = await this.scriptsCache.getFirstNonFinalizedRequestIndex();
    firstNonFinalizedRequest = firstNonFinalizedRequest ? firstNonFinalizedRequest : 0;

    console.log('firstNonFinalizedRequest', firstNonFinalizedRequest);

    // First we have to get the total requests count
    const totalRequests = await sdk.helpers.totalRequestCount();
    console.log('totalRequests', totalRequests);

    // Then we have to calculate how many call to the oracle to get the requests
    const totalCalls = Math.ceil(Number(totalRequests) / PAGE_SIZE);
    console.log('totalCalls', totalCalls);
    const startingPage = Math.floor(firstNonFinalizedRequest / PAGE_SIZE);
    console.log('startingPage', startingPage);

    let requestsData: RequestForFinalizeData[] = [];

    // Then we loop over the pages
    for (let i = startingPage; i < totalCalls; i++) {
      console.log('getting requests', i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE);
      let j = TRIES;
      do {
        try {
          requestsData = [...requestsData, ...(await this.listRequests(sdk, i, PAGE_SIZE))];
          if (firstNonFinalizedRequest >= i * PAGE_SIZE && firstNonFinalizedRequest <= i * PAGE_SIZE + PAGE_SIZE) {
            if (firstNonFinalizedRequest > PAGE_SIZE) {
              requestsData = requestsData.slice(firstNonFinalizedRequest - PAGE_SIZE * i, requestsData.length);
            } else {
              requestsData = requestsData.slice(firstNonFinalizedRequest, requestsData.length);
            }
          }

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
    }

    requestsData = requestsData.slice(0, Number(totalRequests) - firstNonFinalizedRequest);
    await this.processRequestData(sdk, requestsData, firstNonFinalizedRequest);
  }
}
