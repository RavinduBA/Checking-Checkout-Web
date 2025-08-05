import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled calendar sync...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Rusty Bunk location (or all active locations)
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true);

    if (locationsError) {
      throw new Error(`Failed to fetch locations: ${locationsError.message}`);
    }

    if (!locations || locations.length === 0) {
      throw new Error('No active locations found');
    }

    // Find Rusty Bunk location or use the first active location
    const rustyBunk = locations.find(loc => loc.name.toLowerCase().includes('rusty')) || locations[0];
    
    console.log(`Syncing calendar for location: ${rustyBunk.name}`);

    // Call the sync-ical function
    const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-ical', {
      body: {
        icalUrl: 'https://ical.booking.com/v1/export?t=1d0bea4b-1994-40ec-a9c9-8a718b6cb06a',
        locationId: rustyBunk.id
      }
    });

    if (syncError) {
      throw new Error(`Sync failed: ${syncError.message}`);
    }

    console.log(`Successfully synced ${syncResult?.eventsCount || 0} bookings`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${syncResult?.eventsCount || 0} bookings for ${rustyBunk.name}`,
        location: rustyBunk.name,
        eventsCount: syncResult?.eventsCount || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Scheduled sync error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});