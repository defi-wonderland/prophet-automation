import { LoopRequests } from '../helpers/loop-requests';

(async () => {
  const loopRequests = new LoopRequests();
  await loopRequests.loopRequests();
})();
