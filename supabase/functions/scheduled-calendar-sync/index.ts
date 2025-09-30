import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		console.log("Starting scheduled calendar sync...");

		// Initialize Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Get all active locations
		const { data: locations, error: locationsError } = await supabase
			.from("locations")
			.select("*")
			.eq("is_active", true);

		if (locationsError) {
			throw new Error(`Failed to fetch locations: ${locationsError.message}`);
		}

		if (!locations || locations.length === 0) {
			throw new Error("No active locations found");
		}

		// Define calendar URLs for each location
		const locationCalendars = {
			"Rusty Bunk": {
				booking:
					"https://ical.booking.com/v1/export?t=1d0bea4b-1994-40ec-a9c9-8a718b6cb06a",
				airbnb:
					"https://www.airbnb.com/calendar/ical/963663195873805668.ics?s=3e54d971266f0be2e1d214dbfe0ab1e5",
			},
			"Asaliya Villa": {
				booking: "", // Add Booking.com URL when available
				airbnb:
					"https://www.airbnb.com/calendar/ical/1066676694977135723.ics?s=a6ea559960438d00fac0cb39f01592e0",
			},
		};

		let totalEvents = 0;
		const syncResults = [];

		console.log(`Syncing calendars for ${locations.length} locations...`);

		// Sync calendars for each location
		for (const location of locations) {
			const calendars = locationCalendars[location.name];
			if (!calendars) {
				console.log(
					`No calendar URLs configured for ${location.name}, skipping...`,
				);
				continue;
			}

			console.log(`Syncing calendars for ${location.name}...`);

			let locationEvents = 0;
			const locationSources = [];

			// Sync Booking.com calendar if URL exists
			if (calendars.booking) {
				const { data: bookingResult, error: bookingError } =
					await supabase.functions.invoke("sync-ical", {
						body: {
							icalUrl: calendars.booking,
							locationId: location.id,
							source: "booking_com",
						},
					});

				if (bookingError) {
					console.error(
						`${location.name} Booking.com sync failed: ${bookingError.message}`,
					);
				} else if (bookingResult?.eventsCount) {
					locationEvents += bookingResult.eventsCount;
					locationSources.push(`${bookingResult.eventsCount} from Booking.com`);
				}
			}

			// Sync Airbnb calendar if URL exists
			if (calendars.airbnb) {
				const { data: airbnbResult, error: airbnbError } =
					await supabase.functions.invoke("sync-ical", {
						body: {
							icalUrl: calendars.airbnb,
							locationId: location.id,
							source: "airbnb",
						},
					});

				if (airbnbError) {
					console.error(
						`${location.name} Airbnb sync failed: ${airbnbError.message}`,
					);
				} else if (airbnbResult?.eventsCount) {
					locationEvents += airbnbResult.eventsCount;
					locationSources.push(`${airbnbResult.eventsCount} from Airbnb`);
				}
			}

			if (locationEvents > 0) {
				syncResults.push(`${location.name}: ${locationSources.join(", ")}`);
				totalEvents += locationEvents;
			}

			console.log(`${location.name}: Synced ${locationEvents} bookings`);
		}

		const message =
			totalEvents > 0
				? `Successfully synced ${totalEvents} total bookings across ${syncResults.length} locations`
				: "No new bookings to sync";

		console.log(message);
		if (syncResults.length > 0) {
			console.log("Details:", syncResults.join(" | "));
		}

		return new Response(
			JSON.stringify({
				success: true,
				message,
				totalEvents,
				locations: syncResults,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error: any) {
		console.error("Scheduled sync error:", error);

		return new Response(
			JSON.stringify({
				success: false,
				error: error.message,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
