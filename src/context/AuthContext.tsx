import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check if email is allowed and create profile if user signs up
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('SIGNED_IN event triggered for:', session.user.email);
          setTimeout(async () => {
            try {
              console.log('Checking if email is allowed:', session.user.email);
              // Check if email is in allowed list
              const { data: isAllowed, error } = await supabase
                .rpc('is_email_allowed', { email_address: session.user.email });
              
              console.log('Email allowed check result:', { isAllowed, error });
              
              if (error) {
                console.error('Error checking email allowance:', error);
                await supabase.auth.signOut();
                return;
              }
              
              if (!isAllowed) {
                console.error('Email not in allowed list:', session.user.email);
                await supabase.auth.signOut();
                return;
              }
              
              console.log('Email is allowed, proceeding with profile creation');

              // Create profile - use upsert to handle existing profiles gracefully  
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: session.user.id,
                  email: session.user.email!,
                  name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email!,
                }, {
                  onConflict: 'id'
                });
              
              if (profileError) {
                console.error('Error creating/updating profile:', profileError);
              } else {
                console.log('Profile created/updated successfully for:', session.user.email);
              }
            } catch (err) {
              console.error('Exception during email check:', err);
              await supabase.auth.signOut();
              return;
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};