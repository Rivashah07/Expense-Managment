// Currency utility functions

export interface Currency {
  currency: string;
  currencySymbol: string;
  name: string;
}

export function getPopularCurrencies(): Currency[] {
  return [
    { currency: 'USD', currencySymbol: '$', name: 'US Dollar' },
    { currency: 'EUR', currencySymbol: '€', name: 'Euro' },
    { currency: 'GBP', currencySymbol: '£', name: 'British Pound' },
    { currency: 'CAD', currencySymbol: 'C$', name: 'Canadian Dollar' },
    { currency: 'AUD', currencySymbol: 'A$', name: 'Australian Dollar' },
    { currency: 'JPY', currencySymbol: '¥', name: 'Japanese Yen' },
    { currency: 'CHF', currencySymbol: 'CHF', name: 'Swiss Franc' },
    { currency: 'CNY', currencySymbol: '¥', name: 'Chinese Yuan' },
  ];
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': 'Mex$',
    'ZAR': 'R',
    'SGD': 'S$',
    'AED': 'د.إ',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'NZD': 'NZ$',
    'KRW': '₩',
    'MYR': 'RM',
    'PHP': '₱',
    'THB': '฿',
    'IDR': 'Rp',
    'VND': '₫',
    'PLN': 'zł',
    'TRY': '₺',
    'RUB': '₽',
    'ARS': '$',
    'CLP': '$',
    'COP': '$',
    'PEN': 'S/',
    'EGP': 'E£',
    'NGN': '₦',
    'KES': 'KSh',
    'ILS': '₪',
    'SAR': '﷼',
    'QAR': '﷼',
    'KWD': 'د.ك',
    'HKD': 'HK$',
    'TWD': 'NT$',
    'BDT': '৳',
    'PKR': '₨',
    'LKR': '₨',
    'NPR': '₨',
  };

  const symbol = currencySymbols[currency] || '$';
  
  // Format the number with appropriate decimal places
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol}${formattedAmount}`;
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // This is a placeholder function - in a real implementation, you would:
  // 1. Call a currency conversion API (like exchangerate-api.com)
  // 2. Use real-time exchange rates
  // 3. Handle errors and fallbacks
  
  // For now, return the original amount as a fallback
  console.warn(`Currency conversion from ${fromCurrency} to ${toCurrency} not implemented`);
  return amount;
}