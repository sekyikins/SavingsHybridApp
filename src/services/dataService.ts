import { Transaction } from '../types';

class DataService {
  private storageKey = 'savings-transactions';

  getTransactions(): Transaction[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }

  addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Transaction {
    const transactions = this.getTransactions();
    const newTransaction: Transaction = {
      ...transaction,
      id: this.generateId(),
      userId: 'default-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: transaction.category || 'Other'
    };
    
    transactions.push(newTransaction);
    this.saveTransactions(transactions);
    return newTransaction;
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(tx => tx.id === id);
    
    if (index === -1) return null;
    
    transactions[index] = {
      ...transactions[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveTransactions(transactions);
    return transactions[index];
  }

  deleteTransaction(id: string): boolean {
    const transactions = this.getTransactions();
    const filteredTransactions = transactions.filter(tx => tx.id !== id);
    
    if (filteredTransactions.length === transactions.length) return false;
    
    this.saveTransactions(filteredTransactions);
    return true;
  }

  getTransactionsInRange(startDate: Date, endDate: Date): Transaction[] {
    const transactions = this.getTransactions();
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
  }

  private saveTransactions(transactions: Transaction[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

const dataService = new DataService();
export default dataService;
