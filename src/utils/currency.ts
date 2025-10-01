import { supabase } from "@/integrations/supabase/client";

// Updated type for dynamic currencies
export type Currency = string; // Now supports any currency code

export interface CurrencyRate {
	id: string;
	currency_code: string;
	usd_rate: number;
	is_custom: boolean;
	updated_at: string;
	created_at: string;
}

// Type for currency rates object (currency_code -> usd_rate)
export type CurrencyRates = Record<string, number>;

// Cache for currency rates to avoid frequent DB calls
let currencyRatesCache: CurrencyRates = {};
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getDefaultRates = (): CurrencyRates => {
	return {
		USD: 1,
	};
};

// Get all available currencies from database
export const getAvailableCurrencies = async (): Promise<string[]> => {
	try {
		const { data, error } = await supabase
			.from("currency_rates")
			.select("currency_code")
			.not("currency_code", "is", null)
			.order("currency_code");

		if (error) {
			console.error("Error fetching currencies:", error);
			return ["USD"];
		}

		return data?.map((item) => item.currency_code) || ["USD"];
	} catch (error) {
		console.error("Error in getAvailableCurrencies:", error);
		return ["USD"];
	}
};

export const getCurrencyRates = async (): Promise<CurrencyRates> => {
	// Check cache first
	const now = Date.now();
	if (
		Object.keys(currencyRatesCache).length > 0 &&
		now - lastCacheUpdate < CACHE_DURATION
	) {
		return currencyRatesCache;
	}

	try {
		const { data, error } = await supabase
			.from("currency_rates")
			.select("currency_code, usd_rate")
			.not("currency_code", "is", null)
			.not("usd_rate", "is", null);

		if (error) {
			console.error("Error fetching currency rates:", error);
			return getDefaultRates();
		}

		if (!data || data.length === 0) {
			console.warn("No currency rates found in database");
			return getDefaultRates();
		}

		// Convert database format to our rates object
		const rates: CurrencyRates = {};
		for (const rate of data) {
			rates[rate.currency_code] = Number(rate.usd_rate);
		}

		// Update cache
		currencyRatesCache = rates;
		lastCacheUpdate = now;

		return rates;
	} catch (error) {
		console.error("Error in getCurrencyRates:", error);
		return getDefaultRates();
	}
};

export const convertCurrency = async (
	amount: number,
	fromCurrency: string,
	toCurrency: string,
): Promise<number> => {
	if (fromCurrency === toCurrency) {
		return amount;
	}

	try {
		const rates = await getCurrencyRates();

		// Convert from source currency to USD first
		let usdAmount = amount;
		if (fromCurrency !== "USD") {
			const fromRate = rates[fromCurrency];
			if (!fromRate) {
				console.warn(`No rate found for ${fromCurrency}, using 1`);
				return amount;
			}
			usdAmount = amount / fromRate;
		}

		// Convert from USD to target currency
		if (toCurrency === "USD") {
			return usdAmount;
		}

		const toRate = rates[toCurrency];
		if (!toRate) {
			console.warn(`No rate found for ${toCurrency}, using USD amount`);
			return usdAmount;
		}

		return usdAmount * toRate;
	} catch (error) {
		console.error("Error converting currency:", error);
		return amount;
	}
};

// Add a new custom currency
export const addCustomCurrency = async (
	currencyCode: string,
	usdRate: number,
): Promise<{ success: boolean; error?: string }> => {
	try {
		// Validate currency code (3-5 uppercase letters)
		if (!/^[A-Z]{3,5}$/.test(currencyCode)) {
			return {
				success: false,
				error: "Currency code must be 3-5 uppercase letters",
			};
		}

		// Validate USD rate
		if (usdRate <= 0) {
			return { success: false, error: "USD rate must be greater than 0" };
		}

		const { error } = await supabase.from("currency_rates").upsert(
			{
				currency_code: currencyCode,
				usd_rate: usdRate,
				is_custom: true,
			},
			{
				onConflict: "currency_code",
			},
		);

		if (error) {
			console.error("Error adding custom currency:", error);
			return { success: false, error: error.message };
		}

		// Clear cache to force refresh
		currencyRatesCache = {};
		lastCacheUpdate = 0;

		return { success: true };
	} catch (error) {
		console.error("Error in addCustomCurrency:", error);
		return { success: false, error: "Failed to add currency" };
	}
};

