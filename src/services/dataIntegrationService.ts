/**
 * Data Integration Service
 * Centralizes data flow between Home, Calendar, and Progress pages
 * Ensures consistent data across all components
 */

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Transaction } from '../config/supabase';
import { logger } from '../utils/debugLogger';

export interface DayData {
  date: string;
  deposits: number;
  withdrawals: number;
  netAmount: number;
  transactionCount: number;
  transactions: Transaction[];
}

export interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;
  totalDeposits: number;
  totalWithdrawals: number;
  netAmount: number;
  dailyAverage: number;
  transactionCount: number;
  daysPassed: number;
  daysWithActivity: number;
}

export interface MonthlyStats {
  monthStart: Date;
  monthEnd: Date;
  totalDeposits: number;
  totalWithdrawals: number;
  netAmount: number;
  dailyAverage: number;
  transactionCount: number;
  daysPassed: number;
  daysWithActivity: number;
}

class DataIntegrationService {
  private static instance: DataIntegrationService;
  private cachedData: Map<string, DayData> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): DataIntegrationService {
    if (!DataIntegrationService.instance) {
      DataIntegrationService.instance = new DataIntegrationService();
    }
    return DataIntegrationService.instance;
  }

  /**
   * Get day data with caching to prevent "jump to today" inconsistencies
   */
  getDayData(date: string, transactions: Transaction[]): DayData {
    const cacheKey = `day_${date}`;
    const now = Date.now();
    
    // Check if we have valid cached data
    if (this.cachedData.has(cacheKey) && 
        this.cacheExpiry.has(cacheKey) && 
        this.cacheExpiry.get(cacheKey)! > now) {
      logger.data('Using cached day data', { date, source: 'cache' });
      return this.cachedData.get(cacheKey)!;
    }

    // Calculate fresh data
    const targetDate = new Date(date);
    const dateStr = targetDate.toISOString().split('T')[0];

    logger.data('Processing day data', { 
      inputDate: date, 
      targetDateStr: dateStr, 
      totalTransactions: transactions.length,
      sampleTransactionDates: transactions.slice(0, 3).map(tx => ({
        id: tx.id,
        transaction_date: tx.transaction_date,
        parsedDate: new Date(tx.transaction_date).toISOString().split('T')[0],
        type: tx.transaction_type,
        amount: tx.amount
      }))
    });

    const dayTransactions = transactions.filter(tx => {
      const txDateStr = new Date(tx.transaction_date).toISOString().split('T')[0];
      const matches = txDateStr === dateStr;
      if (matches) {
        logger.data('Transaction matches date', { 
          txId: tx.id, 
          txDate: tx.transaction_date, 
          txDateStr, 
          targetDateStr: dateStr,
          type: tx.transaction_type,
          amount: tx.amount
        });
      }
      return matches;
    });

    logger.data('Filtered transactions for date', { 
      date: dateStr, 
      matchingTransactions: dayTransactions.length,
      transactions: dayTransactions.map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        amount: tx.amount,
        date: tx.transaction_date
      }))
    });

    const deposits = dayTransactions
      .filter(tx => tx.transaction_type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const withdrawals = dayTransactions
      .filter(tx => tx.transaction_type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const dayData: DayData = {
      date,
      deposits,
      withdrawals,
      netAmount: deposits - withdrawals,
      transactionCount: dayTransactions.length,
      transactions: dayTransactions
    };

    // Cache the data
    this.cachedData.set(cacheKey, dayData);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

    logger.data('Calculated fresh day data', { 
      date, 
      deposits, 
      withdrawals, 
      netAmount: deposits - withdrawals,
      transactionCount: dayTransactions.length 
    });

    return dayData;
  }

  /**
   * Get weekly statistics
   */
  getWeeklyStats(weekStart: Date, transactions: Transaction[]): WeeklyStats {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    const weekTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return txDate >= weekStart && txDate <= weekEnd;
    });

    const totalDeposits = weekTransactions
      .filter(tx => tx.transaction_type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalWithdrawals = weekTransactions
      .filter(tx => tx.transaction_type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const now = new Date();
    const daysPassed = Math.min(
      Math.ceil((Math.min(now.getTime(), weekEnd.getTime()) - weekStart.getTime()) / (1000 * 60 * 60 * 24)),
      7
    );

    // Count days with activity
    const daysWithActivity = new Set(
      weekTransactions.map(tx => new Date(tx.transaction_date).toDateString())
    ).size;

    const stats: WeeklyStats = {
      weekStart,
      weekEnd,
      totalDeposits,
      totalWithdrawals,
      netAmount: totalDeposits - totalWithdrawals,
      dailyAverage: daysPassed > 0 ? totalDeposits / daysPassed : 0,
      transactionCount: weekTransactions.length,
      daysPassed,
      daysWithActivity
    };

    logger.data('Calculated weekly stats', {
      weekStart: weekStart.toISOString().split('T')[0],
      totalDeposits,
      totalWithdrawals,
      transactionCount: weekTransactions.length
    });

    return stats;
  }

  /**
   * Get monthly statistics
   */
  getMonthlyStats(monthStart: Date, transactions: Transaction[]): MonthlyStats {
    const monthEnd = endOfMonth(monthStart);
    
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    const totalDeposits = monthTransactions
      .filter(tx => tx.transaction_type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalWithdrawals = monthTransactions
      .filter(tx => tx.transaction_type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const now = new Date();
    const daysPassed = Math.min(
      Math.ceil((Math.min(now.getTime(), monthEnd.getTime()) - monthStart.getTime()) / (1000 * 60 * 60 * 24)),
      monthEnd.getDate()
    );

    // Count days with activity
    const daysWithActivity = new Set(
      monthTransactions.map(tx => new Date(tx.transaction_date).toDateString())
    ).size;

    const stats: MonthlyStats = {
      monthStart,
      monthEnd,
      totalDeposits,
      totalWithdrawals,
      netAmount: totalDeposits - totalWithdrawals,
      dailyAverage: daysPassed > 0 ? totalDeposits / daysPassed : 0,
      transactionCount: monthTransactions.length,
      daysPassed,
      daysWithActivity
    };

    logger.data('Calculated monthly stats', {
      monthStart: monthStart.toISOString().split('T')[0],
      totalDeposits,
      totalWithdrawals,
      transactionCount: monthTransactions.length
    });

    return stats;
  }

  /**
   * Clear cache for a specific date or all cache
   */
  clearCache(date?: string) {
    if (date) {
      const cacheKey = `day_${date}`;
      this.cachedData.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      logger.data('Cleared cache for date', { date });
    } else {
      this.cachedData.clear();
      this.cacheExpiry.clear();
      logger.data('Cleared all cache');
    }
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cacheExpiry.forEach((expiry, key) => {
      if (expiry <= now) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cachedData.delete(key);
      this.cacheExpiry.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.data('Cleaned expired cache entries', { count: expiredKeys.length });
    }
  }

  /**
   * Get current week start for consistent week calculations
   */
  getCurrentWeekStart(date: Date = new Date()): Date {
    return startOfWeek(date, { weekStartsOn: 1 }); // Monday start
  }

  /**
   * Get current month start for consistent month calculations
   */
  getCurrentMonthStart(date: Date = new Date()): Date {
    return startOfMonth(date);
  }
}

export const dataIntegrationService = DataIntegrationService.getInstance();
export default dataIntegrationService;
