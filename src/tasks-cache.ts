import cacache from 'cacache';

const RESOLVE_DISPUTE_PREFIX = 'resolve_dispute_';
const FINALIZE_REQUEST_PREFIX = 'finalize_request_';

const cachePath = './tasks-cache';

export class TasksCache implements ITaskCache {
  public async setDisputeTaskCreated(disputeId: string): Promise<void> {
    const key = RESOLVE_DISPUTE_PREFIX.concat(disputeId);
    const value = 'true';
    try {
      await cacache.put(cachePath, key, value);
      console.info(`Saved value "${value}" with key "${key}" to cache.`);
    } catch (error) {
      console.error('Error saving key-value pair:', error);
    }
  }

  public async isDisputeTaskCreated(disputeId: string): Promise<boolean> {
    const key = RESOLVE_DISPUTE_PREFIX.concat(disputeId);
    try {
      const cachedValue = await cacache.get(cachePath, key);
      return cachedValue.data.toString() == 'true';
    } catch (error) {
      return false;
    }
  }

  public async setFinalizeRequestTaskCreated(requestId: string, responseId?: string) {
    const key = responseId
      ? FINALIZE_REQUEST_PREFIX.concat(requestId).concat('_').concat(responseId)
      : FINALIZE_REQUEST_PREFIX.concat(requestId);
    const value = 'true';
    try {
      await cacache.put(cachePath, key, value);
      console.log(`Saved value "${value}" with key "${key}" to cache.`);
    } catch (error) {
      console.error('Error saving key-value pair:', error);
    }
  }

  public async isFinalizeRequestTaskCreated(requestId: string, responseId?: string): Promise<boolean> {
    const key = responseId
      ? FINALIZE_REQUEST_PREFIX.concat(requestId).concat('_').concat(responseId)
      : FINALIZE_REQUEST_PREFIX.concat(requestId);
    try {
      const cachedValue = await cacache.get(cachePath, key);
      return cachedValue.data.toString() == 'true';
    } catch (error) {
      return false;
    }
  }
}

interface ITaskCache {
  setDisputeTaskCreated(disputeId: string): Promise<void>;
  isDisputeTaskCreated(disputeId: string): Promise<boolean>;
  setFinalizeRequestTaskCreated(requestId: string): Promise<void>;
  setFinalizeRequestTaskCreated(requestId: string, responseId: string): Promise<void>;
  isFinalizeRequestTaskCreated(requestId: string): Promise<boolean>;
  isFinalizeRequestTaskCreated(requestId: string, responseId: string): Promise<boolean>;
}
