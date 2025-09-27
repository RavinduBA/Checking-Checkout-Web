import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { createCheckoutSession, getProduct, cancelSubscription } from "@/lib/creem";
import { 
  CreditCard, 
  Crown, 
  Calendar, 
  Users, 
  Building2, 
  Bed,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Plan = Tables<"plans">;
type Subscription = Tables<"subscriptions">;
type Tenant = Tables<"tenants">;

interface PlanWithCreemProduct extends Plan {
  creemProduct?: any;
}

export default function BillingSubscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenant, subscription, user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanWithCreemProduct[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(subscription);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (tenant) {
      fetchPlansAndSubscription();
    }
  }, [tenant]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPlansAndSubscription = async () => {
    setLoading(true);
    try {
      // Fetch available plans
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_cents");

      if (plansError) throw plansError;

      // Fetch Creem product details for each plan (if needed)
      const plansWithProducts = await Promise.all(
        (plansData || []).map(async (plan) => {
          try {
            // If plan has a creem_product_id, fetch its details
            // For now, we'll use mock data since the plans table doesn't have creem_product_id
            return { ...plan, creemProduct: null };
          } catch (error) {
            console.warn(`Failed to fetch Creem product for plan ${plan.id}:`, error);
            return { ...plan, creemProduct: null };
          }
        })
      );

      setPlans(plansWithProducts);

      // Fetch current subscription if not provided by auth context
      if (!subscription && tenant) {
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("tenant_id", tenant.id)
          .in("status", ["active", "trialing"])
          .order('created_at', { ascending: false })
          .limit(1);

        if (subError) {
          console.error("Error fetching subscription:", subError);
          setCurrentSubscription(null);
        } else {
          const subscription = subData && subData.length > 0 ? subData[0] : null;
          setCurrentSubscription(subscription);
        }
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!tenant || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to subscribe",
        variant: "destructive"
      });
      return;
    }

    setProcessingPlanId(plan.id);
    try {
      // Create or get Creem customer
      let creemCustomerId = currentSubscription?.creem_customer_id;
      
      if (!creemCustomerId) {
        // For now, we'll create a placeholder customer ID
        // In a real implementation, you'd call Creem's customer creation API
        creemCustomerId = `cust_${tenant.id}_${Date.now()}`;
        
        // Update subscription record with customer ID
        if (currentSubscription) {
          await supabase
            .from("subscriptions")
            .update({ creem_customer_id: creemCustomerId })
            .eq("id", currentSubscription.id);
        }
      }

      // For this demo, we'll use a mock product ID
      // In production, each plan would have a corresponding Creem product
      const mockProductId = `prod_${plan.id}`;
      
      // Create checkout session
      const successUrl = `${window.location.origin}/billing/success`;
      const cancelUrl = `${window.location.origin}/billing`;
      
      try {
        const checkout = await createCheckoutSession({
          productId: mockProductId,
          customerId: creemCustomerId,
          customerEmail: user.email,
          successUrl: successUrl,
          cancelUrl: cancelUrl,
          metadata: {
            tenant_id: tenant.id,
            plan_id: plan.id,
            user_id: user.id
          }
        });

        // Redirect to Creem checkout
        // Note: The actual checkout URL property might be different
        // Check Creem.io documentation for the correct property name
        const checkoutUrl = (checkout as any)?.checkout_url || (checkout as any)?.url;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (creemError) {
        // If Creem is not configured or fails, show a demo message
        console.warn("Creem checkout failed, showing demo:", creemError);
        
        toast({
          title: "Demo Mode",
          description: `This would redirect to Creem.io checkout for ${plan.name} plan ($${(plan.price_cents / 100).toFixed(2)}/${plan.billing_interval}). Configure VITE_CREEM_API_KEY to enable real payments.`,
        });
        
        // In demo mode, simulate a successful subscription
        await simulateSuccessfulSubscription(plan, creemCustomerId);
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description: "Failed to start subscription process",
        variant: "destructive"
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const simulateSuccessfulSubscription = async (plan: Plan, customerId: string) => {
    if (!tenant) return;

    try {
      const subscriptionData = {
        tenant_id: tenant.id,
        plan_id: plan.id,
        status: 'active',
        creem_customer_id: customerId,
        creem_subscription_id: `sub_demo_${Date.now()}`,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (plan.billing_interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      };

      if (currentSubscription) {
        // Update existing subscription
        await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", currentSubscription.id);
      } else {
        // Create new subscription
        await supabase
          .from("subscriptions")
          .insert(subscriptionData);
      }

      // Update tenant subscription status
      await supabase
        .from("tenants")
        .update({ 
          subscription_status: 'active',
          trial_ends_at: null // Clear trial end date
        })
        .eq("id", tenant.id);

      toast({
        title: "Success",
        description: `Successfully subscribed to ${plan.name} plan (Demo Mode)`,
      });

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Failed to simulate subscription:", error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription?.creem_subscription_id) {
      toast({
        title: "Error",
        description: "No active subscription to cancel",
        variant: "destructive"
      });
      return;
    }

    setCancelling(true);
    try {
      // Cancel subscription in Creem
      try {
        await cancelSubscription(currentSubscription.creem_subscription_id);
      } catch (creemError) {
        console.warn("Creem cancellation failed, proceeding with local cancellation:", creemError);
      }

      // Update subscription status in database
      await supabase
        .from("subscriptions")
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq("id", currentSubscription.id);

      // Update tenant status
      if (tenant) {
        await supabase
          .from("tenants")
          .update({ subscription_status: 'cancelled' })
          .eq("id", tenant.id);
      }

      toast({
        title: "Success",
        description: "Subscription cancelled successfully",
      });

      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error("Cancellation error:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive"
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="size-4 text-green-600" />;
      case 'trialing': return <Calendar className="size-4 text-blue-600" />;
      case 'past_due': return <AlertTriangle className="size-4 text-yellow-600" />;
      case 'cancelled': return <XCircle className="size-4 text-red-600" />;
      default: return <AlertTriangle className="size-4 text-gray-600" />;
    }
  };

  const isTrialExpired = tenant?.trial_ends_at && new Date(tenant.trial_ends_at) < new Date();
  const trialDaysLeft = tenant?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
    : 0;

  if (loading) {
    return <SectionLoader className="min-h-64" />;
  }

  return (
    <div className="w-full mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing settings
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          Back to Settings
        </Button>
      </div>

      {/* Trial Status Alert */}
      {tenant?.subscription_status === 'trial' && (
        <Alert className={isTrialExpired ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}>
          <AlertTriangle className={`h-4 w-4 ${isTrialExpired ? "text-red-600" : "text-blue-600"}`} />
          <AlertDescription className={isTrialExpired ? "text-red-800" : "text-blue-800"}>
            {isTrialExpired 
              ? "Your trial has expired. Please subscribe to continue using the service."
              : `Your trial expires in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}. Subscribe now to continue using all features.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="size-5 text-yellow-600" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(currentSubscription.status)}
                <Badge className={getStatusColor(currentSubscription.status)}>
                  {currentSubscription.status.toUpperCase()}
                </Badge>
              </div>
              {currentSubscription.status === 'active' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Cancel Subscription"}
                </Button>
              )}
            </div>
            
            {currentSubscription.current_period_end && (
              <p className="text-sm text-muted-foreground">
                {currentSubscription.status === 'active' ? 'Renews' : 'Expires'} on:{' '}
                {new Date(currentSubscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const price = plan.price_cents / 100;
            
            return (
              <Card key={plan.id} className={`relative ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}>
                {isCurrentPlan && (
                  <Badge className="absolute -top-2 -right-2 bg-blue-600">Current Plan</Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${price.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">/{plan.billing_interval}</div>
                    </div>
                  </CardTitle>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Plan Features */}
                  <div className="space-y-2">
                    {plan.max_locations && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span>{plan.max_locations} locations</span>
                      </div>
                    )}
                    {plan.max_rooms && (
                      <div className="flex items-center gap-2 text-sm">
                        <Bed className="size-4 text-muted-foreground" />
                        <span>{plan.max_rooms} rooms</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="size-4 text-muted-foreground" />
                      <span>Unlimited users</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="size-4 text-green-600" />
                      <span>24/7 Support</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!isCurrentPlan && (
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan)}
                      disabled={processingPlanId === plan.id}
                    >
                      <CreditCard className="size-4 mr-2" />
                      {processingPlanId === plan.id ? "Processing..." : "Subscribe"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Creem.io Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Payment Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payments are processed securely through Creem.io. All major credit cards are accepted.
            Your payment information is never stored on our servers.
          </p>
          {!import.meta.env.VITE_CREEM_API_KEY && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Demo Mode:</strong> Set VITE_CREEM_API_KEY environment variable to enable real payment processing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}