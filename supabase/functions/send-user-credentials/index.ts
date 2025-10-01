import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
	to: string;
	email: string;
	password?: string;
	loginUrl: string;
	organizationName?: string;
	role?: string;
	emailType: 'new_user_credentials' | 'location_access_granted';
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
		const {
			to,
			email,
			password,
			loginUrl,
			organizationName = "CheckingCheckout",
			role = "team member",
			emailType,
		}: RequestBody = await req.json();

		if (!to || !email || !loginUrl) {
			throw new Error("Missing required fields: to, email, loginUrl");
		}

		const resendApiKey = Deno.env.get("RESEND_API_KEY");
		if (!resendApiKey) {
			throw new Error("RESEND_API_KEY not configured");
		}

		let subject: string;
		let textContent: string;
		let htmlContent: string;

		if (emailType === "new_user_credentials") {
			// New user - send credentials
			if (!password) {
				throw new Error("Password required for new user credentials");
			}

			subject = `Welcome to ${organizationName} - Your Account Details`;
			
			textContent = `
Welcome to ${organizationName}!

Your account has been created successfully. Here are your login credentials:

Email: ${email}
Password: ${password}

Please log in using the link below:
${loginUrl}

For security reasons, we recommend changing your password after your first login.

Your role: ${role}

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
        <h1 style="margin: 0 0 10px 0;">🎉 Welcome to ${organizationName}!</h1>
        <h2 style="margin: 0; font-size: 18px; opacity: 0.9;">Your Account is Ready</h2>
    </div>
    
    <p>Hello,</p>
    
    <p>Your account has been created successfully! Here are your login credentials:</p>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #10b981;">Login Credentials</h3>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${password}</code></p>
        <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Your Account</a>
    </div>
    
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>🔒 Security Tip:</strong> For your security, we recommend changing your password after your first login.</p>
    </div>
    
    <p>Best regards,<br>
    ${organizationName} Team</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #6b7280;">
        You received this email because an account was created for you in ${organizationName}. If you did not expect this, please contact support.
    </p>
</body>
</html>
			`.trim();

		} else {
			// Existing user - location access granted
			subject = `New Location Access: ${organizationName}`;
			
			textContent = `
Hello,

Great news! You've been granted access to a new location in ${organizationName}.

Your role: ${role}

You can now log in to your existing account and access the new location:
${loginUrl}

Your permissions have been updated automatically. Simply log in with your existing credentials to access the new location.

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
        <h1 style="margin: 0 0 10px 0;">🎉 New Location Access!</h1>
        <h2 style="margin: 0; font-size: 18px; opacity: 0.9;">${organizationName}</h2>
    </div>
    
    <p>Hello,</p>
    
    <p><strong>Great news!</strong> You've been granted access to a new location in <strong>${organizationName}</strong>.</p>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Your role:</strong> ${role}</p>
        <p style="margin: 0;">Your permissions have been updated automatically.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Access New Location</a>
    </div>
    
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>✨ What's Next:</strong> Simply log in with your existing credentials to access the new location and its features.</p>
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
		}

		// Send email using Resend
		const emailResponse = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${resendApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: "CheckingCheckout <checkingcheckout@mail.netronk.com>",
				to: [to],
				subject: subject,
				text: textContent,
				html: htmlContent,
			}),
		});

		if (!emailResponse.ok) {
			const errorText = await emailResponse.text();
			throw new Error(`Resend API error: ${emailResponse.status} ${errorText}`);
		}

		const emailResult = await emailResponse.json();
		console.log("Email sent successfully:", emailResult);

		return new Response(
			JSON.stringify({ 
				success: true, 
				email_id: emailResult.id,
				message: `${emailType === 'new_user_credentials' ? 'Credentials' : 'Notification'} email sent successfully`
			}),
			{
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);

	} catch (error) {
		console.error("Error sending email:", error);
		return new Response(
			JSON.stringify({ success: false, error: error.message }),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	}
});