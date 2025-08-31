import { Transaction as BaseTransaction } from './index';

export type TransactionType = 'deposit' | 'withdrawal';

export interface Transaction extends BaseTransaction {
  userId: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  monthlyTarget: number;
  weeklyTarget: number;
  currency: string;
}

export interface MockDatabase {
  users: {
    [key: string]: UserProfile;
  };
  transactions: Transaction[];
}
