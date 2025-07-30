import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  account: string;
  location: string;
  date: string;
  note?: string;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

async function getAccessToken(): Promise<string> {
  const username = Deno.env.get('BULK_SMS_USERNAME');
  const password = Deno.env.get('BULK_SMS_PASSWORD');
  
  if (!username || !password) {
    throw new Error('SMS credentials not configured');
  }

  try {
    const response = await fetch('https://bsms.hutch.lk/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'X-API-VERSION': 'v1'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function renewAccessToken(): Promise<string> {
  if (!refreshToken) {
    return await getAccessToken();
  }

  try {
    const response = await fetch('https://bsms.hutch.lk/api/token/accessToken', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'X-API-VERSION': 'v1',
        'Authorization': `Bearer ${refreshToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Refresh token expired, get new tokens
        return await getAccessToken();
      }
      throw new Error(`Token renewal failed: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.accessToken;
    
    return accessToken;
  } catch (error) {
    console.error('Error renewing access token:', error);
    // Fallback to fresh login
    return await getAccessToken();
  }
}

async function sendSMS(message: string): Promise<void> {
  let token = accessToken || await getAccessToken();
  
  const smsData = {
    campaignName: "Financial Alert",
    mask: "FINANCIAL",
    numbers: "94719528589",
    content: message
  };

  try {
    let response = await fetch('https://bsms.hutch.lk/api/sendsms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'X-API-VERSION': 'v1',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(smsData)
    });

    if (response.status === 401) {
      // Token expired, renew and retry
      token = await renewAccessToken();
      response = await fetch('https://bsms.hutch.lk/api/sendsms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'X-API-VERSION': 'v1',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(smsData)
      });
    }

    if (!response.ok) {
      throw new Error(`SMS send failed: ${response.status} ${await response.text()}`);
    }

    const result = await response.json();
    console.log('SMS sent successfully:', result);
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `Rs. ${amount.toLocaleString()}`;
}

function createSMSMessage(data: SMSRequest): string {
  const currencyAmount = formatCurrency(data.amount, data.currency);
  const type = data.type.toUpperCase();
  
  let message = `${type} ALERT\n`;
  message += `Amount: ${currencyAmount}\n`;
  message += `Category: ${data.category}\n`;
  message += `Account: ${data.account}\n`;
  message += `Location: ${data.location}\n`;
  message += `Date: ${data.date}`;
  
  if (data.note) {
    message += `\nNote: ${data.note}`;
  }
  
  return message;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const smsRequest: SMSRequest = await req.json();
    
    // Validate required fields
    if (!smsRequest.type || !smsRequest.amount || !smsRequest.category || !smsRequest.account) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = createSMSMessage(smsRequest);
    await sendSMS(message);

    return new Response(JSON.stringify({ success: true, message: 'SMS sent successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-sms-notification function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);