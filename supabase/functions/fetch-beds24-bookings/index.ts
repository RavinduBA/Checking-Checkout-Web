import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Beds24Booking {
  bookId: string;
  roomId: string;
  arrival: string;
  departure: string;
  firstNight: string;
  lastNight: string;
  numAdult: number;
  numChild: number;
  guestFirstName: string;
  guestName: string;
  status: string;
  price: number;
  apiSourceId: number;
  propId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Beds24 bookings sync...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API tokens from secrets
    const rustyBunkToken = Deno.env.get('BEDS24_RUSTY_BUNK_TOKEN')!;
    const luxuryVillaToken = Deno.env.get('BEDS24_LUXURY_VILLA_TOKEN')!;

    console.log('Fetched API tokens from environment');

    // Property configurations
    const properties = [
      {
        id: '291492',
        name: 'Rusty Bunk Villa',
        token: rustyBunkToken,
        locationId: null, // Will be fetched from database
      },
      {
        id: '291496',
        name: 'Luxury 3 Bedroom Mountain-View Villa, Sleeps 1-6',
        token: luxuryVillaToken,
        locationId: null, // Will be fetched from database
      }
    ];

    let totalSynced = 0;
    const syncResults = [];

    // Get locations from database to match property names
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true);

    if (locationsError) {
      console.error('Failed to fetch locations:', locationsError);
    }

    // Map location IDs
    for (const property of properties) {
      const location = locations?.find(loc => 
        loc.name.includes('Rusty Bunk') && property.name.includes('Rusty Bunk') ||
        loc.name.includes('Asaliya') && property.name.includes('Villa')
      );
      if (location) {
        property.locationId = location.id;
        console.log(`Mapped ${property.name} to location ${location.name} (${location.id})`);
      }
    }

    // Fetch bookings for each property
    for (const property of properties) {
      console.log(`Fetching bookings for ${property.name} (ID: ${property.id})`);
      
      try {
        // Calculate date range (30 days back, 365 days forward)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 365);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        // Try POS API endpoint with the provided tokens
        console.log(`Using POS token for ${property.name}: ${property.token.substring(0, 20)}...`);
        
        const beds24Response = await fetch(`https://api.beds24.com/v1/getbookings.php?propKey=${property.token}&arrivalFrom=${formatDate(startDate)}&arrivalTo=${formatDate(endDate)}`, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!beds24Response.ok) {
          console.error(`Beds24 API error for ${property.name}: ${beds24Response.status} - ${beds24Response.statusText}`);
          continue;
        }

        const bookingsData = await beds24Response.json();
        console.log(`API Response:`, bookingsData);
        const bookings: Beds24Booking[] = bookingsData || [];

        console.log(`Found ${bookings.length} bookings for ${property.name}`);

        let propertySync = 0;

        // Process each booking
        for (const booking of bookings) {
          try {
            // Determine source based on apiSourceId
            let source = 'unknown';
            if (booking.apiSourceId === 3) {
              source = 'booking_com';
            } else if (booking.apiSourceId === 2) {
              source = 'airbnb';
            } else if (booking.apiSourceId === 1) {
              source = 'direct';
            }

            // Skip direct bookings as they should already be in the system
            if (source === 'direct') {
              continue;
            }

            // Convert dates to proper format
            const checkIn = new Date(booking.arrival + 'T15:00:00Z'); // 3 PM check-in
            const checkOut = new Date(booking.departure + 'T11:00:00Z'); // 11 AM check-out

            // Prepare external booking data
            const externalBookingData = {
              external_id: booking.bookId,
              property_id: property.id,
              source: source,
              guest_name: booking.guestName || booking.guestFirstName || 'Unknown Guest',
              check_in: checkIn.toISOString(),
              check_out: checkOut.toISOString(),
              status: booking.status.toLowerCase(),
              total_amount: booking.price || 0,
              currency: 'USD',
              location_id: property.locationId,
              room_name: `Room ${booking.roomId}`,
              adults: booking.numAdult || 1,
              children: booking.numChild || 0,
              raw_data: booking,
              last_synced_at: new Date().toISOString()
            };

            // Insert or update external booking
            const { error: upsertError } = await supabase
              .from('external_bookings')
              .upsert(externalBookingData, {
                onConflict: 'external_id,property_id,source'
              });

            if (upsertError) {
              console.error(`Failed to upsert booking ${booking.bookId}:`, upsertError);
            } else {
              propertySync++;
              totalSynced++;
            }

          } catch (bookingError) {
            console.error(`Error processing booking ${booking.bookId}:`, bookingError);
          }
        }

        if (propertySync > 0) {
          syncResults.push(`${property.name}: ${propertySync} bookings`);
        }

        console.log(`Synced ${propertySync} bookings for ${property.name}`);

      } catch (propertyError) {
        console.error(`Error fetching bookings for ${property.name}:`, propertyError);
        syncResults.push(`${property.name}: Error - ${propertyError.message}`);
      }
    }

    const message = totalSynced > 0 
      ? `Successfully synced ${totalSynced} external bookings`
      : 'No new external bookings to sync';
    
    console.log(message);
    if (syncResults.length > 0) {
      console.log('Sync details:', syncResults.join(' | '));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
        totalSynced,
        properties: syncResults,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Beds24 sync error:', error);
    
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