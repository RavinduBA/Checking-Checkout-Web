import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("demo@checkingcheckout.com");
  const [password, setPassword] = useState("Netronk@123");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    toast({
      title: "Google Login Disabled",
      description: "Google authentication is disabled in demo mode. Please use the demo credentials below.",
      variant: "destructive",
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
          
          // Check if email is allowed
          const { data: isAllowed } = await supabase
            .rpc('is_email_allowed', { email_address: email });
          
          if (!isAllowed) {
            await supabase.auth.signOut();
            toast({
              title: "Access Denied",
              description: "Your email is not authorized to access this system.",
              variant: "destructive",
            });
            return;
          }
          
          navigate("/dashboard");
        }
      } else {
        // Sign up is disabled in demo mode
        toast({
          title: "Sign Up Disabled",
          description: "New account registration is disabled in demo mode. Please use the demo credentials provided.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </p>
          {isLogin && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Demo Credentials</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Email:</strong> demo@checkingcheckout.com</p>
                <p><strong>Password:</strong> Netronk@123</p>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Use these credentials to explore the hospitality ERP system
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!isLogin && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Note:</strong> New account registration is disabled in demo mode. 
                Please use the demo credentials provided above.
              </p>
            </div>
          )}
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
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
            className="w-full opacity-50 cursor-not-allowed" 
            onClick={handleGoogleSignIn}
            disabled={true}
          >
            <svg className="size-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Login (Disabled in Demo)
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