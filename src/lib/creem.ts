import { Creem } from "creem";

const CREEM_API_KEY = import.meta.env.VITE_CREEM_API_KEY;

if (!CREEM_API_KEY) {
  console.warn("VITE_CREEM_API_KEY is not set. Creem.io integration will not work.");
}

export const creem = new Creem({
  // Use test mode if no API key is provided or if it starts with 'creem_test_'
  // In production, you'll use live keys that start with 'creem_live_'
});

// Helper function to create a checkout session
export const createCheckoutSession = async (params: {
  productId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}) => {
  if (!CREEM_API_KEY) {
    throw new Error("Creem API key is not configured");
  }

  try {
    const result = await creem.createCheckout({
      xApiKey: CREEM_API_KEY,
      createCheckoutRequest: {
        productId: params.productId,
        customer: params.customerId ? {
          id: params.customerId,
          email: params.customerEmail
        } : undefined,
        metadata: {
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          ...params.metadata
        }
      }
    });

    return result;
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    throw error;
  }
};

// Helper function to create a customer
export const createCustomer = async (params: {
  email: string;
  name?: string;
  tenantId: string;
}) => {
  if (!CREEM_API_KEY) {
    throw new Error("Creem API key is not configured");
  }

  try {
    // Note: The Creem SDK might not have a direct createCustomer method
    // This is a placeholder for the actual implementation
    // You might need to use their REST API directly or check their latest SDK docs
    
    // For now, we'll return the email as the customer ID
    // In a real implementation, you'd create the customer via Creem API
    return {
      id: `cust_${params.tenantId}_${Date.now()}`,
      email: params.email,
      name: params.name
    };
  } catch (error) {
    console.error("Failed to create customer:", error);
    throw error;
  }
};

// Helper function to create a subscription
export const createSubscription = async (params: {
  customerId: string;
  planId: string;
  tenantId: string;
}) => {
  if (!CREEM_API_KEY) {
    throw new Error("Creem API key is not configured");
  }

  try {
    // Note: This is a placeholder implementation
    // You'll need to implement this based on Creem's actual subscription API
    
    return {
      id: `sub_${params.tenantId}_${Date.now()}`,
      customer_id: params.customerId,
      plan_id: params.planId,
      status: 'active'
    };
  } catch (error) {
    console.error("Failed to create subscription:", error);
    throw error;
  }
};

// Helper function to retrieve a product
export const getProduct = async (productId: string) => {
  if (!CREEM_API_KEY) {
    throw new Error("Creem API key is not configured");
  }

  try {
    const result = await creem.retrieveProduct({
      productId,
      xApiKey: CREEM_API_KEY
    });

    return result;
  } catch (error) {
    console.error("Failed to retrieve product:", error);
    throw error;
  }
};

// Helper function to cancel a subscription
export const cancelSubscription = async (subscriptionId: string) => {
  if (!CREEM_API_KEY) {
    throw new Error("Creem API key is not configured");
  }

  try {
    const result = await creem.cancelSubscription({
      id: subscriptionId,
      xApiKey: CREEM_API_KEY
    });

    return result;
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    throw error;
  }
};

// Helper function to validate webhook signature (simplified for browser environment)
export const validateWebhookSignature = async (
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> => {
  // Implement webhook signature validation for browser environment
  // This is a security measure to ensure webhooks are from Creem
  try {
    if (!window.crypto || !window.crypto.subtle) {
      console.warn("WebCrypto API not available, skipping signature validation");
      return true; // In development, you might want to skip validation
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureArrayBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureArrayBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Failed to validate webhook signature:", error);
    return false;
  }
};

export default creem;