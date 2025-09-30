/**
 * Email Integration Examples via Supabase Edge Functions
 *
 * This file demonstrates how to use the Edge Function approach for email sending.
 * The Resend SDK has been replaced with Supabase Edge Functions for better security.
 */

// Import the Edge Function-based email utilities
import { sendCredentialsEmail } from "@/lib/resend";

/**
 * Example 1: Custom email via Edge Function
 * Note: For custom emails, you would need to create additional Edge Functions
 * or extend the existing send-invitation-email function to handle different email types
 */
export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
	// This is a placeholder - you would need to implement a custom Edge Function
	// for welcome emails or extend the existing invitation email function
	console.log("Custom emails require additional Edge Function implementation");
	console.log("Parameters:", { userEmail, userName });

	return {
		success: false,
		error:
			"Custom email sending requires Edge Function implementation. Please create a dedicated Edge Function for welcome emails.",
	};
};

/**
 * Example 2: Using the credentials email utility
 */
export const sendLoginCredentials = async (
	userEmail: string,
	password: string,
	isPasswordReset = false,
) => {
	const loginUrl = `${window.location.origin}/auth`;

	const result = await sendCredentialsEmail(
		userEmail, // to
		userEmail, // email (displayed in template)
		password, // password
		loginUrl, // login URL
		isPasswordReset, // whether this is a password reset or new invitation
	);

	return result;
};

/**
 * Example 3: Batch email sending
 * Note: This would require implementing batch functionality in Edge Functions
 */
export const sendBatchEmails = async (
	emails: Array<{ to: string; password: string; isPasswordReset?: boolean }>,
) => {
	try {
		const results = await Promise.all(
			emails.map(async (email) => {
				return await sendLoginCredentials(
					email.to,
					email.password,
					email.isPasswordReset || false,
				);
			}),
		);

		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;

		console.log(
			`Batch email results: ${successful} successful, ${failed} failed`,
		);
		return { successful, failed, results };
	} catch (error: any) {
		console.error("Batch email error:", error);
		return { successful: 0, failed: emails.length, error: error.message };
	}
};

/**
 * Example 4: Email with attachment (if needed in the future)
 * Note: This would require implementing attachment functionality in Edge Functions
 */
export const sendEmailWithAttachment = async (
	to: string,
	subject: string,
	html: string,
	attachmentUrl: string,
	filename: string,
) => {
	console.log(
		"Email attachments require additional Edge Function implementation",
	);
	console.log("Parameters:", { to, subject, attachmentUrl, filename });

	return {
		success: false,
		error:
			"Email attachments require Edge Function implementation. Please extend the Edge Function to support attachments.",
	};
};

/**
 * Usage Examples:
 *
 * // Send welcome email (requires custom Edge Function)
 * await sendWelcomeEmail('user@example.com', 'John Doe');
 *
 * // Send login credentials
 * await sendLoginCredentials('user@example.com', 'TempPass123!', false);
 *
 * // Send password reset
 * await sendLoginCredentials('user@example.com', 'NewPass456!', true);
 *
 * // Send batch credentials
 * await sendBatchEmails([
 *   { to: 'user1@example.com', password: 'Pass1!' },
 *   { to: 'user2@example.com', password: 'Pass2!', isPasswordReset: true }
 * ]);
 */
