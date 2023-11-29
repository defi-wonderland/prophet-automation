import hre from 'hardhat';
import { abi as IOracleAbi } from '@defi-wonderland/prophet-core-abi/abi/IOracle.json';
import { address } from '../constants';
import { IOracle } from '@defi-wonderland/prophet-sdk/dist/src/types/typechain';
import { DisputeWithId } from '@defi-wonderland/prophet-sdk';
import { GelatoRelay, RelayResponse, SponsoredCallRequest } from '@gelatonetwork/relay-sdk';
import { ethers, ContractRunner } from 'ethers-v6';

export class ResolveDispute {
  public async automateTask(
    request: IOracle.RequestStruct,
    response: IOracle.ResponseStruct,
    disputeWithId: DisputeWithId
  ): Promise<RelayResponse> {
    const [signer] = await hre.ethers.getSigners();
    const relay = new GelatoRelay();
    const runner = signer as unknown as ContractRunner;
    const oracleContract = new ethers.Contract(address.deployed.ORACLE, IOracleAbi, runner);

    const { data } = await oracleContract.resolveDispute.populateTransaction(request, response, disputeWithId.dispute);
    const gelatoRequest: SponsoredCallRequest = {
      chainId: BigInt(hre.network.config.chainId),
      target: address.deployed.ORACLE,
      data: data,
    };

    const apiKey = process.env.GELATO_API_KEY;
    const relayResponse = await relay.sponsoredCall(gelatoRequest, apiKey);

    return relayResponse;
  }
}
