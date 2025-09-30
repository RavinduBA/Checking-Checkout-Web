import { supabase } from "@/integrations/supabase/client";
import { handlePendingInvitationsOnLogin } from "./invitations";

/**
 * Helper function to process pending invitations for a user
 * This should be called when a user signs in to check for and process any pending invitations
 * Updated to use the improved RPC-based approach with proper user state handling
 */
export const processPendingInvitations = async (
	userId: string,
	userEmail: string,
) => {
	try {
		console.log("Processing pending invitations for user login:", userEmail);

		// Use the improved invitation handling that checks user state
		const result = await handlePendingInvitationsOnLogin(userEmail, userId);

		if (result.acceptedCount > 0) {
			console.log(
				`Successfully processed ${result.acceptedCount} pending invitations`,
			);
		}

		if (result.errors.length > 0) {
			console.error("Some invitations had errors:", result.errors);
		}

		return {
			success: true,
			processedInvitations: result.acceptedCount,
			errors: result.errors,
		};
	} catch (error: any) {
		console.error("Exception processing pending invitations:", error);
		return {
			success: false,
			error: error.message || "Failed to process pending invitations",
		};
	}
};
