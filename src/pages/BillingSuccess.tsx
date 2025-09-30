import { ArrowRight, CheckCircle, CreditCard, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function BillingSuccess() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [searchParams] = useSearchParams();
	const { tenant } = useAuth();

	const [loading, setLoading] = useState(true);
	const [processed, setProcessed] = useState(false);

	// Get URL parameters from Creem.io callback
	const checkoutId = searchParams.get("checkout_id");
	const orderId = searchParams.get("order_id");
	const customerId = searchParams.get("customer_id");
	const subscriptionId = searchParams.get("subscription_id");
	const productId = searchParams.get("product_id");
	const signature = searchParams.get("signature");
	const source = searchParams.get("source"); // 'onboarding' or 'billing'

	useEffect(() => {
		const processSuccessfulPayment = async () => {
			if (processed) return;

			setLoading(true);
			try {
				// TODO: Verify the signature with your webhook secret
				// This is important for security to ensure the callback is genuine
				// const isValid = await validateWebhookSignature(
				//   searchParams.toString(),
				//   signature || '',
				//   WEBHOOK_SECRET
				// );

				// For now, we'll skip signature validation in demo mode
				console.log("Processing successful payment:", {
					checkoutId,
					orderId,
					customerId,
					subscriptionId,
					productId,
				});

				// Update or create subscription record
				if (subscriptionId && customerId && tenant) {
					const subscriptionData = {
						tenant_id: tenant.id,
						status: "active",
						creem_customer_id: customerId,
						creem_subscription_id: subscriptionId,
						current_period_start: new Date().toISOString(),
						// Set end date based on plan (you might want to get this from Creem API)
						current_period_end: new Date(
							Date.now() + 30 * 24 * 60 * 60 * 1000,
						).toISOString(), // 30 days
					};

					// Check if subscription already exists
					const { data: existingSubscription } = await supabase
						.from("subscriptions")
						.select("*")
						.eq("tenant_id", tenant.id)
						.single();

					if (existingSubscription) {
						// Update existing subscription
						await supabase
							.from("subscriptions")
							.update(subscriptionData)
							.eq("id", existingSubscription.id);
					} else {
						// Create new subscription
						await supabase.from("subscriptions").insert(subscriptionData);
					}

					// Update tenant subscription status
					await supabase
						.from("tenants")
						.update({
							subscription_status: "active",
							trial_ends_at: null, // Clear trial end date
						})
						.eq("id", tenant.id);

					toast({
						title: "Payment Successful!",
						description: "Your subscription has been activated successfully.",
					});

					setProcessed(true);
				}
			} catch (error) {
				console.error("Error processing payment:", error);
				toast({
					title: "Processing Error",
					description:
						"Payment was successful, but there was an issue updating your account. Please contact support.",
					variant: "destructive",
				});
			} finally {
				setLoading(false);
			}
		};

		if (checkoutId && tenant) {
			processSuccessfulPayment();
		} else {
			setLoading(false);
		}
	}, [
		checkoutId,
		tenant,
		processed,
		orderId,
		customerId,
		subscriptionId,
		productId,
		toast,
	]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<SectionLoader className="min-h-64" />
			</div>
		);
	}

	if (!checkoutId) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2 text-red-600">
							<CreditCard className="size-6" />
							Invalid Payment Link
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center space-y-4">
						<p>This payment confirmation link is invalid or has expired.</p>
						<Button onClick={() => navigate("/billing")}>Go to Billing</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2 text-green-600">
						<CheckCircle className="size-8" />
						Payment Successful!
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center space-y-6">
					<div className="flex items-center justify-center">
						<div className="bg-green-100 p-4 rounded-full">
							<Crown className="size-12 text-green-600" />
						</div>
					</div>

					<div className="space-y-2">
						<h3 className="text-lg font-semibold">Welcome to Your New Plan!</h3>
						<p className="text-muted-foreground">
							Your subscription has been activated and you now have access to
							all premium features.
						</p>
					</div>

					{checkoutId && (
						<div className="bg-muted p-3 rounded-lg text-sm">
							<p>
								<strong>Order ID:</strong> {orderId}
							</p>
							<p>
								<strong>Checkout ID:</strong> {checkoutId}
							</p>
						</div>
					)}

					<div className="space-y-3">
						{source === "onboarding" ? (
							<>
								<Button
									className="w-full"
									onClick={() => navigate("/onboarding")}
								>
									Complete Setup
									<ArrowRight className="size-4 ml-2" />
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => navigate("/dashboard")}
								>
									Skip to Dashboard
								</Button>
							</>
						) : (
							<>
								<Button
									className="w-full"
									onClick={() => navigate("/dashboard")}
								>
									Go to Dashboard
									<ArrowRight className="size-4 ml-2" />
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => navigate("/billing")}
								>
									View Billing Details
								</Button>
							</>
						)}
					</div>

					<p className="text-xs text-muted-foreground">
						You will receive a confirmation email shortly with your receipt and
						subscription details.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
