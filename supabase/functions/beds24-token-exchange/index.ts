import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Exchanging Beds24 invite code for refresh token...');

    // The invite code should be passed in the request body
    const { inviteCode } = await req.json();
    
    if (!inviteCode) {
      throw new Error('Invite code is required');
    }

    // Exchange invite code for refresh token
    const response = await fetch('https://beds24.com/api/v2/authentication/setup', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'inviteCode': inviteCode,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to exchange invite code:', response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json();
    console.log('Successfully exchanged invite code for tokens');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully exchanged invite code',
        data: {
          refreshToken: tokenData.refreshToken,
          token: tokenData.token,
          expiresIn: tokenData.expiresIn,
          // Don't log sensitive data, but confirm we got it
          hasRefreshToken: !!tokenData.refreshToken,
          hasToken: !!tokenData.token,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Token exchange error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message ?? 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});