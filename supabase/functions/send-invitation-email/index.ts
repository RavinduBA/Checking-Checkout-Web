import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  to: string
  email: string
  password: string
  loginUrl: string
  isResend?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { to, email, password, loginUrl, isResend = false }: RequestBody = await req.json()

    if (!to || !email || !password || !loginUrl) {
      throw new Error('Missing required fields: to, email, password, loginUrl')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const subject = isResend 
      ? "Your Updated Login Credentials - CheckingCheckout"
      : "Welcome to CheckingCheckout - Your Login Credentials"
    
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
    `.trim()

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
    `.trim()

    // Send email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CheckingCheckout <onboarding@resend.dev>',
        to: [to],
        subject,
        html: htmlContent,
        text: textContent,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', result)
      throw new Error(`Failed to send email: ${result.message || 'Unknown error'}`)
    }

    console.log('📧 Email sent successfully:', { id: result.id, to })

    return new Response(
      JSON.stringify({
        success: true,
        emailId: result.id,
        message: 'Invitation email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})