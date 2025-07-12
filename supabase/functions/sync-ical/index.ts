import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { icalUrl, locationId } = await req.json()

    console.log('Syncing iCal for location:', locationId, 'URL:', icalUrl)

    // Fetch iCal data
    const icalResponse = await fetch(icalUrl)
    const icalText = await icalResponse.text()
    
    console.log('iCal data length:', icalText.length)

    // Parse basic iCal data (simplified parsing)
    const events = parseICalEvents(icalText)
    console.log('Parsed events:', events.length)

    // Clear existing synced bookings for this location
    await supabaseClient
      .from('bookings')
      .delete()
      .eq('location_id', locationId)
      .eq('source', 'booking_com')

    // Insert new bookings
    for (const event of events) {
      const { error } = await supabaseClient
        .from('bookings')
        .insert({
          location_id: locationId,
          guest_name: event.summary || 'Booking.com Guest',
          check_in: event.start,
          check_out: event.end,
          source: 'booking_com',
          status: 'confirmed',
          total_amount: 0,
          advance_amount: 0,
          paid_amount: 0
        })

      if (error) {
        console.error('Error inserting booking:', error)
      }
    }

    // Update sync timestamp
    await supabaseClient
      .from('booking_sync_urls')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('location_id', locationId)

    return new Response(
      JSON.stringify({ success: true, eventsCount: events.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function parseICalEvents(icalText: string) {
  const events = []
  const lines = icalText.split('\n')
  let currentEvent: any = null

  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed === 'BEGIN:VEVENT') {
      currentEvent = {}
    } else if (trimmed === 'END:VEVENT' && currentEvent) {
      if (currentEvent.start && currentEvent.end) {
        events.push(currentEvent)
      }
      currentEvent = null
    } else if (currentEvent) {
      if (trimmed.startsWith('SUMMARY:')) {
        currentEvent.summary = trimmed.substring(8)
      } else if (trimmed.startsWith('DTSTART:')) {
        const dateStr = trimmed.substring(8)
        currentEvent.start = parseICalDate(dateStr)
      } else if (trimmed.startsWith('DTEND:')) {
        const dateStr = trimmed.substring(6)
        currentEvent.end = parseICalDate(dateStr)
      }
    }
  }

  return events
}

function parseICalDate(dateStr: string): string {
  // Handle both DATE and DATETIME formats
  const cleanDate = dateStr.replace(/[TZ]/g, '')
  
  if (cleanDate.length === 8) {
    // DATE format: YYYYMMDD
    const year = cleanDate.substring(0, 4)
    const month = cleanDate.substring(4, 6)
    const day = cleanDate.substring(6, 8)
    return `${year}-${month}-${day}T00:00:00.000Z`
  } else if (cleanDate.length >= 14) {
    // DATETIME format: YYYYMMDDTHHMMSS
    const year = cleanDate.substring(0, 4)
    const month = cleanDate.substring(4, 6)
    const day = cleanDate.substring(6, 8)
    const hour = cleanDate.substring(8, 10) || '00'
    const minute = cleanDate.substring(10, 12) || '00'
    const second = cleanDate.substring(12, 14) || '00'
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`
  }
  
  return new Date().toISOString()
}