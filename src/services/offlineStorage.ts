import { Preferences } from '@capacitor/preferences';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = 'offline_queue';
const SAVINGS_KEY_PREFIX = 'savings_';

interface OfflineOperation<T = any> {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: T;
  timestamp: number;
}

export const OfflineStorage = {
  // Add operation to the offline queue
  async addToQueue<T = any>(operation: Omit<OfflineOperation<T>, 'id' | 'timestamp'>): Promise<string> {
    const id = uuidv4();
    const queue = await this.getQueue();
    
    const newOperation: OfflineOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
    };
    
    queue.push(newOperation);
    await Preferences.set({
      key: QUEUE_KEY,
      value: JSON.stringify(queue)
    });
    
    return id;
  },
  
  // Get all operations from the queue
  async getQueue(): Promise<OfflineOperation[]> {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    return value ? JSON.parse(value) : [];
  },
  
  // Remove operation from the queue
  async removeFromQueue(operationId: string): Promise<void> {
    const queue = await this.getQueue();
    const newQueue = queue.filter(op => op.id !== operationId);
    
    await Preferences.set({
      key: QUEUE_KEY,
      value: JSON.stringify(newQueue)
    });
  },
  
  // Clear the entire queue
  async clearQueue(): Promise<void> {
    await Preferences.remove({ key: QUEUE_KEY });
  },
  
  // Save data locally
  async saveLocalData(key: string, data: any): Promise<void> {
    await Preferences.set({
      key: `${SAVINGS_KEY_PREFIX}${key}`,
      value: JSON.stringify(data)
    });
  },
  
  // Get local data
  async getLocalData<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ 
      key: `${SAVINGS_KEY_PREFIX}${key}` 
    });
    return value ? JSON.parse(value) : null;
  },
  
  // Clear all local data (for testing or logout)
  async clearAllData(): Promise<void> {
    const keys = (await Preferences.keys()).keys;
    const savingsKeys = keys.filter(key => key.startsWith(SAVINGS_KEY_PREFIX));
    
    await Promise.all([
      ...savingsKeys.map(key => Preferences.remove({ key })),
      this.clearQueue()
    ]);
  },
  
  // Process the offline queue when back online
  async processQueue<T = any>(processOperation: (op: OfflineOperation<T>) => Promise<boolean>): Promise<void> {
    const queue = await this.getQueue();
    const successfulOps: string[] = [];
    
    // Process operations in order
    for (const op of queue) {
      try {
        const success = await processOperation(op);
        if (success) {
          successfulOps.push(op.id);
        }
      } catch (error) {
        console.error('Error processing operation:', op, error);
      }
    }
    
    // Remove successful operations
    await Promise.all(
      successfulOps.map(id => this.removeFromQueue(id))
    );
  }
};

export default OfflineStorage;
