import { supabase } from "@/integrations/supabase/client";

export type Currency = 'LKR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyRate {
  id: string;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  updated_at: string;
  created_at: string;
}

// Cache for currency rates to avoid frequent DB calls
let currencyRatesCache: CurrencyRate[] = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCurrencyRates(): Promise<CurrencyRate[]> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (currencyRatesCache.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
    return currencyRatesCache;
  }

  try {
    const { data, error } = await supabase
      .from('currency_rates')
      .select('*');

    if (error) throw error;

    currencyRatesCache = data || [];
    lastCacheUpdate = now;
    
    return currencyRatesCache;
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    return currencyRatesCache; // Return cached data if available
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getCurrencyRates();
  
  // Find direct conversion rate
  const directRate = rates.find(
    rate => rate.from_currency === fromCurrency && rate.to_currency === toCurrency
  );
  
  if (directRate) {
    return amount * directRate.rate;
  }

  // Find inverse rate
  const inverseRate = rates.find(
    rate => rate.from_currency === toCurrency && rate.to_currency === fromCurrency
  );
  
  if (inverseRate) {
    return amount / inverseRate.rate;
  }

  // No conversion rate found, return original amount
  console.warn(`No conversion rate found for ${fromCurrency} to ${toCurrency}`);
  return amount;
}

export function formatCurrency(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export async function updateCurrencyRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  rate: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('currency_rates')
      .upsert({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'from_currency,to_currency'
      });

    if (error) throw error;

    // Clear cache to force refresh
    currencyRatesCache = [];
    lastCacheUpdate = 0;
  } catch (error) {
    console.error('Error updating currency rate:', error);
    throw error;
  }
}

export async function getUsdToLkrRate(): Promise<number> {
  const rates = await getCurrencyRates();
  const usdToLkr = rates.find(rate => 
    rate.from_currency === 'USD' && rate.to_currency === 'LKR'
  );
  return usdToLkr?.rate || 300; // Default fallback rate
}