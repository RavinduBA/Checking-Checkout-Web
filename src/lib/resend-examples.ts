/**
 * Resend Integration Example
 * 
 * This file demonstrates how to use the Resend SDK setup in your CheckingCheckout application.
 */

// Import the Resend utilities
import { resend, sendCredentialsEmail } from '@/lib/resend';

/**
 * Example 1: Direct Resend usage for custom emails
 */
export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'CheckingCheckout <onboarding@resend.dev>',
      to: [userEmail],
      subject: 'Welcome to CheckingCheckout!',
      html: `
        <h1>Welcome ${userName}!</h1>
        <p>Thank you for joining CheckingCheckout. We're excited to have you on board.</p>
        <p>If you need any help getting started, don't hesitate to reach out.</p>
        <p>Best regards,<br>The CheckingCheckout Team</p>
      `,
      text: `Welcome ${userName}! Thank you for joining CheckingCheckout.`
    });

    if (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }

    console.log('Welcome email sent:', data?.id);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error('Welcome email error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Example 2: Using the credentials email utility
 */
export const sendLoginCredentials = async (
  userEmail: string, 
  password: string, 
  isPasswordReset = false
) => {
  const loginUrl = `${window.location.origin}/auth`;
  
  const result = await sendCredentialsEmail(
    userEmail, // to
    userEmail, // email (displayed in template)
    password,  // password
    loginUrl,  // login URL
    isPasswordReset // whether this is a password reset or new invitation
  );
  
  return result;
};

/**
 * Example 3: Batch email sending
 */
export const sendBatchEmails = async (emails: Array<{to: string, subject: string, html: string}>) => {
  try {
    const results = await Promise.all(
      emails.map(async (email) => {
        const { data, error } = await resend.emails.send({
          from: 'CheckingCheckout <onboarding@resend.dev>',
          ...email
        });
        
        return { success: !error, data, error };
      })
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Batch email results: ${successful} successful, ${failed} failed`);
    return { successful, failed, results };
  } catch (error) {
    console.error('Batch email error:', error);
    return { successful: 0, failed: emails.length, error };
  }
};

/**
 * Example 4: Email with attachment (if needed in the future)
 */
export const sendEmailWithAttachment = async (
  to: string, 
  subject: string, 
  html: string, 
  attachmentUrl: string, 
  filename: string
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'CheckingCheckout <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      attachments: [
        {
          path: attachmentUrl,
          filename: filename
        }
      ]
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * Usage Examples:
 * 
 * // Send welcome email
 * await sendWelcomeEmail('user@example.com', 'John Doe');
 * 
 * // Send login credentials  
 * await sendLoginCredentials('user@example.com', 'TempPass123!', false);
 * 
 * // Send password reset
 * await sendLoginCredentials('user@example.com', 'NewPass456!', true);
 */