// Generate Google search URL for currency conversion
export const getCurrencyConversionSearchUrl = (
	currencyCode: string,
): string => {
	const query = `usd+to+${currencyCode.toLowerCase()}`;
	return `https://www.google.com/search?q=${query}`;
};

// Remove a custom currency
export async function removeCustomCurrency(
	currencyCode: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		if (currencyCode === "USD") {
			return { success: false, error: "Cannot remove USD base currency" };
		}

		const { error } = await supabase
			.from("currency_rates")
			.delete()
			.eq("currency_code", currencyCode)
			.eq("is_custom", true);

		if (error) {
			console.error("Error removing currency:", error);
			return { success: false, error: error.message };
		}

		// Clear cache to force refresh
		currencyRatesCache = {};
		lastCacheUpdate = 0;

		return { success: true };
	} catch (error) {
		console.error("Error in removeCustomCurrency:", error);
		return { success: false, error: "Failed to remove currency" };
	}
}

export function formatCurrency(amount: number, currency: string): string {
	// Try to format with the currency code, fallback to generic formatting
	try {
		const formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		return formatter.format(amount);
	} catch (error) {
		// Fallback for unsupported currency codes
		return `${currency} ${amount.toFixed(2)}`;
	}
}

// Get currency symbol for a given currency code
export function getCurrencySymbol(currency: string): string {
	const symbols: Record<string, string> = {
		USD: "$", // US Dollar
		EUR: "€", // Euro
		GBP: "£", // British Pound
		INR: "₹", // Indian Rupee
		JPY: "¥", // Japanese Yen
		CNY: "¥", // Chinese Yuan
		AUD: "A$", // Australian Dollar
		CAD: "C$", // Canadian Dollar
		CHF: "CHF", // Swiss Franc
		SEK: "kr", // Swedish Krona
		NOK: "kr", // Norwegian Krone
		DKK: "kr", // Danish Krone
		RUB: "₽", // Russian Ruble
		KRW: "₩", // South Korean Won
		THB: "฿", // Thai Baht
		SGD: "S$", // Singapore Dollar
		HKD: "HK$", // Hong Kong Dollar
		NZD: "NZ$", // New Zealand Dollar
		ZAR: "R", // South African Rand
	};

	return symbols[currency.toUpperCase()] ?? currency;
}

// Update a currency rate
export async function updateCurrencyRate(
	currencyCode: string,
	usdRate: number,
): Promise<{ success: boolean; error?: string }> {
	try {
		if (currencyCode === "USD") {
			return { success: false, error: "Cannot modify USD base currency rate" };
		}

		if (usdRate <= 0) {
			return { success: false, error: "USD rate must be greater than 0" };
		}

		const { error } = await supabase
			.from("currency_rates")
			.update({
				usd_rate: usdRate,
				updated_at: new Date().toISOString(),
			})
			.eq("currency_code", currencyCode);

		if (error) {
			console.error("Error updating currency rate:", error);
			return { success: false, error: error.message };
		}

		// Clear cache to force refresh
		currencyRatesCache = {};
		lastCacheUpdate = 0;

		return { success: true };
	} catch (error) {
		console.error("Error in updateCurrencyRate:", error);
		return { success: false, error: "Failed to update currency rate" };
	}
}

// Get currency details including custom flag
export const getCurrencyDetails = async (): Promise<CurrencyRate[]> => {
	try {
		const { data, error } = await supabase
			.from("currency_rates")
			.select("*")
			.not("currency_code", "is", null)
			.order("currency_code");

		if (error) {
			console.error("Error fetching currency details:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error("Error in getCurrencyDetails:", error);
		return [];
	}
};
