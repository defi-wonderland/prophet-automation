import { AutomateSDK, TaskTransaction } from '@gelatonetwork/automate-sdk';
import config from '../config/config';
import hre from 'hardhat';
import { abi as IOracleAbi } from '@defi-wonderland/prophet-core-abi/abi/IOracle.json';
import { address } from '../constants';
import { IOracle } from '@defi-wonderland/prophet-sdk/dist/src/types/typechain';

export class FinalizeRequest {
  public async automateTask(
    request: IOracle.RequestStruct,
    response: IOracle.ResponseStruct
  ): Promise<TaskTransaction> {
    const [signer] = await hre.ethers.getSigners();
    const automate = new AutomateSDK(config.CHAIN_ID, signer);

    const oracleContract = new hre.ethers.Contract(address.deployed.ORACLE, IOracleAbi, signer);

    const method = 'finalize';
    const functionData = [request, response];
    const name = `Finalize Request: ${response.requestId}`;

    const { taskId, tx }: TaskTransaction = await automate.createTask({
      execAddress: oracleContract.address, 
      // address _job, bytes calldata _jobData, address _feeRecipient
      execSelector: oracleContract.interface.getSighash(method),
      //execData?: string;  [address(job), work(uint256 _counter) [_counter], msg.sender]
      execData: oracleContract.interface.encodeFunctionData(method, functionData),
      execAbi: oracleContract.interface.format('json') as string,
      name: name,
      dedicatedMsgSender: false,
      singleExec: true,
    });

    return { taskId, tx };
  }
}
