import { useState, useEffect, useCallback } from 'react';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

export interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  date: string;
  description: string;
  category?: string;
}

const STORAGE_KEY = 'savingsApp_transactions';

const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever transactions change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions(prev => [...prev, newTransaction]);
    return newTransaction;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => 
      prev.map(tx => 
        tx.id === id ? { ...tx, ...updates } : tx
      )
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  const getTransactionsInRange = useCallback((startDate: Date, endDate: Date) => {
    return transactions.filter(transaction => {
      const transactionDate = parseISO(transaction.date);
      return isWithinInterval(transactionDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      });
    });
  }, [transactions]);

  const getTransaction = useCallback((id: string) => {
    return transactions.find(tx => tx.id === id);
  }, [transactions]);

  const getTotalSavings = useCallback(() => {
    return transactions.reduce((total, tx) => {
      return tx.type === 'deposit' 
        ? total + tx.amount 
        : total - tx.amount;
    }, 0);
  }, [transactions]);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsInRange,
    getTransaction,
    getTotalSavings,
  };
};

export default useTransactions;
