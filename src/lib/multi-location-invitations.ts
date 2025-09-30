import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Multi-Location User Invitation System
 * Handles inviting existing users to specific locations with custom permissions
 */

export interface LocationPermissions extends Record<string, Json | undefined> {
	access_dashboard?: boolean;
	access_income?: boolean;
	access_expenses?: boolean;
	access_reports?: boolean;
	access_calendar?: boolean;
	access_bookings?: boolean;
	access_rooms?: boolean;
	access_master_files?: boolean;
	access_accounts?: boolean;
	access_users?: boolean;
	access_settings?: boolean;
	access_booking_channels?: boolean;
}

export interface InviteUserToLocationParams {
	email: string;
	tenantId: string;
	locationId: string;
	invitedBy: string;
	permissions: LocationPermissions;
	role?: string;
}

export interface InviteUserToLocationResult {
	success: boolean;
	invitation_id?: string;
	action?: "created" | "updated";
	user_exists?: boolean;
	permissions_created?: boolean;
	token?: string;
	error?: string;
}

export interface UserLocation {
	location_id: string;
	location_name: string;
	tenant_id: string;
	permissions: LocationPermissions & {
		tenant_role: string;
		is_tenant_admin: boolean;
	};
}

/**
 * Invite a user to a specific location with custom permissions
 * Works for both existing users (immediate access) and new users (pending invitation)
 */
export const inviteUserToLocation = async (
	params: InviteUserToLocationParams,
): Promise<InviteUserToLocationResult> => {
	try {
		console.log("Inviting user to location:", params);

		const { data, error } = await supabase.rpc("invite_user_to_location", {
			p_email: params.email,
			p_tenant_id: params.tenantId,
			p_location_id: params.locationId,
			p_invited_by: params.invitedBy,
			p_permissions: params.permissions,
			p_role: params.role || "staff",
		});

		if (error) {
			console.error("Error inviting user to location:", error);
			return { success: false, error: error.message };
		}

		console.log("User invitation result:", data);
		const result = data as unknown as InviteUserToLocationResult;

		// Send appropriate email based on user existence and invitation status
		if (result.success && result.token) {
			try {
				let emailType: "existing_user" | "new_user" = "new_user";
				let emailBody: any;

				if (result.user_exists) {
					// Existing user - send location access notification
					console.log("Sending location access notification to existing user");
					emailType = "existing_user";
					emailBody = {
						to: params.email,
						email: params.email,
						invitationToken: result.token,
						loginUrl: `${window.location.origin}/invitation?token=${result.token}`,
						inviterName: "Team Admin",
						organizationName: "CheckingCheckout",
						locationName: "Your Location",
						role: params.role || "staff",
						isResend: false,
						emailType: "location_access_granted",
					};
				} else {
					// New user - send signup invitation
					console.log("Sending signup invitation to new user");
					emailType = "new_user";
					emailBody = {
						to: params.email,
						email: params.email,
						invitationToken: result.token,
						loginUrl: `${window.location.origin}/invitation?token=${result.token}`,
						inviterName: "Team Admin",
						organizationName: "CheckingCheckout",
						locationName: "Your Location",
						role: params.role || "staff",
						isResend: false,
						emailType: "signup_invitation",
					};
				}

				console.log(
					"Sending email with payload:",
					JSON.stringify(emailBody, null, 2),
				);

				const { error: emailError } = await supabase.functions.invoke(
					"send-invitation-email",
					{ body: emailBody },
				);

				if (emailError) {
					console.error(`Error sending ${emailType} email:`, emailError);
					console.error(
						"Email error details:",
						JSON.stringify(emailError, null, 2),
					);
					// Don't fail the whole invitation process if email fails
				} else {
					console.log(`${emailType} email sent successfully`);
				}
			} catch (emailException) {
				console.error("Exception sending invitation email:", emailException);
				// Don't fail the whole invitation process if email fails
			}
		}

		return result;
	} catch (error) {
		console.error("Exception inviting user to location:", error);
		return { success: false, error: "Failed to invite user to location" };
	}
};

/**
 * Get all locations a user has access to with their permissions
 */
export const getUserLocations = async (
	userId: string,
): Promise<UserLocation[]> => {
	try {
		console.log("Getting user locations for:", userId);

		const { data, error } = await supabase.rpc("get_user_locations", {
			p_user_id: userId,
		});

		if (error) {
			console.error("Error getting user locations:", error);
			return [];
		}

		console.log("User locations:", data);
		return data as unknown as UserLocation[];
	} catch (error) {
		console.error("Exception getting user locations:", error);
		return [];
	}
};

