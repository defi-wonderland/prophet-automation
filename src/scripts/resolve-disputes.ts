import { ResolveDisputes } from '../helpers/resolve-disputes';

(async () => {
  const resolveDisputes = new ResolveDisputes();
  await resolveDisputes.run();
})();
