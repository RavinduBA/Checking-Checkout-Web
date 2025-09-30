import { supabase } from "@/integrations/supabase/client";

/**
 * Send credentials email via Supabase Edge Function (Legacy)
 *
 * This implementation follows the Resend documentation for Supabase Edge Functions:
 * https://resend.com/docs/send-with-supabase-edge-functions
 *
 * Benefits of using Edge Functions instead of client-side SDK:
 * - Better security (API keys not exposed to client)
 * - No CORS issues
 * - Server-side rate limiting
 * - Easier deployment and environment management
 */
export const sendCredentialsEmail = async (
	to: string,
	email: string,
	password: string,
	loginUrl: string,
	isResend: boolean = false,
) => {
	try {
		console.log("📧 Sending email via Supabase Edge Function");

		const { data, error } = await supabase.functions.invoke(
			"send-invitation-email",
			{
				body: {
					to,
					email,
					password,
					loginUrl,
					isResend,
				},
			},
		);

		if (error) {
			console.error("Edge Function error:", error);
			return {
				success: false,
				error: error.message || "Failed to send email via Edge Function",
			};
		}

		if (!data?.success) {
			console.error("Email sending failed:", data);
			return {
				success: false,
				error: data?.error || "Email sending failed",
			};
		}

		console.log("📧 Email sent successfully via Edge Function:", {
			id: data.emailId,
			to,
		});

		return {
			success: true,
			emailId: data.emailId,
		};
	} catch (error: any) {
		console.error("Unexpected error sending email:", error);
		return {
			success: false,
			error: error.message || "Unexpected error occurred",
		};
	}
};

/**
 * Send invitation email with secure token via Supabase Edge Function
 *
 * This is the new secure approach using invitation tokens instead of passwords
 */
export const sendInvitationEmail = async (
	to: string,
	email: string,
	invitationToken: string,
	inviterName?: string,
	organizationName?: string,
	locationName?: string,
	role?: string,
	loginUrl?: string,
	isResend: boolean = false,
) => {
	try {
		console.log("📧 Sending invitation email via Supabase Edge Function");

		const { data, error } = await supabase.functions.invoke(
			"send-invitation-email",
			{
				body: {
					to,
					email,
					invitationToken,
					inviterName,
					organizationName,
					locationName,
					role,
					loginUrl: loginUrl || `${window.location.origin}/auth`,
					isResend,
				},
			},
		);

		if (error) {
			console.error("Edge Function error:", error);
			return {
				success: false,
				error:
					error.message || "Failed to send invitation email via Edge Function",
			};
		}

		if (!data?.success) {
			console.error("Invitation email sending failed:", data);
			return {
				success: false,
				error: data?.error || "Invitation email sending failed",
			};
		}

		console.log("📧 Invitation email sent successfully via Edge Function:", {
			id: data.emailId,
			to,
		});

		return {
			success: true,
			emailId: data.emailId,
		};
	} catch (error: any) {
		console.error("Unexpected error sending invitation email:", error);
		return {
			success: false,
			error: error.message || "Unexpected error occurred",
		};
	}
};
