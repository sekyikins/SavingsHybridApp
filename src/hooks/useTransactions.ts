import { useState, useEffect, useCallback } from 'react';
import { isAfter, isBefore } from 'date-fns';
import dataService from '../services/dataService';
import { Transaction } from '../types/mock';

type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load transactions on mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = dataService.getTransactions();
        // Ensure transactions have required fields
        const processedTransactions = data.map(tx => ({
          ...tx,
          userId: tx.userId || 'default-user',
          createdAt: tx.createdAt || new Date().toISOString(),
          updatedAt: tx.updatedAt || new Date().toISOString(),
          category: tx.category || 'Other'
        }));
        setTransactions(processedTransactions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load transactions'));
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const addTransaction = useCallback(async (transaction: TransactionInput) => {
    try {
      const newTransaction = dataService.addTransaction(transaction);
      setTransactions(prev => [...prev, newTransaction]);
      return newTransaction;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add transaction'));
      throw err;
    }
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<TransactionInput>) => {
    try {
      // In a real implementation, we would call dataService.updateTransaction
      // For now, we'll just update the local state
      setTransactions(prev => 
        prev.map(tx => 
          tx.id === id ? { ...tx, ...updates, updatedAt: new Date().toISOString() } : tx
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update transaction'));
      throw err;
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      // In a real implementation, we would call dataService.deleteTransaction
      // For now, we'll just update the local state
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete transaction'));
      throw err;
    }
  }, []);

  const getTransactionsInRange = useCallback((startDate: Date, endDate: Date): Transaction[] => {
    return dataService.getTransactionsInRange(startDate, endDate);
  }, []);

  const getTransaction = useCallback((id: string): Transaction | undefined => {
    return transactions.find(tx => tx.id === id);
  }, [transactions]);

  const getTotalSavings = useCallback((): number => {
    return transactions.reduce((total, tx) => {
      return tx.type === 'deposit' 
        ? total + tx.amount 
        : total - tx.amount;
    }, 0);
  }, [transactions]);

  const getRecentTransactions = useCallback((limit: number = 5): Transaction[] => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }, [transactions]);

  const getUpcomingTransactions = useCallback((daysAhead: number = 7): Transaction[] => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return isAfter(txDate, today) && isBefore(txDate, futureDate);
    });
  }, [transactions]);

  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsInRange,
    getTransaction,
    getTotalSavings,
    getRecentTransactions,
    getUpcomingTransactions,
  };
};

export default useTransactions;
