import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
	const isInvitation = searchParams.get("invitation") === "true";
	const invitationToken = searchParams.get("token");

	useEffect(() => {
		// Handle magic link token hash verification
		const handleTokenHash = async () => {
			const tokenHash = searchParams.get("token_hash");
			const type = searchParams.get("type");

			if (tokenHash && type === "email") {
				try {
					const { error } = await supabase.auth.verifyOtp({
						token_hash: tokenHash,
						type: "email",
					});

					if (error) {
						console.error("Magic link verification failed:", error);
						toast({
							title: "Verification Failed",
							description: error.message,
							variant: "destructive",
						});
						return;
					}

					toast({
						title: "Verification Successful",
						description: "You have been signed in successfully!",
					});
					// Clear the URL parameters
					navigate("/auth", { replace: true });
				} catch (error) {
					console.error("Exception during magic link verification:", error);
					toast({
						title: "Error",
						description: "Failed to verify magic link",
						variant: "destructive",
					});
				}
			}
		};

		// Handle invitation acceptance when user is authenticated
		const handleInvitationAcceptance = async () => {
			if (isInvitation && invitationToken && user) {
				try {
					console.log("Processing invitation token:", invitationToken);

					// Use the RPC function to accept the invitation
					const { data: result, error: rpcError } = await supabase.rpc(
						"accept_invitation",
						{
							p_token: invitationToken,
						},
					);

					if (rpcError) {
						console.error("RPC error accepting invitation:", rpcError);
						toast({
							title: "Error",
							description: `Failed to process invitation: ${rpcError.message}`,
							variant: "destructive",
						});
						return;
					}

					// Parse the result as our expected response format
					const response = result as {
						success: boolean;
						error?: string;
						data?: any;
					};

					if (!response?.success) {
						console.error("Invitation acceptance failed:", response?.error);
						toast({
							title: "Invitation Error",
							description: response?.error || "Failed to process invitation",
							variant: "destructive",
						});
						return;
					}

					console.log("Invitation accepted successfully:", response.data);
					toast({
						title: "Invitation Accepted",
						description:
							"Welcome to the team! Your permissions have been set up.",
					});

					// Clear the URL parameters and navigate to dashboard
					navigate("/dashboard", { replace: true });
				} catch (error) {
					console.error("Exception handling invitation:", error);
					toast({
						title: "Error",
						description: "Failed to process invitation",
						variant: "destructive",
					});
				}
			}
		};

		// Handle magic link verification first
		handleTokenHash();

		// Only check for navigation if not loading
		if (!loading && !profileLoading && user) {
			if (isInvitation) {
				handleInvitationAcceptance();
			} else if (profile?.tenant_id) {
				// Check if this is the user's first login
				if (!profile.first_login_completed) {
					navigate("/onboarding");
				} else {
					navigate("/dashboard");
				}
			} else {
				navigate("/onboarding");
			}
		}
	}, [
		user,
		profile,
		loading,
		profileLoading,
		navigate,
		isInvitation,
		invitationToken,
		toast,
		searchParams,
	]);

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
						},
					},
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
						description:
							"Please check your email to verify your account, then complete the setup process.",
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
									disabled={submitting}
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
								disabled={submitting}
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
									disabled={submitting}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-2 top-1/2 -translate-y-1/2 size-5"
									onClick={() => setShowPassword(!showPassword)}
									disabled={submitting}
								>
									{showPassword ? (
										<EyeOff className="size-4" />
									) : (
										<Eye className="size-4" />
									)}
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

					<div className="mt-4 text-center">
						<button
							type="button"
							onClick={() => setIsLogin(!isLogin)}
							className="text-primary hover:underline"
							disabled={submitting}
						>
							{isLogin
								? "Don't have an account? Sign up"
								: "Already have an account? Sign in"}
						</button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
