import { LoopRequests } from '../helpers/loop-requests';

(async () => {
  const loopDisputes = new LoopRequests();
  await loopDisputes.loopRequests();
})();
