import { FinalizeRequests } from '../helpers/finalize-requests';

(async () => {
  const finalizeRequests = new FinalizeRequests();
  await finalizeRequests.run();
})();
