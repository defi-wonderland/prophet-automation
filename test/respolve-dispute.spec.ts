import { ResolveDispute } from '../src/gelato-task-creation/resolve-dispute';

describe('ResolveDispute', () => {
  it.only('resolve dispute', async () => {
    const resolveDispute = new ResolveDispute();
    const disputeId = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const result = await resolveDispute.automateTask(disputeId);
    console.log(result);
  });
});
