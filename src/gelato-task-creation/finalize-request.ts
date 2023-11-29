import hre from 'hardhat';
import { abi as IOracleAbi } from '@defi-wonderland/prophet-core-abi/abi/IOracle.json';
import { address } from '../constants';
import { IOracle } from '@defi-wonderland/prophet-sdk/dist/src/types/typechain';
import { GelatoRelay, RelayResponse, SponsoredCallRequest } from '@gelatonetwork/relay-sdk';
import { ethers, ContractRunner } from 'ethers-v6';

export class FinalizeRequest {
  public async automateTask(
    request: IOracle.RequestStruct,
    response: IOracle.ResponseStruct
  ): Promise<RelayResponse> {
    const [signer] = await hre.ethers.getSigners();
    const runner = signer as unknown as ContractRunner;
    const relay = new GelatoRelay();
    const oracleContract: ethers.Contract = new ethers.Contract(address.deployed.ORACLE, IOracleAbi, runner);;
    const { data } = await oracleContract.finalize.populateTransaction(request, response);
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
