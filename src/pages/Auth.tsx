import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading, profileLoading } = useAuth();

  // Check if this is an invitation flow
  const isInvitation = searchParams.get('invitation') === 'true';

  useEffect(() => {
    // Handle invitation acceptance when user is authenticated
    const handleInvitationAcceptance = async () => {
      if (isInvitation && user && user.user_metadata?.tenant_id) {
        try {
          const tenantId = user.user_metadata.tenant_id;
          const role = user.user_metadata.role || 'staff';
          const permissions = user.user_metadata.permissions || {};

          // Create user profile with invitation data
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email!,
              name: user.user_metadata.full_name || user.email!.split('@')[0],
              tenant_id: tenantId,
              role: role as any,
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            return;
          }

          // Create user permissions
          const { error: permissionsError } = await supabase
            .from('user_permissions')
            .insert({
              user_id: user.id,
              tenant_id: tenantId,
              location_id: tenantId, // Temporary - should be updated when user selects location
              ...permissions,
              tenant_role: role === 'admin' ? 'tenant_admin' : role === 'manager' ? 'tenant_manager' : 'tenant_staff',
            });

          if (permissionsError) {
            console.error('Error creating permissions:', permissionsError);
          }

          toast({
            title: "Invitation Accepted",
            description: "Welcome to the team!",
          });

          navigate("/dashboard");
        } catch (error) {
          console.error('Error handling invitation:', error);
          toast({
            title: "Error",
            description: "Failed to process invitation",
            variant: "destructive",
          });
        }
      }
    };

    // Only check for navigation if not loading
    if (!loading && !profileLoading && user) {
      if (isInvitation) {
        handleInvitationAcceptance();
      } else if (profile?.tenant_id) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    }
  }, [user, profile, loading, profileLoading, navigate, isInvitation, toast]);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      const redirectTo = isInvitation 
        ? `${window.location.origin}/auth?invitation=true`
        : `${window.location.origin}/auth`;
        
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });

      if (error) {
        toast({
          title: "Google Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred with Google sign in",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Successful",
            description: "Welcome back!",
          });
          // Navigation is handled by useAuth hook
        }
      } else {
        if (!name.trim()) {
          toast({
            title: "Name Required",
            description: "Please enter your full name",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
            }
          }
        });

        if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account, then complete the setup process.",
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border">
        <CardHeader className="text-center">
          <CardTitle className="text-lg sm:text-2xl font-bold text-foreground">
            <div className="flex flex-col leading-tight">
              <span className="font-bold">CHECK-IN</span>
              <span className="font-normal">CHECK-OUT</span>
            </div>
          </CardTitle>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
          {!isLogin && (
            <p className="text-sm text-muted-foreground mt-2">
              Start your 14-day free trial today
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  placeholder="Enter your full name"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-5"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full size-4 border-2 border-transparent border-t-current"></div>
                </div>
              ) : isLogin ? (
                <>
                  <LogIn className="size-4 mr-2" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="size-4 mr-2" />
                  Sign Up
                </>
              )}
            </Button>
          </form>

          <div className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn}
            disabled={submitting}
          >
            {submitting ? (
              <div className="animate-spin rounded-full size-4 border-2 border-transparent border-t-current mr-2"></div>
            ) : (
              <svg className="size-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}