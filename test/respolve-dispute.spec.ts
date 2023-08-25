import { expect } from 'chai';
import { ResolveDispute } from '../src/resolve-dispute';
import { address } from '../src/constants';

describe('ResolveDispute', () => {
  it('resolve dispute', async () => {
    const resolveDispute = new ResolveDispute();
    const disputeId = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const result = await resolveDispute.automateTask(address.deployed.ERC20_RESOLUTION_MODULE, disputeId);
    console.log(result);
  });
});
