import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
	sendCredentialsEmail as sendResendEmail,
	sendInvitationEmail,
} from "@/lib/resend";

type UserInvitation = Database["public"]["Tables"]["user_invitations"]["Row"];

/**
 * Sends credentials email using Resend SDK (Legacy)
 */
const sendCredentialsEmail = async (
	email: string,
	password: string,
	loginUrl: string,
	isResend = false,
): Promise<{ success: boolean; error?: string }> => {
	return await sendResendEmail(email, email, password, loginUrl, isResend);
};

/**
 * Generates a secure temporary password
 */
const generateTemporaryPassword = (): string => {
	const chars =
		"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
	let password = "";
	for (let i = 0; i < 12; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return password;
};

/**
 * Generates a random invitation token
 */
const generateInvitationToken = (): string => {
	return Array.from(crypto.getRandomValues(new Uint8Array(32)))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
};

/**
 * Creates a new user invitation for a specific tenant using secure token-based approach
 */
export const createInvitation = async (
	tenantId: string,
	email: string,
	role: string = "staff",
	permissions: Record<string, boolean> = {},
	inviterName?: string,
	organizationName?: string,
	locationName?: string,
	locationId?: string,
): Promise<{
	success: boolean;
	data?: UserInvitation & { invitationToken?: string; loginUrl?: string };
	error?: string;
}> => {
	try {
		// Generate unique token for invitation
		const token = generateInvitationToken();

		// Get current user for inviter context
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();

		// Ensure permissions have proper structure for the invitation processor
		const processedPermissions = {
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
			...permissions, // Override with provided permissions
		};

		// Create invitation record for tracking
		const { data: invitationData, error: invitationError } = await supabase
			.from("user_invitations")
			.insert({
				tenant_id: tenantId,
				email,
				role,
				token,
				permissions: processedPermissions,
				location_id: locationId, // Include location_id if provided
				expires_at: new Date(
					Date.now() + 7 * 24 * 60 * 60 * 1000,
				).toISOString(), // 7 days from now
				invited_by: currentUser?.id || "",
			})
			.select()
			.single();

		if (invitationError) {
			console.error("Error creating invitation record:", invitationError);
			return { success: false, error: invitationError.message };
		}

		// Send invitation email with token using Edge Function
		try {
			const { error: emailError } = await supabase.functions.invoke(
				"send-invitation-email",
				{
					body: {
						to: email,
						email: email,
						invitationToken: token,
						loginUrl: `${window.location.origin}/invitation?token=${token}`,
						inviterName: inviterName || "Team Admin",
						organizationName: organizationName || "CheckingCheckout",
						locationName: locationName || "Your Location",
						role: role || "staff",
						isResend: false,
					},
				},
			);

			if (emailError) {
				console.error("Failed to send invitation email:", emailError);

				// Clean up invitation record if email failed
				await supabase
					.from("user_invitations")
					.delete()
					.eq("id", invitationData.id);

				return {
					success: false,
					error: `Failed to send invitation email: ${emailError.message}`,
				};
			}

			console.log("Invitation email sent successfully");
		} catch (emailException) {
			console.error("Exception sending invitation email:", emailException);

			// Clean up invitation record if email failed
			await supabase
				.from("user_invitations")
				.delete()
				.eq("id", invitationData.id);

			return {
				success: false,
				error: `Failed to send invitation email: ${emailException}`,
			};
		}

		return {
			success: true,
			data: {
				...invitationData,
				invitationToken: token,
			},
		};
	} catch (error) {
		console.error("Exception creating invitation:", error);
		return { success: false, error: "Failed to create invitation" };
	}
};

/**
 * Validates an invitation token and returns invitation details
 */
export const validateInvitationToken = async (
	token: string,
): Promise<{
	success: boolean;
	data?: UserInvitation;
	error?: string;
}> => {
	try {
		// Find the invitation
		const { data: invitation, error: fetchError } = await supabase
			.from("user_invitations")
			.select("*")
			.eq("token", token)
			.gt("expires_at", new Date().toISOString())
			.is("accepted_at", null)
			.single();

		if (fetchError || !invitation) {
			return { success: false, error: "Invalid or expired invitation token" };
		}

		return {
			success: true,
			data: invitation,
		};
	} catch (error) {
		console.error("Exception validating invitation token:", error);
		return { success: false, error: "Failed to validate invitation token" };
	}
};

/**
 * Accepts an invitation using the invitation token and creates user account with permissions
 */
export const acceptInvitation = async (
	token: string,
	password: string,
): Promise<{
	success: boolean;
	data?: { tenant_id: string; role: string; user_id: string };
	error?: string;
}> => {
	try {
		// Find the invitation
		const { data: invitation, error: fetchError } = await supabase
			.from("user_invitations")
			.select("*")
			.eq("token", token)
			.gt("expires_at", new Date().toISOString())
			.is("accepted_at", null)
			.single();

		if (fetchError || !invitation) {
			return { success: false, error: "Invalid or expired invitation" };
		}

		// Create user account with the provided password
		const { data: userData, error: userError } =
			await supabase.auth.admin.createUser({
				email: invitation.email,
				password: password,
				email_confirm: true, // Skip email confirmation
				user_metadata: {
					invited_via: "token_invitation",
					tenant_id: invitation.tenant_id,
					role: invitation.role,
					permissions: invitation.permissions,
				},
			});

		if (userError) {
			console.error("Error creating user account:", userError);
			return { success: false, error: userError.message };
		}

		const userId = userData.user?.id;
		if (!userId) {
			return { success: false, error: "Failed to get user ID after creation" };
		}

		// Create user profile
		const { error: profileError } = await supabase.from("profiles").upsert({
			id: userId,
			email: invitation.email,
			tenant_id: invitation.tenant_id,
			role: invitation.role as any,
			name: invitation.email, // Use email as default name
		});

		if (profileError) {
			console.error("Error creating user profile:", profileError);
			return { success: false, error: profileError.message };
		}

		// Create user permissions directly since invitation-processor doesn't export the required function
		const permissionsData =
			invitation.permissions && typeof invitation.permissions === "object"
				? (invitation.permissions as Record<string, any>)
				: {};

		const { error: permissionsError } = await supabase
			.from("user_permissions")
			.insert({
				user_id: userId,
				tenant_id: invitation.tenant_id,
				location_id: invitation.location_id,
				...permissionsData,
				tenant_role: invitation.role as any,
			});

		if (permissionsError) {
			console.error("Error creating user permissions:", permissionsError);
			// Don't fail the whole process, just log the error
		}

		// Mark invitation as accepted
		const { error: updateError } = await supabase
			.from("user_invitations")
			.update({
				accepted_at: new Date().toISOString(),
				accepted_by: userId,
			})
			.eq("id", invitation.id);

		if (updateError) {
			console.error("Error updating invitation:", updateError);
			// Don't fail the process for this
		}

		return {
			success: true,
			data: {
				tenant_id: invitation.tenant_id || "",
				role: invitation.role,
				user_id: userId,
			},
		};
	} catch (error) {
		console.error("Exception accepting invitation:", error);
		return { success: false, error: "Failed to accept invitation" };
	}
};

/**
 * Fetches all invitations for a specific tenant
 */
export const getInvitations = async (
	tenantId: string,
): Promise<{ success: boolean; data?: UserInvitation[]; error?: string }> => {
	try {
		const { data, error } = await supabase
			.from("user_invitations")
			.select("*")
			.eq("tenant_id", tenantId)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error fetching invitations:", error);
			return { success: false, error: error.message };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		console.error("Exception fetching invitations:", error);
		return { success: false, error: "Failed to fetch invitations" };
	}
};

/**
 * Deletes/revokes an invitation
 */
export const revokeInvitation = async (
	invitationId: string,
): Promise<{ success: boolean; error?: string }> => {
	try {
		const { error } = await supabase
			.from("user_invitations")
			.delete()
			.eq("id", invitationId);

		if (error) {
			console.error("Error revoking invitation:", error);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error) {
		console.error("Exception revoking invitation:", error);
		return { success: false, error: "Failed to revoke invitation" };
	}
};

/**
 * Resends an invitation by creating a new token
 * Now checks if user has signed up since invitation was sent
 */
export const resendInvitation = async (
	invitationEmail: string,
	inviterName?: string,
	organizationName?: string,
	locationName?: string,
): Promise<{
	success: boolean;
	error?: string;
	data?: { email: string; invitationToken: string };
}> => {
	try {
		// Get the existing invitation details
		const { data: invitationData, error: invitationError } = await supabase
			.from("user_invitations")
			.select("*")
			.eq("email", invitationEmail)
			.is("accepted_at", null)
			.single();

		if (invitationError || !invitationData) {
			return { success: false, error: "Active invitation not found" };
		}

		// Check if user has signed up since invitation was sent
		const { data: userProfile } = await supabase
			.from("profiles")
			.select("id")
			.eq("email", invitationEmail)
			.single();

		const userExists = !!userProfile;
		console.log(`Resending invitation: user exists = ${userExists}`);

		// Generate a new invitation token
		const newToken = generateInvitationToken();

		// Update the invitation with new token and extended expiry
		const { error: updateError } = await supabase
			.from("user_invitations")
			.update({
				token: newToken,
				expires_at: new Date(
					Date.now() + 7 * 24 * 60 * 60 * 1000,
				).toISOString(), // 7 days from now
			})
			.eq("id", invitationData.id);

		if (updateError) {
			console.error("Error updating invitation:", updateError);
			return { success: false, error: updateError.message };
		}

		// Send new invitation email with token using Edge Function
		// Use appropriate email type based on whether user has signed up
		try {
			const emailType = userExists
				? "location_access_granted"
				: "signup_invitation";
			console.log(`Sending ${emailType} email for resend`);

			const { error: emailError } = await supabase.functions.invoke(
				"send-invitation-email",
				{
					body: {
						to: invitationEmail,
						email: invitationEmail,
						invitationToken: newToken,
						loginUrl: `${window.location.origin}/invitation?token=${newToken}`,
						inviterName: inviterName || "Team Admin",
						organizationName: organizationName || "CheckingCheckout",
						locationName: locationName || "Your Location",
						role: invitationData.role || "staff",
						isResend: true,
						emailType: emailType,
					},
				},
			);

			if (emailError) {
				console.error("Error sending resend invitation email:", emailError);
				return {
					success: false,
					error: `New invitation token was generated but failed to send email: ${emailError.message}`,
				};
			}

			console.log("Resend invitation email sent successfully");
		} catch (emailException) {
			console.error(
				"Exception sending resend invitation email:",
				emailException,
			);
			return {
				success: false,
				error: `New invitation token was generated but failed to send email: ${emailException}`,
			};
		}

		return {
			success: true,
			data: {
				email: invitationEmail,
				invitationToken: newToken,
			},
		};
	} catch (error) {
		console.error("Exception resending invitation:", error);
		return { success: false, error: "Failed to resend invitation" };
	}
};

/**
 * Auto-accept pending invitations when user logs in
 * Called from AuthContext when user session is established
 */
export const handlePendingInvitationsOnLogin = async (
	userEmail: string,
	userId: string,
): Promise<{ acceptedCount: number; errors: string[] }> => {
	try {
		console.log("Checking for pending invitations for:", userEmail);

		// Get all pending invitations for this user
		const { data: pendingInvitations, error: fetchError } = await supabase
			.from("user_invitations")
			.select("*")
			.eq("email", userEmail)
			.is("accepted_at", null)
			.gt("expires_at", new Date().toISOString());

		if (fetchError) {
			console.error("Error fetching pending invitations:", fetchError);
			return { acceptedCount: 0, errors: [fetchError.message] };
		}

		if (!pendingInvitations || pendingInvitations.length === 0) {
			console.log("No pending invitations found");
			return { acceptedCount: 0, errors: [] };
		}

		console.log(`Found ${pendingInvitations.length} pending invitations`);
		const errors: string[] = [];
		let acceptedCount = 0;

		// Process each pending invitation using the RPC function
		for (const invitation of pendingInvitations) {
			try {
				// Use the RPC function to accept the invitation
				const { data: result, error: rpcError } = await supabase.rpc(
					"accept_invitation",
					{
						p_token: invitation.token,
					},
				);

				if (rpcError) {
					console.error(
						`RPC error accepting invitation ${invitation.id}:`,
						rpcError,
					);
					errors.push(
						`Failed to accept invitation for ${invitation.tenant_id}: ${rpcError.message}`,
					);
					continue;
				}

				// Parse the result as our expected response format
				const response = result as {
					success: boolean;
					error?: string;
					data?: any;
				};

				if (!response?.success) {
					console.error(
						`Invitation acceptance failed for ${invitation.id}:`,
						response?.error,
					);
					errors.push(
						`Failed to accept invitation for ${invitation.tenant_id}: ${response?.error || "Unknown error"}`,
					);
				} else {
					console.log(
						`Successfully accepted invitation ${invitation.id} for tenant ${invitation.tenant_id}`,
					);
					acceptedCount++;
				}
			} catch (invitationError: any) {
				console.error(
					`Exception processing invitation ${invitation.id}:`,
					invitationError,
				);
				errors.push(`Failed to process invitation: ${invitationError.message}`);
			}
		}

		console.log(
			`Accepted ${acceptedCount} invitations with ${errors.length} errors`,
		);
		return { acceptedCount, errors };
	} catch (error: any) {
		console.error("Exception handling pending invitations:", error);
		return { acceptedCount: 0, errors: [error.message || "Unknown error"] };
	}
};

/**
 * Hook for managing invitations with toast notifications
 */
export const useInvitations = (tenantId?: string) => {
	const { toast } = useToast();

	const inviteUser = async (
		email: string,
		role: string = "staff",
		permissions: Record<string, boolean> = {},
	) => {
		if (!tenantId) {
			toast({
				title: "Error",
				description: "No tenant selected",
				variant: "destructive",
			});
			return { success: false };
		}

		const result = await createInvitation(tenantId, email, role, permissions);

		if (result.success) {
			toast({
				title: "Invitation Sent",
				description: `An invitation has been sent to ${email}`,
			});
		} else {
			toast({
				title: "Failed to Send Invitation",
				description: result.error || "Unknown error occurred",
				variant: "destructive",
			});
		}

		return result;
	};

	const revokeUserInvitation = async (invitationId: string) => {
		const result = await revokeInvitation(invitationId);

		if (result.success) {
			toast({
				title: "Invitation Revoked",
				description: "The invitation has been successfully revoked",
			});
		} else {
			toast({
				title: "Failed to Revoke Invitation",
				description: result.error || "Unknown error occurred",
				variant: "destructive",
			});
		}

		return result;
	};

	const resendUserInvitation = async (invitationEmail: string) => {
		const result = await resendInvitation(invitationEmail);

		if (result.success) {
			toast({
				title: "Invitation Resent",
				description: "The invitation has been resent successfully",
			});
		} else {
			toast({
				title: "Failed to Resend Invitation",
				description: result.error || "Unknown error occurred",
				variant: "destructive",
			});
		}

		return result;
	};

	return {
		inviteUser,
		revokeUserInvitation,
		resendUserInvitation,
		getInvitations,
		acceptInvitation,
	};
};
