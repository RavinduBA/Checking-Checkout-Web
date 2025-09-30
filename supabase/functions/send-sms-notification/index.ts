// Deno edge function for SMS notifications
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
	type?: "income" | "expense" | "otp_verification" | "reservation" | "payment";
	phoneNumber?: string;
	locationId?: string; // Added to get location admin phone numbers
	locationPhone?: string; // Primary location phone number
	message?: string;
	amount?: number;
	currency?: string;
	category?: string;
	account?: string;
	location?: string;
	date?: string;
	note?: string;
	accountBalance?: number;
	// Reservation specific fields
	guestName?: string;
	reservationNumber?: string;
	roomNumber?: string;
	checkIn?: string;
	checkOut?: string;
	status?: string;
	// Payment specific fields
	paymentNumber?: string;
	paymentMethod?: string;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to format phone number for SMS API (remove + symbol)
function formatPhoneNumber(phoneNumber: string): string {
	if (!phoneNumber) return "";
	
	// Simply remove + symbol and any spaces/dashes - keep the number as is
	const formatted = phoneNumber.replace(/[+\s\-()]/g, "");
	
	console.log(`Formatted phone number: ${phoneNumber} -> ${formatted}`);
	return formatted;
}

// Function to get location admin phone numbers
async function getLocationAdminPhones(locationId: string): Promise<string[]> {
	try {
		const { data: adminUsers, error } = await supabase
			.from("user_permissions")
			.select(`
				profiles!inner(phone)
			`)
			.eq("location_id", locationId)
			.or("is_tenant_admin.eq.true,tenant_role.eq.tenant_admin,tenant_role.eq.tenant_manager")
			.not("profiles.phone", "is", null);

		if (error) {
			console.error("Error fetching location admin phones:", error);
			return [];
		}

		// Extract phone numbers, format them, and filter out null/empty values
		const phoneNumbers = adminUsers
			.map((user: any) => user.profiles?.phone)
			.filter((phone: string | null) => phone && phone.trim().length > 0)
			.map((phone: string) => formatPhoneNumber(phone))
			.filter((phone: string) => phone.length > 0);

		console.log(`Found ${phoneNumbers.length} admin phone numbers for location ${locationId}`);
		return phoneNumbers;
	} catch (error) {
		console.error("Exception getting location admin phones:", error);
		return [];
	}
}

async function getAccessToken(): Promise<string> {
	const username = Deno.env.get("BULK_SMS_USERNAME");
	const password = Deno.env.get("BULK_SMS_PASSWORD");

	if (!username || !password) {
		throw new Error("SMS credentials not configured");
	}

	try {
		const response = await fetch("https://bsms.hutch.lk/api/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "*/*",
				"X-API-VERSION": "v1",
			},
			body: JSON.stringify({
				username,
				password,
			}),
		});

		if (!response.ok) {
			throw new Error(`Login failed: ${response.status}`);
		}

		const data = await response.json();
		accessToken = data.accessToken;
		refreshToken = data.refreshToken;

		return accessToken || "";
	} catch (error) {
		console.error("Error getting access token:", error);
		throw error;
	}
}

async function renewAccessToken(): Promise<string> {
	if (!refreshToken) {
		return await getAccessToken();
	}

	try {
		const response = await fetch(
			"https://bsms.hutch.lk/api/token/accessToken",
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Accept: "*/*",
					"X-API-VERSION": "v1",
					Authorization: `Bearer ${refreshToken}`,
				},
			},
		);

		if (!response.ok) {
			if (response.status === 401) {
				// Refresh token expired, get new tokens
				return await getAccessToken();
			}
			throw new Error(`Token renewal failed: ${response.status}`);
		}

		const data = await response.json();
		accessToken = data.accessToken;

		return accessToken || "";
	} catch (error) {
		console.error("Error renewing access token:", error);
		// Fallback to fresh login
		return await getAccessToken();
	}
}

async function sendSMS(
	message: string,
	phoneNumber: string,
): Promise<void> {
	let token = accessToken || (await getAccessToken());

	// Format phone number for SMS API
	const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
	
	if (!formattedPhoneNumber) {
		throw new Error(`Invalid phone number format: ${phoneNumber}`);
	}

	const smsData = {
		campaignName: "Financial Alert",
		mask: "RathnaSuper",
		numbers: formattedPhoneNumber,
		content: message,
	};

	console.log(`Sending SMS to: ${formattedPhoneNumber} (original: ${phoneNumber})`);

	try {
		let response = await fetch("https://bsms.hutch.lk/api/sendsms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "*/*",
				"X-API-VERSION": "v1",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(smsData),
		});

		if (response.status === 401) {
			// Token expired, renew and retry
			token = await renewAccessToken();
			response = await fetch("https://bsms.hutch.lk/api/sendsms", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "*/*",
					"X-API-VERSION": "v1",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(smsData),
			});
		}

		if (!response.ok) {
			throw new Error(
				`SMS send failed: ${response.status} ${await response.text()}`,
			);
		}

		const result = await response.json();
		console.log("SMS sent successfully:", result);
	} catch (error) {
		console.error("Error sending SMS:", error);
		throw error;
	}
}

function formatCurrency(amount: number, currency: string): string {
	if (currency === "USD") {
		return `$${amount.toFixed(2)}`;
	}
	return `Rs. ${amount.toLocaleString()}`;
}

