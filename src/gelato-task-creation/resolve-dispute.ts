import { AutomateSDK, TaskTransaction } from '@gelatonetwork/automate-sdk';
import config from '../config/config';
import hre from 'hardhat';
import { abi as IOracleAbi } from '@defi-wonderland/prophet-core-abi/abi/IOracle.json';
import { address } from '../constants';
import { IOracle } from '@defi-wonderland/prophet-sdk/dist/src/types/typechain';
import { DisputeWithId } from '@defi-wonderland/prophet-sdk';

export class ResolveDispute {
  public async automateTask(
    request: IOracle.RequestStruct,
    response: IOracle.ResponseStruct,
    disputeWithId: DisputeWithId
  ): Promise<TaskTransaction> {
    const [signer] = await hre.ethers.getSigners();
    const automate = new AutomateSDK(config.CHAIN_ID, signer);

    const oracleContract = new hre.ethers.Contract(address.deployed.ORACLE, IOracleAbi, signer);

    const { taskId, tx }: TaskTransaction = await automate.createTask({
      execAddress: oracleContract.address, 
      // address _job, bytes calldata _jobData, address _feeRecipient
      execSelector: oracleContract.interface.getSighash('resolveDispute(bytes32)'),
      //execData?: string;  [address(job), work(uint256 _counter) [_counter], msg.sender]
      execData: oracleContract.interface.encodeFunctionData('resolveDispute', [
        request,
        response,
        disputeWithId.dispute,
      ]),
      execAbi: oracleContract.interface.format('json') as string,
      name: `Resolve Dispute ${disputeWithId.disputeId}`,
      dedicatedMsgSender: false,
      singleExec: true,
    });

    return { taskId, tx };
  }
}
