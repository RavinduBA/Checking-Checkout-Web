import { Resend } from 'resend';
import { supabase } from '@/integrations/supabase/client';

// Initialize Resend client with API key from environment
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export { resend };

// Utility function to send credentials email
// For production, this should be moved to a backend/Edge Function to avoid CORS issues
export const sendCredentialsEmail = async (
  to: string,
  email: string,
  password: string,
  loginUrl: string,
  isResend: boolean = false
) => {
  // First try to use Edge Function if available, fallback to direct API call
  try {
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        to,
        email,
        password,
        loginUrl,
        isResend,
      },
    });

    if (!error && data?.success) {
      console.log('📧 Email sent successfully via Edge Function:', { id: data.emailId, to });
      return { success: true, emailId: data.emailId };
    }
    
    // If Edge Function fails, log and continue to fallback
    console.log('Edge Function not available or failed, using direct API call');
  } catch (edgeFunctionError) {
    console.log('Edge Function not available, using direct API call');
  }

  // Fallback to direct Resend API call (development only)
  const subject = isResend 
    ? "Your Updated Login Credentials - CheckingCheckout"
    : "Welcome to CheckingCheckout - Your Login Credentials";
  
  const textContent = `
Hello,

${isResend ? 'Your login credentials have been updated' : 'You\'ve been invited to join CheckingCheckout'}. Here are your login details:

Email: ${email}
Temporary Password: ${password}
Login URL: ${loginUrl}

Please log in and change your password on your first visit for security.

Best regards,
CheckingCheckout Team

---
This email contains sensitive login information. Please keep it secure and delete it after changing your password.
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0 0 10px 0;">CheckingCheckout</h1>
        <h2 style="margin: 0; font-size: 18px; color: #374151;">
            ${isResend ? 'Your Updated Login Credentials' : 'Welcome! Your Login Credentials'}
        </h2>
    </div>
    
    <p>Hello,</p>
    
    <p>${isResend ? 'Your login credentials have been updated' : 'You\'ve been invited to join CheckingCheckout'}. Here are your login details:</p>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${password}</code></p>
        <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #2563eb; text-decoration: none;">${loginUrl}</a></p>
    </div>
    
    <p style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <strong>Important:</strong> Please log in and change your password on your first visit for security.
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

  try {
    console.warn('⚠️  Using direct Resend API call from frontend - this may cause CORS issues in production');
    
    const { data, error } = await resend.emails.send({
      from: 'CheckingCheckout <onboarding@resend.dev>',
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    console.log('📧 Email sent successfully:', { id: data?.id, to });
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message };
  }
};