import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface ICalEvent {
	summary: string;
	dtstart: string;
	dtend: string;
}

function parseICalDate(icalDate: string): string {
	// Handle both YYYYMMDD and YYYYMMDDTHHMMSSZ formats
	if (icalDate.includes("T")) {
		// Format: YYYYMMDDTHHMMSSZ - parse as UTC
		const year = icalDate.substring(0, 4);
		const month = icalDate.substring(4, 6);
		const day = icalDate.substring(6, 8);
		const hour = icalDate.substring(9, 11);
		const minute = icalDate.substring(11, 13);
		const second = icalDate.substring(13, 15);
		return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
	} else {
		// Format: YYYYMMDD - parse exactly as provided without shifting
		const year = icalDate.substring(0, 4);
		const month = icalDate.substring(4, 6);
		const day = icalDate.substring(6, 8);

		// Simply return ISO format without timezone conversion
		// This preserves the exact date from iCal
		return `${year}-${month}-${day}T00:00:00.000Z`;
	}
}

function parseICalData(icalData: string): ICalEvent[] {
	const events: ICalEvent[] = [];
	const lines = icalData.split("\n").map((line) => line.trim());

	let currentEvent: Partial<ICalEvent> = {};
	let inEvent = false;

	for (const line of lines) {
		if (line === "BEGIN:VEVENT") {
			inEvent = true;
			currentEvent = {};
		} else if (line === "END:VEVENT" && inEvent) {
			if (currentEvent.summary && currentEvent.dtstart && currentEvent.dtend) {
				events.push(currentEvent as ICalEvent);
			}
			inEvent = false;
		} else if (inEvent) {
			if (line.startsWith("SUMMARY:")) {
				currentEvent.summary = line.substring(8);
			} else if (line.startsWith("DTSTART:") || line.startsWith("DTSTART;")) {
				const dateValue = line.split(":")[1];
				currentEvent.dtstart = dateValue;
			} else if (line.startsWith("DTEND:") || line.startsWith("DTEND;")) {
				const dateValue = line.split(":")[1];
				currentEvent.dtend = dateValue;
			}
		}
	}

	return events;
}

serve(async (req) => {
	console.log("iCal sync function called");

	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		const { icalUrl, locationId, source } = await req.json();

		console.log("Fetching iCal from:", icalUrl);
		console.log("Location ID:", locationId);
		console.log("Source:", source);

		// Create Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Fetch iCal data
		const response = await fetch(icalUrl);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch iCal: ${response.status} ${response.statusText}`,
			);
		}

		const icalData = await response.text();
		console.log("iCal data length:", icalData.length);

		// Parse iCal events
		const events = parseICalData(icalData);
		console.log("Parsed events:", events.length);

		let syncedCount = 0;

		// Insert events into database
		for (const event of events) {
			try {
				const checkIn = parseICalDate(event.dtstart);
				const checkOut = parseICalDate(event.dtend);

				// Adjust checkout date by subtracting 1 day for correct closed date identification
				const checkOutDate = new Date(checkOut);
				checkOutDate.setDate(checkOutDate.getDate() - 1);
				const adjustedCheckOut = checkOutDate.toISOString();

				console.log(
					`Processing event: ${event.summary}, Check-in: ${event.dtstart} -> ${checkIn}, Check-out: ${event.dtend} -> ${checkOut}`,
				);

				// Check if booking already exists
				const { data: existingBooking } = await supabase
					.from("bookings")
					.select("id")
					.eq("guest_name", event.summary)
					.eq("location_id", locationId)
					.eq("check_in", checkIn)
					.single();

				if (!existingBooking) {
					const { error: insertError } = await supabase
						.from("bookings")
						.insert({
							guest_name: event.summary,
							location_id: locationId,
							check_in: checkIn,
							check_out: adjustedCheckOut,
							total_amount: 0,
							advance_amount: 0,
							paid_amount: 0,
							source: source || "booking_com",
							status: "confirmed",
						});

					if (insertError) {
						console.error("Error inserting booking:", insertError);
					} else {
						syncedCount++;
					}
				}
			} catch (eventError) {
				console.error("Error processing event:", eventError);
			}
		}

		console.log("Synced bookings:", syncedCount);

		return new Response(
			JSON.stringify({
				success: true,
				message: `Successfully synced ${syncedCount} bookings`,
				eventsCount: syncedCount,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("iCal sync error:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
});
