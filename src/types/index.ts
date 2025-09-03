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
