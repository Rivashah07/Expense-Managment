/**
 * Currency utilities for conversion and country data
 */

export interface Country {
  name: string;
  code: string;
  currency: string;
  currencySymbol: string;
}

export interface ExchangeRates {
  base: string;
  date: string;
  rates: { [key: string]: number };
}

let countriesCache: Country[] | null = null;
let exchangeRatesCache: { [base: string]: { data: ExchangeRates; timestamp: number } } = {};

const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch all countries with their currencies
 */
export async function fetchCountries(): Promise<Country[]> {
  if (countriesCache) {
    return countriesCache;
  }

  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies,cca2');
    const data = await response.json();

    countriesCache = data
      .map((country: any) => {
        const currencies = country.currencies || {};
        const currencyCode = Object.keys(currencies)[0];
        const currencyData = currencies[currencyCode];

        return {
          name: country.name.common,
          code: country.cca2,
          currency: currencyCode || 'USD',
          currencySymbol: currencyData?.symbol || '$',
        };
      })
      .filter((c: Country) => c.currency)
      .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

    return countriesCache;
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    // Return default fallback
    return [
      { name: 'United States', code: 'US', currency: 'USD', currencySymbol: '$' },
      { name: 'United Kingdom', code: 'GB', currency: 'GBP', currencySymbol: '£' },
      { name: 'Eurozone', code: 'EU', currency: 'EUR', currencySymbol: '€' },
    ];
  }
}

/**
 * Fetch exchange rates for a base currency
 */
export async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRates> {
  const cached = exchangeRatesCache[baseCurrency];
  const now = Date.now();

  // Return cached data if still valid
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();

    // Cache the result
    exchangeRatesCache[baseCurrency] = {
      data,
      timestamp: now,
    };

    return data;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    
    // Return cached data even if expired, or throw error
    if (cached) {
      return cached.data;
    }
    
    throw new Error('Could not fetch exchange rates. Please try again later.');
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    const rates = await fetchExchangeRates(fromCurrency);
    const rate = rates.rates[toCurrency];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    return amount * rate;
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
}

/**
 * Format currency with proper symbol and decimals
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Get popular currencies for quick selection
 */
export function getPopularCurrencies(): Country[] {
  return [
    { name: 'United States', code: 'US', currency: 'USD', currencySymbol: '$' },
    { name: 'Eurozone', code: 'EU', currency: 'EUR', currencySymbol: '€' },
    { name: 'United Kingdom', code: 'GB', currency: 'GBP', currencySymbol: '£' },
    { name: 'Japan', code: 'JP', currency: 'JPY', currencySymbol: '¥' },
    { name: 'Canada', code: 'CA', currency: 'CAD', currencySymbol: 'C$' },
    { name: 'Australia', code: 'AU', currency: 'AUD', currencySymbol: 'A$' },
    { name: 'Switzerland', code: 'CH', currency: 'CHF', currencySymbol: 'Fr' },
    { name: 'China', code: 'CN', currency: 'CNY', currencySymbol: '¥' },
    { name: 'India', code: 'IN', currency: 'INR', currencySymbol: '₹' },
  ];
}

