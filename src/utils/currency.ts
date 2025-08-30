const CURRENCY_SYMBOLS: { [key: string]: string } = {
  'GHS': '₵',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'NGN': '₦',
};

export function formatCurrency(amount: number, currencyCode?: string): string {
  const currency = currencyCode || getCurrencyFromSettings();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

function getCurrencyFromSettings(): string {
  try {
    const settings = localStorage.getItem('appSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.currency || 'GHS';
    }
  } catch (error) {
    console.error('Failed to get currency from settings:', error);
  }
  return 'GHS';
}
