import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
	to: string;
	email: string;
	invitationToken: string;
	inviterName?: string;
	organizationName?: string;
	locationName?: string;
	role?: string;
	loginUrl: string;
	isResend?: boolean;
	emailType?: 'signup_invitation' | 'location_access_granted';
}

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, {
			status: 200,
			headers: corsHeaders,
		});
	}

	try {
		// Initialize Supabase client with service role
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
		);

		const {
			to,
			email,
			invitationToken,
			inviterName,
			organizationName = "CheckingCheckout",
			locationName,
			role = "team member",
			loginUrl,
			isResend = false,
			emailType = "signup_invitation",
		}: RequestBody = await req.json();

		if (!to || !email || !invitationToken || !loginUrl) {
			throw new Error("Missing required fields: to, email, invitationToken, loginUrl");
		}

		const resendApiKey = Deno.env.get("RESEND_API_KEY");
		if (!resendApiKey) {
			throw new Error("RESEND_API_KEY not configured");
		}

		let subject: string;
		let textContent: string;
		let htmlContent: string;
		let invitationUrl: string;

		if (emailType === "location_access_granted") {
			// Existing user - location access granted
			invitationUrl = `${loginUrl}?message=location_access_granted`;
			subject = `Access Granted: ${organizationName}${locationName ? ` - ${locationName}` : ""}`;
			
			textContent = `
Hello,

Great news! You've been granted access to ${organizationName}${locationName ? ` at ${locationName}` : ""} as a ${role}.

${inviterName ? `${inviterName} has added you to their location.` : "You've been added to a new location."}

You can now log in to your existing account and access the new location:

Login: ${invitationUrl}

Your new permissions include:
- Access to ${locationName || "the location"} management
- ${role} level permissions
- Immediate access to all assigned features

Best regards,
${organizationName} Team
			`.trim();

			htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <h1 style="margin: 0 0 10px 0;">🎉 Access Granted!</h1>
        <h2 style="margin: 0; font-size: 18px; opacity: 0.9;">${organizationName}</h2>
    </div>
    
    <p>Hello,</p>
    
    <p><strong>Great news!</strong> You've been granted access to <strong>${organizationName}</strong>${locationName ? ` at <strong>${locationName}</strong>` : ""} as a <strong>${role}</strong>.</p>
    
    ${inviterName ? `<p><strong>${inviterName}</strong> has added you to their location.` : "<p>You've been added to a new location.</p>"}
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Ready to access your new location?</strong></p>
        <a href="${invitationUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In Now</a>
    </div>
    
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Your new permissions include:</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
            <li>Access to ${locationName || "the location"} management</li>
            <li>${role} level permissions</li>
            <li>Immediate access to all assigned features</li>
        </ul>
    </div>
    
    <p>Best regards,<br>
    ${organizationName} Team</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #6b7280;">
        You received this email because you were granted access to a new location in ${organizationName}.
    </p>
</body>
</html>
			`.trim();
		} else {
			// New user - signup invitation (original logic)
			invitationUrl = `${loginUrl}?token=${invitationToken}&invitation=true`;
			subject = isResend
				? `Reminder: Join ${organizationName} - Your Invitation`
				: `You're invited to join ${organizationName}`;
			
			textContent = `
Hello,

${isResend ? "This is a reminder that you've been invited" : "You've been invited"} to join ${organizationName}${locationName ? ` at ${locationName}` : ""} as a ${role}.

${inviterName ? `${inviterName} has invited you to collaborate on the hospitality management platform.` : "You've been invited to collaborate on the hospitality management platform."}

To accept this invitation and set up your account:

1. Click the link below
2. Complete your account setup
3. Start managing your hospitality operations

Invitation Link: ${invitationUrl}

This invitation will expire in 7 days for security reasons.

Best regards,
${organizationName} Team

---
If you didn't expect this invitation, you can safely ignore this email.
			`.trim();

			htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0 0 10px 0;">${organizationName}</h1>
        <h2 style="margin: 0; font-size: 18px; color: #374151;">
            ${isResend ? "Reminder: You're Invited!" : "You're Invited to Join!"}
        </h2>
    </div>
    
    <p>Hello,</p>
    
    <p>${isResend ? "This is a reminder that you've been invited" : "You've been invited"} to join <strong>${organizationName}</strong>${locationName ? ` at <strong>${locationName}</strong>` : ""} as a <strong>${role}</strong>.</p>
    
    ${inviterName ? `<p><strong>${inviterName}</strong> has invited you to collaborate on the hospitality management platform.</p>` : "<p>You've been invited to collaborate on the hospitality management platform.</p>"}
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Ready to get started?</strong></p>
        <a href="${invitationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation & Set Up Account</a>
    </div>
    
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>What's next?</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
            <li>Click the invitation link above</li>
            <li>Complete your account setup</li>
            <li>Start managing your hospitality operations</li>
        </ul>
    </div>
    
    <p style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <strong>⚡ Important:</strong> This invitation expires in 7 days for security reasons.
    </p>
    
    <p>Best regards,<br>
    CheckingCheckout Team</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #6b7280;">
        This email contains sensitive login information. Please keep it secure and delete it after changing your password.
    </p>
</body>
</html>
			`.trim();
		}

		// Use verified email address for testing environment
		// In production, this should be updated to use a verified domain
		const fromEmail = "CheckingCheckout <checkingcheckout@mail.netronk.com>"; // Use verified email in testing

		// Send email via Resend API
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: fromEmail,
				to: [to],
				subject: subject,
				html: htmlContent,
			}),
		});

		const result = await response.json();

		if (!response.ok) {
			console.error("Resend API error:", result);
			throw new Error(
				`Failed to send email: ${result.message || "Unknown error"}`,
			);
		}

		console.log("📧 Email sent successfully:", { id: result.id, to });

		return new Response(
			JSON.stringify({
				success: true,
				emailId: result.id,
				message: "Invitation email sent successfully",
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error) {
		console.error("Function error:", error);

		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "An unknown error occurred",
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 400,
			},
		);
	}
});
