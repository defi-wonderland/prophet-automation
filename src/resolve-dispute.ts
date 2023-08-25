import { AutomateSDK, TaskTransaction } from '@gelatonetwork/automate-sdk';
import config from './config/config';
import hre from 'hardhat';
import { abi as IResolutionModuleAbi } from 'opoo-core-abi/abi/IResolutionModule.json';

export class ResolveDispute {
  public async automateTask(resolutionModuleAddress: string, disputeId: string): Promise<TaskTransaction> {
    const signer = (await hre.ethers.getSigners())[0];
    const automate = new AutomateSDK(config.CHAIN_ID, signer);

    const resolutionContract = new hre.ethers.Contract(resolutionModuleAddress, IResolutionModuleAbi, signer);

    const { taskId, tx }: TaskTransaction = await automate.createTask({
      execAddress: resolutionContract.address, // gelatoRelay
      // address _job, bytes calldata _jobData, address _feeRecipient
      execSelector: resolutionContract.interface.getSighash('resolveDispute(bytes32)'), 
      //execData?: string;  [address(job), work(uint256 _counter) [_counter], msg.sender]
      execData: resolutionContract.interface.encodeFunctionData('resolveDispute', [disputeId]), 
      execAbi: resolutionContract.interface.format('json') as string,
      interval: 10 * 60, // execute every 10 minutes
      name: 'Automated resolveDispute every 10min',
      dedicatedMsgSender: false,
      singleExec: true
    });

    return { taskId, tx };
  }
}