/**
 * Check if a user has access to a specific location
 */
export const userHasLocationAccess = async (
	userId: string,
	locationId: string,
): Promise<boolean> => {
	try {
		const { data, error } = await supabase
			.from("user_permissions")
			.select("id")
			.eq("user_id", userId)
			.eq("location_id", locationId)
			.single();

		if (error && error.code !== "PGRST116") {
			// PGRST116 = no rows found
			console.error("Error checking location access:", error);
			return false;
		}

		return data !== null;
	} catch (error) {
		console.error("Exception checking location access:", error);
		return false;
	}
};

/**
 * Get all pending invitations for a location (for admin management)
 */
export const getLocationPendingInvitations = async (locationId: string) => {
	try {
		const { data, error } = await supabase
			.from("user_invitations")
			.select(`
				*,
				invited_by_profile:profiles!user_invitations_invited_by_fkey(name, email),
				location:locations(name)
			`)
			.eq("location_id", locationId)
			.is("accepted_at", null)
			.gt("expires_at", new Date().toISOString())
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error getting pending invitations:", error);
			return [];
		}

		return data;
	} catch (error) {
		console.error("Exception getting pending invitations:", error);
		return [];
	}
};

/**
 * Remove user access from a specific location
 */
export const removeUserFromLocation = async (
	userId: string,
	locationId: string,
): Promise<boolean> => {
	try {
		console.log("Removing user from location:", { userId, locationId });

		// Remove from user_permissions
		const { error: permissionError } = await supabase
			.from("user_permissions")
			.delete()
			.eq("user_id", userId)
			.eq("location_id", locationId);

		if (permissionError) {
			console.error("Error removing user permissions:", permissionError);
			return false;
		}

		// Cancel any pending invitations
		const { error: invitationError } = await supabase
			.from("user_invitations")
			.delete()
			.eq("location_id", locationId)
			.is("accepted_at", null);

		if (invitationError) {
			console.warn("Warning removing pending invitations:", invitationError);
			// Don't fail the whole operation for this
		}

		console.log("User successfully removed from location");
		return true;
	} catch (error) {
		console.error("Exception removing user from location:", error);
		return false;
	}
};

/**
 * Update user permissions for a specific location
 */
export const updateUserLocationPermissions = async (
	userId: string,
	locationId: string,
	permissions: LocationPermissions,
): Promise<boolean> => {
	try {
		console.log("Updating user location permissions:", {
			userId,
			locationId,
			permissions,
		});

		const { error } = await supabase
			.from("user_permissions")
			.update({
				access_dashboard: permissions.access_dashboard ?? true,
				access_income: permissions.access_income ?? false,
				access_expenses: permissions.access_expenses ?? false,
				access_reports: permissions.access_reports ?? false,
				access_calendar: permissions.access_calendar ?? true,
				access_bookings: permissions.access_bookings ?? true,
				access_rooms: permissions.access_rooms ?? false,
				access_master_files: permissions.access_master_files ?? false,
				access_accounts: permissions.access_accounts ?? false,
				access_users: permissions.access_users ?? false,
				access_settings: permissions.access_settings ?? false,
				access_booking_channels: permissions.access_booking_channels ?? false,
			})
			.eq("user_id", userId)
			.eq("location_id", locationId);

		if (error) {
			console.error("Error updating user permissions:", error);
			return false;
		}

		console.log("User permissions updated successfully");
		return true;
	} catch (error) {
		console.error("Exception updating user permissions:", error);
		return false;
	}
};

/**
 * Default permission sets for different user roles
 */
export const DEFAULT_PERMISSIONS = {
	staff: {
		access_dashboard: true,
		access_calendar: true,
		access_bookings: true,
		access_income: false,
		access_expenses: false,
		access_reports: false,
		access_rooms: false,
		access_master_files: false,
		access_accounts: false,
		access_users: false,
		access_settings: false,
		access_booking_channels: false,
	},
	manager: {
		access_dashboard: true,
		access_calendar: true,
		access_bookings: true,
		access_income: true,
		access_expenses: true,
		access_reports: true,
		access_rooms: true,
		access_master_files: true,
		access_accounts: false,
		access_users: false,
		access_settings: false,
		access_booking_channels: false,
	},
	admin: {
		access_dashboard: true,
		access_calendar: true,
		access_bookings: true,
		access_income: true,
		access_expenses: true,
		access_reports: true,
		access_rooms: true,
		access_master_files: true,
		access_accounts: true,
		access_users: true,
		access_settings: true,
		access_booking_channels: true,
	},
} as const;
