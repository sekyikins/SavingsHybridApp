import { useState, useEffect, useCallback } from 'react';
import { isAfter, isBefore } from 'date-fns';
import { databaseService } from '../services/databaseService';
import { Transaction } from '../config/supabase';
import { useAuth } from './useAuth';
import { logger } from '../utils/debugLogger';

type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'signed_amount'>;

const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load transactions on mount
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const loadTransactions = async () => {
      try {
        logger.data('Loading transactions', { userId: user.id });
        const data = await databaseService.getTransactions(user.id);
        setTransactions(data);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load transactions');
        logger.error('Failed to load transactions', error, { userId: user.id });
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [user]);

  const addTransaction = useCallback(async (transaction: TransactionInput) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      logger.data('Adding transaction', { type: transaction.transaction_type, amount: transaction.amount });
      const newTransaction = await databaseService.saveTransaction({
        ...transaction,
        user_id: user.id
      });
      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add transaction');
      logger.error('Failed to add transaction', error, { transaction });
      setError(error);
      throw error;
    }
  }, [user]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<TransactionInput>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      logger.data('Updating transaction', { id, updates });
      const updatedTransaction = await databaseService.saveTransaction({
        ...updates,
        id,
        user_id: user.id
      } as Transaction);
      
      setTransactions(prev => 
        prev.map(tx => tx.id === id ? updatedTransaction : tx)
      );
      return updatedTransaction;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update transaction');
      logger.error('Failed to update transaction', error, { id, updates });
      setError(error);
      throw error;
    }
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      logger.data('Deleting transaction', { id });
      await databaseService.deleteTransaction(id);
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete transaction');
      logger.error('Failed to delete transaction', error, { id });
      setError(error);
      throw error;
    }
  }, [user]);

  const getTransactionsInRange = useCallback((startDate: Date, endDate: Date): Transaction[] => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return txDate >= startDate && txDate <= endDate;
    });
  }, [transactions]);

  const getTransaction = useCallback((id: string): Transaction | undefined => {
    return transactions.find(tx => tx.id === id);
  }, [transactions]);

  const getTotalSavings = useCallback((): number => {
    return transactions.reduce((total, tx) => {
      return tx.transaction_type === 'deposit' 
        ? total + tx.amount 
        : total - tx.amount;
    }, 0);
  }, [transactions]);

  const getRecentTransactions = useCallback((limit: number = 5): Transaction[] => {
    return [...transactions]
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, limit);
  }, [transactions]);

  const getUpcomingTransactions = useCallback((daysAhead: number = 7): Transaction[] => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return transactions.filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return isAfter(txDate, today) && isBefore(txDate, futureDate);
    });
  }, [transactions]);

  const refreshTransactions = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const data = await databaseService.getTransactions(user.id);
      setTransactions(data);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh transactions');
      logger.error('Failed to refresh transactions', error, { userId: user.id });
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
    refreshTransactions,
  };
};

export default useTransactions;
