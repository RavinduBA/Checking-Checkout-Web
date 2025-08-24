import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hutch SMS auth caching
let accessToken: string | null = null;
let refreshToken: string | null = null;

async function getAccessToken(): Promise<string> {
  const username = Deno.env.get('BULK_SMS_USERNAME');
  const password = Deno.env.get('BULK_SMS_PASSWORD');

  if (!username || !password) {
    throw new Error('SMS credentials not configured');
  }

  const response = await fetch('https://bsms.hutch.lk/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'X-API-VERSION': 'v1'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  const data = await response.json();
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  return accessToken!;
}

async function renewAccessToken(): Promise<string> {
  if (!refreshToken) return getAccessToken();

  const response = await fetch('https://bsms.hutch.lk/api/token/accessToken', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'X-API-VERSION': 'v1',
      'Authorization': `Bearer ${refreshToken}`
    }
  });
  if (response.status === 401) return getAccessToken();
  if (!response.ok) throw new Error(`Token renewal failed: ${response.status}`);
  const data = await response.json();
  accessToken = data.accessToken;
  return accessToken!;
}

async function sendSMS(message: string): Promise<void> {
  let token = accessToken || await getAccessToken();

  // Send to both numbers, comma-separated as per Hutch API
  const smsData = {
    campaignName: "Daily Bookings",
    mask: "RathnaSuper",
    numbers: "94719528589,94760898589",
    content: message
  };

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
  console.log('Reminder SMS sent:', result);
}

function ymdInTZ(date: Date, tz: string) {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function dayMonInTZ(date: Date, tz: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: '2-digit', month: 'short' }).format(date);
}

function sourceLabel(src: string) {
  if (src === 'booking_com') return 'Booking.com';
  if (src === 'airbnb') return 'Airbnb';
  if (src === 'direct') return 'Direct';
  return src;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { test } = (await req.json().catch(() => ({}))) as { test?: boolean };

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const tz = 'Asia/Colombo';
    const today = new Date();
    const todayYMD = ymdInTZ(today, tz);
    const todayLabel = dayMonInTZ(today, tz);

    console.log('Preparing booking reminders for', { todayYMD, tz });

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, source, guest_name, locations(name)')
      .lte('check_in', todayYMD)
      .gt('check_out', todayYMD);

    if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);

    const list = (bookings || []).map((b: any) => {
      const loc = b.locations?.name || 'Unknown';
      const src = sourceLabel(b.source);
      const gi = dayMonInTZ(new Date(b.check_in), tz);
      const go = dayMonInTZ(new Date(b.check_out), tz);
      const guest = b.guest_name || '';
      return `- ${loc} | ${src} | ${guest} | ${gi}-${go}`;
    });

    if (!list.length && !test) {
      console.log('No bookings today. Skipping SMS.');
      return new Response(JSON.stringify({ success: true, sent: false, message: 'No bookings for today' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prefix = test ? '[TEST] ' : '';
    const header = `${prefix}Bookings ${todayLabel} (LKT)`;
    const body = list.length ? list.join('\n') : 'No bookings today';
    const message = `${header}\n${body}`;

    await sendSMS(message);

    return new Response(JSON.stringify({ success: true, sent: true, count: list.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('booking-reminders error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
