import { Transaction, TransactionType, UserProfile } from '../types/mock';
import {
  getCurrentUser,
  getUserTransactions,
  addTransaction as mockAddTransaction,
  updateUserTargets as mockUpdateUserTargets,
  getTransactionsInRange as mockGetTransactionsInRange
} from '../mock/data/mockData';

class DataService {
  // User Methods
  getCurrentUser = (): UserProfile => {
    return getCurrentUser();
  };

  updateUserTargets = (targets: { monthlyTarget?: number; weeklyTarget?: number }) => {
    const user = this.getCurrentUser();
    return mockUpdateUserTargets(user.id, targets);
  };

  // Transaction Methods
  getTransactions = (): Transaction[] => {
    const user = this.getCurrentUser();
    return getUserTransactions(user.id);
  };

  addTransaction = (transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Transaction => {
    const user = this.getCurrentUser();
    return mockAddTransaction({
      ...transaction,
      userId: user.id,
    });
  };

  getTransactionsInRange = (startDate: Date, endDate: Date): Transaction[] => {
    const user = this.getCurrentUser();
    return mockGetTransactionsInRange(user.id, startDate, endDate);
  };

  getTransactionsByType = (type: TransactionType): Transaction[] => {
    return this.getTransactions().filter(tx => tx.type === type);
  };

  getRecentTransactions = (limit: number = 5): Transaction[] => {
    return [...this.getTransactions()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  };

  // Analytics Methods
  getMonthlySummary = (date: Date = new Date()) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const transactions = this.getTransactionsInRange(startOfMonth, endOfMonth);
    
    const deposits = transactions
      .filter(tx => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const withdrawals = transactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    return {
      deposits,
      withdrawals,
      net: deposits - withdrawals,
      transactionCount: transactions.length
    };
  };
}

export default new DataService();
