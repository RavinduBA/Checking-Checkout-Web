import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Building, Crown, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateInvitationToken, acceptInvitation } from "@/lib/invitations";
import type { Database } from "@/integrations/supabase/types";

type UserInvitation = Database["public"]["Tables"]["user_invitations"]["Row"];

export const InvitationAuth = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const { toast } = useToast();

	const [invitation, setInvitation] = useState<UserInvitation | null>(null);
	const [invitationLoading, setInvitationLoading] = useState(true);
	const [isExistingUser, setIsExistingUser] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [step, setStep] = useState<"welcome" | "auth" | "processing">(
		"welcome",
	);

	const invitationToken = searchParams.get("token");

	const handleInvitationAcceptance = useCallback(async () => {
		if (!invitation || !user) return;

		setStep("processing");

		try {
			// Call the accept_invitation RPC function
			const { data, error } = await supabase.rpc("accept_invitation", {
				p_token: invitationToken!,
			});

			if (error) {
				console.error("Error accepting invitation:", error);
				toast({
					title: "Error",
					description: error.message || "Failed to accept invitation",
					variant: "destructive",
				});
				return;
			}

			console.log("Invitation accepted successfully:", data);
			toast({
				title: "Welcome to the Team! 🎉",
				description: `You've been added to the organization with ${invitation.role} access.`,
			});

			// Navigate to dashboard
			navigate("/dashboard", { replace: true });
		} catch (error) {
			console.error("Exception handling invitation:", error);
			toast({
				title: "Error",
				description: "Failed to process invitation",
				variant: "destructive",
			});
		}
	}, [invitation, user, invitationToken, toast, navigate]);

	useEffect(() => {
		const loadInvitation = async () => {
			if (!invitationToken) {
				navigate("/auth", { replace: true });
				return;
			}

			try {
				const response = await validateInvitationToken(invitationToken);
				if (!response.success || !response.data) {
					toast({
						title: "Invalid Invitation",
						description: "This invitation link is invalid or has expired.",
						variant: "destructive",
					});
					navigate("/auth", { replace: true });
					return;
				}

				setInvitation(response.data);
				setEmail(response.data.email);

				// Check if user already has an account
				const { data: existingProfile } = await supabase
					.from("profiles")
					.select("id")
					.eq("email", response.data.email)
					.single();

				setIsExistingUser(!!existingProfile);
			} catch (error) {
				console.error("Error loading invitation:", error);
				toast({
					title: "Error",
					description: "Failed to load invitation details.",
					variant: "destructive",
				});
				navigate("/auth", { replace: true });
			} finally {
				setInvitationLoading(false);
			}
		};

		loadInvitation();
	}, [invitationToken, navigate, toast]);

	useEffect(() => {
		// If user is already logged in and invitation is loaded, process it
		if (user && invitation && !loading) {
			handleInvitationAcceptance();
		}
	}, [user, invitation, loading, handleInvitationAcceptance]);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!password.trim()) return;

		setSubmitting(true);

		try {
			if (isExistingUser) {
				// Sign in existing user
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				if (error) {
					toast({
						title: "Authentication Error",
						description: error.message,
						variant: "destructive",
					});
					return;
				}

				// Invitation will be processed in useEffect once user is authenticated
			} else {
				// Create new user account and accept invitation
				const response = await acceptInvitation(invitationToken!, password);

				if (!response.success) {
					toast({
						title: "Error",
						description: response.error || "Failed to accept invitation",
						variant: "destructive",
					});
					return;
				}

				// Sign in the newly created user
				const { error: signInError } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				if (signInError) {
					toast({
						title: "Account Created Successfully",
						description: "Please sign in with your new account.",
					});
					setIsExistingUser(true);
					return;
				}

				toast({
					title: "Welcome to the Team! 🎉",
					description:
						"Your account has been created and you've been added to the organization.",
				});

				navigate("/dashboard", { replace: true });
			}
		} catch (error) {
			console.error("Exception during authentication:", error);
			toast({
				title: "Error",
				description: "Something went wrong. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	if (invitationLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="flex items-center justify-center space-x-2">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
							<span>Loading invitation...</span>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!invitation) {
		return null; // Will redirect to /auth
	}

	if (step === "processing") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="text-center space-y-4">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
							<h3 className="text-lg font-semibold">Processing Invitation</h3>
							<p className="text-muted-foreground">
								Setting up your access permissions...
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (step === "welcome") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
				<div className="w-full max-w-lg space-y-6">
					{/* Welcome Header */}
					<div className="text-center space-y-2">
						<div className="flex items-center justify-center space-x-2">
							<Users className="h-8 w-8 text-primary" />
							<h1 className="text-3xl font-bold text-gray-900">
								You're Invited!
							</h1>
						</div>
						<p className="text-lg text-gray-600">
							Join the team on CheckingCheckout
						</p>
					</div>

					{/* Invitation Details Card */}
					<Card className="border-2 border-primary/20">
						<CardHeader className="text-center pb-4">
							<div className="flex items-center justify-center space-x-2 mb-2">
								<Building className="h-5 w-5 text-primary" />
								<CardTitle className="text-xl">Organization</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="bg-primary/5 rounded-lg p-4 space-y-3">
								<div className="flex items-center justify-between">
									<span className="font-medium">Your Role:</span>
									<Badge variant="secondary" className="capitalize">
										{invitation.role}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="font-medium">Email:</span>
									<span className="text-sm text-muted-foreground">
										{invitation.email}
									</span>
								</div>
							</div>

							{/* Benefits */}
							<div className="space-y-2">
								<h4 className="font-medium flex items-center space-x-2">
									<CheckCircle className="h-4 w-4 text-green-500" />
									<span>What you'll get:</span>
								</h4>
								<ul className="space-y-1 text-sm text-muted-foreground ml-6">
									<li>• Access to the hospitality management system</li>
									<li>• Collaborate with your team in real-time</li>
									<li>• Manage reservations and bookings</li>
									<li>• View reports and analytics</li>
								</ul>
							</div>

							{/* Free Access Note */}
							<div className="bg-green-50 border border-green-200 rounded-lg p-3">
								<div className="flex items-center space-x-2">
									<Sparkles className="h-4 w-4 text-green-600" />
									<span className="text-sm font-medium text-green-800">
										Free to join!
									</span>
								</div>
								<p className="text-xs text-green-700 mt-1">
									You can start using the system immediately. Upgrade to premium
									features anytime.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Action Buttons */}
					<div className="space-y-3">
						<Button
							className="w-full py-6 text-lg font-semibold"
							onClick={() => setStep("auth")}
						>
							{isExistingUser ? "Sign In to Join" : "Create Account & Join"}
						</Button>

						<div className="text-center">
							<Button
								variant="ghost"
								onClick={() => navigate("/auth")}
								className="text-muted-foreground hover:text-foreground"
							>
								Not for you? Go to regular login
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Auth step
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<Button
						variant="ghost"
						onClick={() => setStep("welcome")}
						className="text-muted-foreground hover:text-foreground mb-4"
					>
						← Back to invitation
					</Button>
					<h1 className="text-2xl font-bold">
						{isExistingUser ? "Welcome Back!" : "Create Your Account"}
					</h1>
					<p className="text-muted-foreground">
						{isExistingUser
							? "Sign in to join the team"
							: "Set up your password to get started"}
					</p>
				</div>

				{/* Auth Form */}
				<Card>
					<CardHeader>
						<CardTitle className="text-center">
							{isExistingUser ? "Sign In" : "Set Password"}
						</CardTitle>
						<CardDescription className="text-center">
							Email: {email}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleAuth} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="password">
									{isExistingUser ? "Password" : "Create Password"}
								</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={
										isExistingUser
											? "Enter your password"
											: "Choose a secure password"
									}
									required
									minLength={6}
									autoFocus
								/>
								{!isExistingUser && (
									<p className="text-xs text-muted-foreground">
										Minimum 6 characters
									</p>
								)}
							</div>

							<Button type="submit" className="w-full" disabled={submitting}>
								{submitting ? (
									<div className="flex items-center space-x-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
										<span>
											{isExistingUser ? "Signing in..." : "Creating account..."}
										</span>
									</div>
								) : isExistingUser ? (
									"Sign In & Join Team"
								) : (
									"Create Account & Join Team"
								)}
							</Button>
						</form>

						<Separator className="my-4" />

						<div className="text-center space-y-2">
							<p className="text-xs text-muted-foreground">
								{isExistingUser
									? "Don't have an account?"
									: "Already have an account?"}
							</p>
							<Button
								variant="ghost"
								onClick={() => setIsExistingUser(!isExistingUser)}
								className="text-sm"
							>
								{isExistingUser
									? "Create new account instead"
									: "Sign in with existing account"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Subscription Upgrade Prompt */}
				<Card className="border-amber-200 bg-amber-50">
					<CardContent className="pt-4">
						<div className="flex items-start space-x-3">
							<Crown className="h-5 w-5 text-amber-600 mt-0.5" />
							<div className="space-y-1">
								<h4 className="text-sm font-medium text-amber-800">
									Unlock Premium Features
								</h4>
								<p className="text-xs text-amber-700">
									After joining, you can upgrade for advanced analytics,
									unlimited users, and priority support.
								</p>
								<Button
									variant="outline"
									size="sm"
									className="mt-2 text-amber-800 border-amber-300 hover:bg-amber-100"
								>
									Learn About Premium
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
