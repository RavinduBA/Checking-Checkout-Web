# Password Reset Setup Instructions

## Email Template Configuration

You need to configure the password reset email template in your Supabase dashboard to work with the forgot password functionality.

### Steps to Configure:

1. **Go to your Supabase Dashboard**
   - Navigate to Authentication → Email Templates
   - Select "Reset Password" template

2. **Update the Email Template**
   
   **Subject:**
   ```
   Reset your password for {{ .SiteName }}
   ```
   
   **HTML Body:**
   ```html
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <div style="text-align: center; margin-bottom: 30px;">
       <h1 style="color: #333; margin-bottom: 10px;">Reset Your Password</h1>
       <p style="color: #666; font-size: 16px;">We received a request to reset your password for your CheckingCheckout account.</p>
     </div>
     
     <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
       <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Click the button below to reset your password:</p>
       
       <div style="text-align: center;">
         <a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery" 
            style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
           Reset Password
         </a>
       </div>
       
       <p style="color: #666; font-size: 14px; margin-top: 20px; text-align: center;">
         This link will expire in 24 hours for security reasons.
       </p>
     </div>
     
     <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
       <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
         If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
       </p>
       
       <p style="color: #666; font-size: 14px;">
         If you're having trouble clicking the button, copy and paste this link into your browser:
       </p>
       <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">
         {{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery
       </p>
     </div>
   </div>
   ```

3. **Configure Site URL**
   - In your Supabase dashboard, go to Authentication → URL Configuration
   - Set your Site URL to your domain (e.g., `https://yourdomain.com` or `http://localhost:5173` for development)
   - Add your domain to the list of allowed redirect URLs

## Security Notes

- Password reset links expire after 24 hours
- Users can only have one active reset token at a time
- The new password must meet the validation criteria:
  - At least 6 characters long
  - Contains uppercase letter
  - Contains lowercase letter
  - Contains at least one number

## Development Setup

For local development, make sure your Site URL is set to `http://localhost:5173` (or whatever port your dev server uses).

## Features Included

### Forgot Password Page (`/auth/forgot-password`)
- Clean, user-friendly interface
- Email validation
- Loading states
- Success confirmation with resend option
- Navigation back to sign in

### Reset Password Page (`/auth/reset-password`)
- Token verification
- Strong password validation
- Password confirmation
- Visual feedback for password requirements
- Success confirmation
- Automatic redirect to sign in

### Auth Page Updates
- Added "Forgot your password?" link on login form
- Handles recovery tokens from email links
- Redirects to appropriate reset page

## Testing

1. Test the forgot password flow:
   - Go to `/auth/forgot-password`
   - Enter a valid email address
   - Check email for reset link
   - Click the reset link
   - Set a new password
   - Verify you can sign in with the new password

2. Test edge cases:
   - Invalid/expired tokens
   - Password validation
   - Email not found
   - Network errors