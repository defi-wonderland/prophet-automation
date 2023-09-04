import { AutomateSDK, TaskTransaction } from '@gelatonetwork/automate-sdk';
import config from '../config/config';
import hre from 'hardhat';
import { abi as IOracleAbi } from 'opoo-core-abi/abi/IOracle.json';
import { address } from '../constants';

export class FinalizeRequest {
  async automateTask(requestId: string): Promise<TaskTransaction>;
  async automateTask(requestId: string, responseId: string): Promise<TaskTransaction>;

  public async automateTask(requestId: string, responseId?: string): Promise<TaskTransaction> {
    const [signer] = await hre.ethers.getSigners();
    const automate = new AutomateSDK(config.CHAIN_ID, signer);

    const oracleContract = new hre.ethers.Contract(address.deployed.ORACLE, IOracleAbi, signer);

    const method = responseId ? 'finalize(bytes32)' : 'finalize(bytes32,bytes32)';
    const functionData = responseId ? [requestId] : [requestId, responseId];
    const name = responseId
      ? `Finalize Request: ${requestId}`
      : `Finalize Request: ${requestId} Response: ${responseId}`;

    const { taskId, tx }: TaskTransaction = await automate.createTask({
      execAddress: oracleContract.address, // TODO: change for gelatoRelay ask Ashi
      // address _job, bytes calldata _jobData, address _feeRecipient
      execSelector: oracleContract.interface.getSighash(method),
      //execData?: string;  [address(job), work(uint256 _counter) [_counter], msg.sender]
      execData: oracleContract.interface.encodeFunctionData('finalize', functionData),
      execAbi: oracleContract.interface.format('json') as string,
      name: name,
      dedicatedMsgSender: false,
      singleExec: true,
    });

    return { taskId, tx };
  }
}
