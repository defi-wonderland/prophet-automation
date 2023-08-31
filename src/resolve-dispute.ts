import { AutomateSDK, TaskTransaction } from '@gelatonetwork/automate-sdk';
import config from './config/config';
import hre from 'hardhat';
import { abi as IOracleAbi } from 'opoo-core-abi/abi/IOracle.json';

export class ResolveDispute {
  public async automateTask(oracleAddress: string, disputeId: string): Promise<TaskTransaction> {
    const signer = (await hre.ethers.getSigners())[0];
    const automate = new AutomateSDK(config.CHAIN_ID, signer);

    const oracleContract = new hre.ethers.Contract(oracleAddress, IOracleAbi, signer);

    const { taskId, tx }: TaskTransaction = await automate.createTask({
      execAddress: oracleContract.address, //TODO: change for gelatoRelay ask Ashi
      // address _job, bytes calldata _jobData, address _feeRecipient
      execSelector: oracleContract.interface.getSighash('resolveDispute(bytes32)'),
      //execData?: string;  [address(job), work(uint256 _counter) [_counter], msg.sender]
      execData: oracleContract.interface.encodeFunctionData('resolveDispute', [disputeId]),
      execAbi: oracleContract.interface.format('json') as string,
      name: `Resolve Dispute ${disputeId}`,
      dedicatedMsgSender: false,
      singleExec: true,
    });

    return { taskId, tx };
  }
}
