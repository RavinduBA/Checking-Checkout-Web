import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { sendCredentialsEmail as sendResendEmail } from "@/lib/resend";

type UserInvitation = Database["public"]["Tables"]["user_invitations"]["Row"];

/**
 * Sends credentials email using Resend SDK
 */
const sendCredentialsEmail = async (
  email: string, 
  password: string, 
  loginUrl: string, 
  isResend = false
): Promise<{ success: boolean; error?: string }> => {
  return await sendResendEmail(email, email, password, loginUrl, isResend);
};

/**
 * Generates a secure temporary password
 */
const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
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
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Creates a new user invitation for a specific tenant
 */
export const createInvitation = async (
  tenantId: string,
  email: string,
  role: string = "staff",
  permissions: Record<string, boolean> = {}
): Promise<{ success: boolean; data?: UserInvitation & { temporaryPassword?: string; loginUrl?: string }; error?: string }> => {
  try {
    // Generate a temporary password
    const temporaryPassword = generateTemporaryPassword();
    
    // Create user directly with admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        invited_via: 'admin_invitation',
        tenant_id: tenantId,
        role: role,
        permissions: permissions
      }
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return { success: false, error: userError.message };
    }

    // Generate unique token for our tracking
    const token = generateInvitationToken();
    
    // Create invitation record for tracking
    const { data: invitationData, error: invitationError } = await supabase
      .from("user_invitations")
      .insert({
        tenant_id: tenantId,
        email,
        role,
        token,
        permissions,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        invited_by: userData.user?.id || '' // Track who was invited
      })
      .select()
      .single();

    if (invitationError) {
      console.error("Error creating invitation record:", invitationError);
      return { success: false, error: invitationError.message };
    }

    // Send credentials via email
    const loginUrl = `${window.location.origin}/auth`;
    const emailResult = await sendCredentialsEmail(email, temporaryPassword, loginUrl, false);
    
    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      return {
        success: false,
        error: `User was created but failed to send invitation email: ${emailResult.error}`
      };
    }

    return {
      success: true,
      data: invitationData
    };
  } catch (error) {
    console.error("Exception creating invitation:", error);
    return { success: false, error: "Failed to create invitation" };
  }
};

/**
 * Accepts an invitation using the invitation token
 */
export const acceptInvitation = async (
  token: string
): Promise<{ success: boolean; data?: { tenant_id: string; role: string }; error?: string }> => {
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

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from("user_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return { success: false, error: updateError.message };
    }

    return { 
      success: true, 
      data: { 
        tenant_id: invitation.tenant_id || "",
        role: invitation.role 
      } 
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
  tenantId: string
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
  invitationId: string
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
 */
export const resendInvitation = async (
  invitationEmail: string
): Promise<{ success: boolean; error?: string; data?: { email: string; temporaryPassword: string; loginUrl: string } }> => {
  try {
    // Get the existing invitation details
    const { data: invitationData, error: invitationError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('email', invitationEmail)
      .single();

    if (invitationError || !invitationData) {
      return { success: false, error: "Invitation not found" };
    }

    // Generate a new temporary password
    const newTemporaryPassword = generateTemporaryPassword();
    
    // Find the user by email to get their ID
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find((u: any) => u.email === invitationEmail);
    
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newTemporaryPassword }
    );

    if (updateError) {
      console.error("Error updating user password:", updateError);
      return { success: false, error: updateError.message };
    }

    // Send new credentials via email
    const loginUrl = `${window.location.origin}/auth`;
    const emailResult = await sendCredentialsEmail(invitationEmail, newTemporaryPassword, loginUrl, true);
    
    if (!emailResult.success) {
      console.error('Failed to send resend invitation email:', emailResult.error);
      return {
        success: false,
        error: `New password was generated but failed to send email: ${emailResult.error}`
      };
    }

    return {
      success: true,
      data: {
        email: invitationEmail,
        temporaryPassword: newTemporaryPassword,
        loginUrl: loginUrl
      }
    };
  } catch (error) {
    console.error("Exception resending invitation:", error);
    return { success: false, error: "Failed to resend invitation" };
  }
};

/**
 * Hook for managing invitations with toast notifications
 */
export const useInvitations = (tenantId?: string) => {
  const { toast } = useToast();

  const inviteUser = async (email: string, role: string = "staff", permissions: Record<string, boolean> = {}) => {
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