function createSMSMessage(data: SMSRequest): string {
	const currencyAmount = formatCurrency(data.amount!, data.currency!);
	const type = data.type!.toUpperCase();

	// Keep message concise for SMS 160 character limit
	let message = `${type}: ${currencyAmount}\n`;
	message += `${data.category}\n`;
	message += `${data.account}`;
	
	// Only add balance if provided and message is still short
	if (typeof data.accountBalance === "number" && message.length < 100) {
		const bal = formatCurrency(data.accountBalance, data.currency!);
		message += `\nBal: ${bal}`;
	}
	
	message += `\n${data.location}`;

	// Only add note if message is still short enough
	if (data.note && message.length < 120) {
		const shortNote = data.note.length > 30 ? data.note.substring(0, 30) + "..." : data.note;
		message += `\n${shortNote}`;
	}

	return message;
}

function createReservationSMSMessage(data: SMSRequest): string {
	const currencyAmount = formatCurrency(data.amount!, data.currency!);

	// Keep reservation message concise
	let message = `NEW BOOKING\n`;
	message += `${data.guestName}\n`;
	message += `${data.reservationNumber}\n`;
	message += `Room ${data.roomNumber}\n`;
	message += `${data.checkIn} to ${data.checkOut}\n`;
	message += `${currencyAmount} - ${data.status!.toUpperCase()}`;

	return message;
}

function createPaymentSMSMessage(data: SMSRequest): string {
	const currencyAmount = formatCurrency(data.amount!, data.currency!);

	// Keep payment message concise
	let message = `PAYMENT: ${currencyAmount}\n`;
	message += `${data.paymentNumber}\n`;
	message += `${data.paymentMethod}\n`;
	message += `${data.guestName}\n`;
	message += `${data.reservationNumber}`;

	// Only add note if message is still short
	if (data.note && message.length < 120) {
		const shortNote = data.note.length > 20 ? data.note.substring(0, 20) + "..." : data.note;
		message += `\n${shortNote}`;
	}

	return message;
}

const handler = async (req: Request): Promise<Response> => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	try {
		const smsRequest: SMSRequest = await req.json();

		let message: string;
		let phoneNumbers: string[] = [];

		// Determine recipient phone numbers based on priority:
		// 1. Direct phoneNumber (for OTP)
		// 2. locationPhone (primary location contact)  
		// 3. Location admin phones via locationId
		// 4. Fallback default

		// If phoneNumber is provided directly (e.g., for OTP), use it
		if (smsRequest.phoneNumber) {
			const formattedPhoneNumber = formatPhoneNumber(smsRequest.phoneNumber);
			if (formattedPhoneNumber) {
				phoneNumbers = [formattedPhoneNumber];
			}
			
			// For OTP verification, also notify location admins if locationId is provided
			if (smsRequest.type === "otp_verification" && smsRequest.locationId) {
				const adminPhones = await getLocationAdminPhones(smsRequest.locationId);
				// Add admin phones but avoid duplicates
				adminPhones.forEach(phone => {
					if (!phoneNumbers.includes(phone)) {
						phoneNumbers.push(phone);
					}
				});
			}
		}
		// If locationPhone is provided, use it as primary recipient 
		else if (smsRequest.locationPhone) {
			const formattedLocationPhone = formatPhoneNumber(smsRequest.locationPhone);
			if (formattedLocationPhone) {
				phoneNumbers = [formattedLocationPhone];
			}
			
			// Also add location admin phones as secondary recipients if locationId provided
			if (smsRequest.locationId) {
				const adminPhones = await getLocationAdminPhones(smsRequest.locationId);
				// Add admin phones but avoid duplicates
				adminPhones.forEach(phone => {
					if (!phoneNumbers.includes(phone)) {
						phoneNumbers.push(phone);
					}
				});
			}
		}
		// If locationId is provided but no locationPhone, get location admin phone numbers
		else if (smsRequest.locationId) {
			phoneNumbers = await getLocationAdminPhones(smsRequest.locationId);
			if (phoneNumbers.length === 0) {
				console.log(`No admin phone numbers found for location ${smsRequest.locationId}. Using fallback.`);
				phoneNumbers = ["94719528589"];
			}
		}
		// Fallback to default phone number if no location or phone provided
		else {
			phoneNumbers = ["94719528589"];
		}

		if (smsRequest.type === "otp_verification") {
			// Handle OTP verification SMS
			message = smsRequest.message || "Your OTP verification code";
		} else if (smsRequest.type === "reservation") {
			// Handle reservation creation SMS
			message = createReservationSMSMessage(smsRequest);
		} else if (smsRequest.type === "payment") {
			// Handle payment SMS
			message = createPaymentSMSMessage(smsRequest);
		} else {
			// Validate required fields for financial alerts
			if (
				!smsRequest.type ||
				!smsRequest.amount ||
				!smsRequest.category ||
				!smsRequest.account
			) {
				return new Response(
					JSON.stringify({ error: "Missing required fields" }),
					{
						status: 400,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					},
				);
			}
			message = createSMSMessage(smsRequest);
		}

		// Send SMS to all admin phone numbers
		const smsPromises = phoneNumbers.map(phone => sendSMS(message, phone));
		await Promise.all(smsPromises);

		return new Response(
			JSON.stringify({ 
				success: true, 
				message: `SMS sent successfully to ${phoneNumbers.length} recipient(s)`,
				recipients: phoneNumbers.length
			}),
			{
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	} catch (error: any) {
		console.error("Error in send-sms-notification function:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
};

Deno.serve(handler);
