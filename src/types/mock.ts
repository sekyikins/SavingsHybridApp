export interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  date: string;
  description: string;
  category?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsRecord {
  id: string;
  userId: string;
  date: string;
  amount: number;
  saved: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  reminderTime?: string;
  createdAt: string;
  updatedAt: string;
}
