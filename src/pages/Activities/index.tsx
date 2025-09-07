import React, { useState, useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonText,
  IonButton,
  IonDatetime,
  IonModal,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  IonSpinner
} from '@ionic/react';
import {
  calendarOutline,
  trendingUpOutline,
  trendingDownOutline,
  timeOutline,
  cashOutline,
} from 'ionicons/icons';
import { format, isToday, isYesterday, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';
import useTransactions from '../../hooks/useTransactions';
import { Transaction } from '../../config/supabase';
import { logger } from '../../utils/debugLogger';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency } from '../../utils/currencyUtils';
import './Activities.css';

const Activities: React.FC = () => {
  const { transactions, refreshTransactions, isLoading } = useTransactions();
  const { settings: userSettings } = useSettings();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  // Sort transactions by date (newest first) and filter
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === filterType);
    }

    // Filter by search text (amount or description)
    if (searchText) {
      filtered = filtered.filter(t => 
        t.amount.toString().includes(searchText) ||
        (t.description && t.description.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // Filter by selected date
    if (selectedDate) {
      const targetDate = parseISO(selectedDate);
      const startOfTargetDay = startOfDay(targetDate);
      const endOfTargetDay = endOfDay(targetDate);
      
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= startOfTargetDay && transactionDate <= endOfTargetDay;
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, filterType, searchText, selectedDate]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    filteredTransactions.forEach(transaction => {
      const dateKey = format(new Date(transaction.transaction_date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });

    return groups;
  }, [filteredTransactions]);

  const handleDateChange = (e: CustomEvent) => {
    setSelectedDate(e.detail.value);
    setShowDatePicker(false);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d, yyyy');
  };

  const getTotalForDate = (transactions: Transaction[]) => {
    return transactions.reduce((sum, t) => {
      return t.transaction_type === 'deposit' ? sum + t.amount : sum - t.amount;
    }, 0);
  };

  const handleRefresh = async (event: CustomEvent) => {
    logger.navigation('Pull-to-refresh triggered on Activities page');
    try {
      await refreshTransactions();
      logger.navigation('Activities page data refreshed successfully');
    } catch (error) {
      logger.error('Error refreshing Activities page data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      event.detail.complete();
    }
  };

  // Show loading state while transactions are being loaded
  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>Activities</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <div style={{ textAlign: 'center' }}>
              <IonSpinner name="crescent" />
              <p>Loading activities...</p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>All Activities</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={() => setShowDatePicker(true)}>
              <IonIcon icon={calendarOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon="chevron-down-circle-outline"
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>

        {/* Search and Filter Controls */}
        <div className="controls-section">
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Search by amount or description..."
            showClearButton="focus"
          />

          <div className="filter-controls">
            <IonSegment
              value={filterType}
              onIonChange={(e) => setFilterType(e.detail.value as any)}
            >
              <IonSegmentButton value="all">
                <IonLabel>All</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="deposit">
                <IonLabel>Deposits</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="withdrawal">
                <IonLabel>Withdrawals</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {selectedDate && (
              <IonChip onClick={clearDateFilter}>
                <IonIcon icon={calendarOutline} />
                <IonLabel>{format(parseISO(selectedDate), 'MMM d, yyyy')}</IonLabel>
              </IonChip>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="summary-stats">
          <div className="stat-card">
            <IonText color="medium">Total Transactions</IonText>
            <IonText className="stat-number">{filteredTransactions.length}</IonText>
          </div>
          <div className="stat-card">
            <IonText color="medium">Net Amount</IonText>
            <IonText 
              className="stat-number"
              color={filteredTransactions.reduce((sum, t) => 
                t.transaction_type === 'deposit' ? sum + t.amount : sum - t.amount, 0) >= 0 ? 'success' : 'danger'}
            >
              {formatCurrency(filteredTransactions.reduce((sum, t) => 
                t.transaction_type === 'deposit' ? sum + t.amount : sum - t.amount, 0), userSettings?.currency, { showSymbol: true })}
            </IonText>
          </div>
        </div>

        {/* Transactions List */}
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={cashOutline} size="large" color="medium" />
            <IonText color="medium">
              <h3>No transactions found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </IonText>
          </div>
        ) : (
          <div className="transactions-container">
            {Object.entries(groupedTransactions).map(([dateKey, dayTransactions]) => {
              const dayTotal = getTotalForDate(dayTransactions);
              
              return (
                <div key={dateKey} className="date-group">
                  <div className="date-header">
                    <div className="date-info">
                      <IonText className="date-label">
                        {getDateLabel(dateKey)}
                      </IonText>
                      <IonText color="medium" className="date-full">
                        {format(parseISO(dateKey), 'MMM d, yyyy')}
                      </IonText>
                    </div>
                    <div className="day-total">
                      <IonText color="medium" className="transaction-count">
                        {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''}
                      </IonText>
                      <IonText color={dayTotal >= 0 ? 'success' : 'danger'}>
                        {formatCurrency(dayTotal, userSettings?.currency, { showSymbol: true })}
                      </IonText>
                    </div>
                  </div>

                  <IonList className="transactions-list">
                    {dayTransactions.map((transaction, index) => (
                      <IonItem key={`${transaction.id}-${index}`} className="transaction-item">
                        <IonIcon
                          icon={transaction.transaction_type === 'deposit' ? trendingUpOutline : trendingDownOutline}
                          color={transaction.transaction_type === 'deposit' ? 'success' : 'danger'}
                          slot="start"
                        />
                        
                        <IonLabel>
                          <div className="transaction-main">
                            <div className="transaction-info">
                              <h3 className="transaction-type">
                                {transaction.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                              </h3>
                              {transaction.description && (
                                <p className="transaction-description">{transaction.description}</p>
                              )}
                            </div>
                            <div className="time-amount">
                              <div className="transaction-meta">
                                <IonIcon icon={timeOutline} />
                                <IonText color="medium">
                                  {(() => {
                                    const transactionDate = new Date(transaction.transaction_date);
                                    return isValid(transactionDate) 
                                  ? format(transactionDate, 'h:mm a')
                                  : 'Invalid date';
                                  })()}
                                </IonText>
                              </div>
                              <div className="transaction-amount">
                                <IonText 
                                  color={transaction.transaction_type === 'deposit' ? 'success' : 'danger'}
                                  className="amount-text"
                                >
                                  {transaction.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount, userSettings?.currency, { showSymbol: true })}
                                </IonText>
                              </div>
                            </div>
                            
                          </div>
                          
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                </div>
              );
            })}
          </div>
        )}

        {/* Date Picker Modal */}
        <IonModal isOpen={showDatePicker} onDidDismiss={() => setShowDatePicker(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Select Date</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDatePicker(false)}>Done</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonDatetime
              presentation="date"
              onIonChange={handleDateChange}
              value={selectedDate || new Date().toISOString()}
              showDefaultButtons
              doneText="Select"
              cancelText="Cancel"
            />
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Activities;
