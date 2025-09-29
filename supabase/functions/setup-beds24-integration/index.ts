import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		console.log("Setting up Beds24 integration with provided invite code...");

		// Use the provided invite code
		const inviteCode =
			"PFZoMRihKaS5LU/OczUdaxbAtPbnHny1fzfCaCB/1CVcZdEhot67JrJuAdKs7ZPZpwBhTV2Pr6rG8E4agQt5wap2qDXnMVvSBkibyiMAHsI8N9/Ixkaj8bGzUJ2DjuqOF/HAb5A81RHl7IRRNOv/kuORmjr+xg4OEvJWH06pOUY=";

		// Exchange invite code for refresh token
		console.log("Exchanging invite code for refresh token...");
		const response = await fetch(
			"https://beds24.com/api/v2/authentication/setup",
			{
				method: "GET",
				headers: {
					accept: "application/json",
					inviteCode: inviteCode,
				},
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				"Failed to exchange invite code:",
				response.status,
				errorText,
			);
			throw new Error(
				`Token exchange failed: ${response.status} ${response.statusText}`,
			);
		}

		const tokenData = await response.json();
		console.log("Successfully exchanged invite code for tokens");

		// Initialize Supabase client to store the refresh token
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Note: We'll return the refresh token so it can be manually added to secrets
		// In a production setup, you'd want to automatically store this in Supabase secrets
		// but that requires additional API permissions

		return new Response(
			JSON.stringify({
				success: true,
				message: "Successfully exchanged invite code for refresh token",
				data: {
					refreshToken: tokenData.refreshToken,
					tokenPreview: tokenData.token
						? `${tokenData.token.substring(0, 20)}...`
						: "No token received",
					expiresIn: tokenData.expiresIn,
					instructions: [
						"1. Copy the refreshToken value below",
						"2. Go to your Supabase project settings",
						"3. Update the BEDS24_REFRESH_TOKEN secret with this value",
						"4. You can then use the sync functionality",
					],
				},
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error: any) {
		console.error("Setup error:", error);

		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message ?? "Unknown error",
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
