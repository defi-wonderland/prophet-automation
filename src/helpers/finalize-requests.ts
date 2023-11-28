import hre from 'hardhat';
import { ProphetSDK } from '@defi-wonderland/prophet-sdk';
import { ContractRunner } from 'ethers-v6';
import { PAGE_SIZE, TEXT_COLOR_GREEN, TEXT_COLOR_RESET, TRIES, address } from '../constants';
import { TasksCache } from '../utils/tasks-cache';
import { FinalizeRequest } from '../gelato-task-creation/finalize-request';
import { sleep } from '../utils/utils';
import { RequestForFinalizeData } from '@defi-wonderland/prophet-sdk/dist/src/types';
import { IOracle } from '@defi-wonderland/prophet-sdk/dist/src/types/typechain';

export class FinalizeRequests {
  private scriptsCache: TasksCache = new TasksCache();
  private requestFinalizer = new FinalizeRequest();

  public async run() {
    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;

    const sdk = new ProphetSDK(runner, address.deployed.ORACLE, {});
    let firstNonFinalizedRequest = await this.scriptsCache.getFirstNonFinalizedRequestIndex();
    firstNonFinalizedRequest = firstNonFinalizedRequest ? firstNonFinalizedRequest : 0;

    console.log('firstNonFinalizedRequest', firstNonFinalizedRequest);

    // Get the total requests count
    const totalRequests = await sdk.helpers.totalRequestCount();
    console.log('totalRequests', totalRequests);

    // Calculate how many call to the oracle to get the requests
    const totalCalls = Math.ceil(Number(totalRequests) / PAGE_SIZE);
    console.log('totalCalls', totalCalls);
    const startingPage = Math.floor(firstNonFinalizedRequest / PAGE_SIZE);
    console.log('startingPage', startingPage);

    let requestsData: RequestForFinalizeData[] = [];

    // Loop over the pages
    for (let i = startingPage; i < totalCalls; i++) {
      console.log('getting requests', i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE);
      let j = TRIES;
      do {
        try {
          requestsData = [...requestsData, ...(await this.listRequests(sdk, i * PAGE_SIZE, PAGE_SIZE))].filter(
            (data) => data.requestId != address.ZERO
          );

          if (firstNonFinalizedRequest >= i * PAGE_SIZE && firstNonFinalizedRequest <= i * PAGE_SIZE + PAGE_SIZE) {
            if (firstNonFinalizedRequest > PAGE_SIZE) {
              requestsData = requestsData.slice(firstNonFinalizedRequest - PAGE_SIZE * i, requestsData.length);
            } else {
              requestsData = requestsData.slice(firstNonFinalizedRequest, requestsData.length);
            }
          }

          console.log('requestsData', requestsData.length);

          // If the requests are retrieved successfully, break the loop
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

    await this.processRequestData(sdk, requestsData, firstNonFinalizedRequest);
  }

  private async processRequestData(sdk: ProphetSDK, requestData: RequestForFinalizeData[], startingIndex: number) {
    console.log('processing request data', requestData.length);
    let firstNonFinalizedRequest = Number.MAX_SAFE_INTEGER;
    let index = startingIndex;

    for (const data of requestData) {
      const finalized = data.finalizedAt != 0;

      if ((await this.scriptsCache.isFinalizeRequestTaskCreated(data.requestId.toString())) || finalized) {
        console.log(
          `task already created or finalized for requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET}`
        );
      } else {
        for (const response of data.responses) {
          const requestStruct: IOracle.RequestStruct = (
            await sdk.helpers.getRequest(data.requestId, Number(data.requestCreatedAt))
          ).request;
          const responseStruct: IOracle.ResponseStruct = (
            await sdk.helpers.getResponse(response.responseId, Number(response.responseCreatedAt))
          ).response;
          try {
            // simulate the task -> create the gelato task -> save to cache the task created
            // 1- Simulate
            await sdk.helpers.callStatic('finalize', requestStruct, responseStruct);

            console.log(
              `simulated successfully finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response.responseId}${TEXT_COLOR_RESET}`
            );

            // 2- Create the task in gelato
            this.requestFinalizer.automateTask(requestStruct, responseStruct);

            // If the task was successfully submitted to gelato we can set the cache
            console.log(
              `task created for requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response.responseId}${TEXT_COLOR_RESET}, saving to cache`
            );

            // 3- Save to cache
            await this.scriptsCache.setFinalizeRequestTaskCreated(data.requestId.toString());
            break;
          } catch (error) {
            console.log(
              `error simulating finalize request with requestId: ${TEXT_COLOR_GREEN}${data.requestId}${TEXT_COLOR_RESET} and responseId: ${TEXT_COLOR_GREEN}${response}${TEXT_COLOR_RESET}`
            );
          }
        }
      }

      ++index;
    }

    firstNonFinalizedRequest = firstNonFinalizedRequest == Number.MAX_SAFE_INTEGER ? index : firstNonFinalizedRequest;

    console.log('firstNonFinalizedRequest', firstNonFinalizedRequest);
    await this.scriptsCache.setFirstNonFinalizedRequestIndex(firstNonFinalizedRequest);
  }

  private async listRequests(sdk: ProphetSDK, startIndex: number, amount: number): Promise<RequestForFinalizeData[]> {
    const requests = await sdk.batching.listRequestsForFinalize(startIndex, amount);
    return requests;
  }
}
