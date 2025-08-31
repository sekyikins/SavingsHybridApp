import { Transaction, UserProfile, MockDatabase } from '../../types/mock';
import { TransactionType } from '../../types/mock';

// Current date for reference
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

// Generate mock transactions for the current month
const generateMonthlyTransactions = (userId: string, count: number = 15): Transaction[] => {
  const transactions: Transaction[] = [];
  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Other'];
  const types: TransactionType[] = ['deposit', 'withdrawal'];

  for (let i = 0; i < count; i++) {
    const isDeposit = Math.random() > 0.7; // 30% chance of deposit
    const amount = isDeposit 
      ? Math.floor(Math.random() * 500) + 100 // 100-600 for deposits
      : Math.floor(Math.random() * 200) + 5;  // 5-205 for withdrawals

    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(currentYear, currentMonth, now.getDate() - daysAgo);

    transactions.push({
      id: `tx-${Date.now()}-${i}`,
      userId,
      amount,
      type: isDeposit ? 'deposit' : 'withdrawal',
      category: categories[Math.floor(Math.random() * categories.length)],
      date: date.toISOString(),
      description: `${isDeposit ? 'Deposit' : 'Expense'} for ${categories[Math.floor(Math.random() * categories.length)]}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return transactions;
};

// Mock database
const mockDatabase: MockDatabase = {
  users: {
    'user-1': {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      monthlyTarget: 4000,
      weeklyTarget: 1000,
      currency: 'USD',
    },
  },
  transactions: [],
};

// Generate transactions for the mock user
mockDatabase.transactions = generateMonthlyTransactions('user-1', 30);

// Add some consistent data for better demo
mockDatabase.transactions.push(
  // Today's transactions
  {
    id: 'tx-today-1',
    userId: 'user-1',
    amount: 200,
    type: 'deposit',
    category: 'Salary',
    date: now.toISOString(),
    description: 'Monthly salary',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'tx-today-2',
    userId: 'user-1',
    amount: 25.5,
    type: 'withdrawal',
    category: 'Food',
    date: now.toISOString(),
    description: 'Lunch at cafe',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
);

// Helper functions
export const getCurrentUser = (): UserProfile => {
  return mockDatabase.users['user-1'];
};

export const getUserTransactions = (userId: string): Transaction[] => {
  return mockDatabase.transactions.filter(tx => tx.userId === userId);
};

export const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction => {
  const newTransaction: Transaction = {
    ...transaction,
    id: `tx-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  mockDatabase.transactions.push(newTransaction);
  return newTransaction;
};

export const updateUserTargets = (userId: string, { monthlyTarget, weeklyTarget }: { monthlyTarget?: number; weeklyTarget?: number }) => {
  const user = mockDatabase.users[userId];
  if (!user) return null;
  
  if (monthlyTarget !== undefined) user.monthlyTarget = monthlyTarget;
  if (weeklyTarget !== undefined) user.weeklyTarget = weeklyTarget;
  
  return user;
};

export const getTransactionsInRange = (userId: string, startDate: Date, endDate: Date): Transaction[] => {
  return mockDatabase.transactions.filter(tx => {
    if (tx.userId !== userId) return false;
    const txDate = new Date(tx.date);
    return txDate >= startDate && txDate <= endDate;
  });
};

export default mockDatabase;
