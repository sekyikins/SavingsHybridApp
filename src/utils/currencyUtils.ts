export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

export const CURRENCIES: Currency[] = [
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', decimalPlaces: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimalPlaces: 2 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimalPlaces: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', decimalPlaces: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimalPlaces: 2 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimalPlaces: 2 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', decimalPlaces: 2 },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', decimalPlaces: 2 },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', decimalPlaces: 3 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimalPlaces: 2 },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimalPlaces: 2 },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimalPlaces: 2 },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimalPlaces: 0 },
];

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find(currency => currency.code === code);
};

export const formatCurrency = (
  amount: number, 
  currencyCode: string = 'GHS', 
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimalPlaces?: number;
  } = {}
): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) {
    // Fallback for unknown currencies
    return `${amount.toFixed(2)} ${currencyCode}`;
  }

  const {
    showSymbol = true,
    showCode = false,
    decimalPlaces = currency.decimalPlaces
  } = options;

  const formattedAmount = amount.toFixed(decimalPlaces);
  
  let result = formattedAmount;
  
  if (showSymbol) {
    result = `${currency.symbol}${formattedAmount}`;
  }
  
  if (showCode) {
    result = showSymbol ? `${result} ${currency.code}` : `${formattedAmount} ${currency.code}`;
  }
  
  return result;
};

export const formatCurrencyCompact = (
  amount: number, 
  currencyCode: string = 'GHS'
): string => {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  
  if (Math.abs(amount) >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  } else if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(amount, currencyCode);
  }
};

export const parseCurrencyAmount = (value: string): number => {
  // Remove currency symbols and letters, keep only numbers, decimal points, and minus signs
  const cleanedValue = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? 0 : parsed;
};

export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  return currency?.symbol || currencyCode;
};

export const getCurrencyName = (currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  return currency?.name || currencyCode;
};
