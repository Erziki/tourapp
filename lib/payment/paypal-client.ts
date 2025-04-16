// lib/payment/paypal-client.ts
// Provides utilities for interacting with PayPal's REST API in both sandbox and production

import { getPaymentMode } from './config-utils';

// Type definitions for PayPal interactions
export interface PayPalAuthToken {
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
  expiration: number; // Added for tracking
}

export interface PayPalError {
  name: string;
  message: string;
  details?: any[];
}

export interface PayPalSubscription {
  id: string;
  status: string;
  status_update_time: string;
  plan_id: string;
  start_time: string;
  quantity: string;
  custom_id?: string;
  billing_info?: {
    outstanding_balance: {
      currency_code: string;
      value: string;
    };
    cycle_executions: any[];
    last_payment: {
      amount: {
        currency_code: string;
        value: string;
      };
      time: string;
    };
    next_billing_time: string;
    failed_payments_count: number;
  };
  subscriber: {
    email_address: string;
    name: {
      given_name: string;
      surname: string;
    };
    shipping_address?: {
      name: {
        full_name: string;
      };
      address: {
        address_line_1: string;
        admin_area_2: string;
        admin_area_1: string;
        postal_code: string;
        country_code: string;
      };
    };
  };
  create_time: string;
  update_time: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

// Environment-specific tokens
const tokenCache: {
  production: PayPalAuthToken | null;
  sandbox: PayPalAuthToken | null;
} = {
  production: null,
  sandbox: null
};

/**
 * Detect environment from subscription ID or environment variable
 */
export function detectSubscriptionMode(subscriptionId?: string): 'production' | 'sandbox' {
  // If a mode is explicitly set in the environment, respect it
  const configuredMode = getPaymentMode();
  
  // Use subscription ID pattern as a fallback (sandbox IDs typically start with "I-" while production with "S-")
  if (subscriptionId) {
    if (configuredMode === 'sandbox' || subscriptionId.startsWith('I-')) {
      return 'sandbox';
    }
  }
  
  return configuredMode;
}

/**
 * Gets an OAuth2 access token from PayPal
 */
export async function getAccessToken(mode: 'production' | 'sandbox' = 'production'): Promise<string> {
  // Check if we have a valid cached token for this environment
  const now = Date.now();
  if (tokenCache[mode] && tokenCache[mode]!.expiration > now + 60000) {
    return tokenCache[mode]!.access_token;
  }

  // Get client credentials based on environment
  const clientId = mode === 'production' 
    ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    : process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID;
    
  const clientSecret = mode === 'production'
    ? process.env.PAYPAL_CLIENT_SECRET
    : process.env.SANDBOX_PAYPAL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error(`Missing PayPal API credentials for ${mode} environment`);
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const apiBase = mode === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  try {
    console.log(`Requesting auth token for PayPal ${mode} mode`);
    
    const response = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`PayPal auth error (${mode}):`, errorData);
      throw new Error(`Failed to get PayPal auth token for ${mode}: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json() as PayPalAuthToken;
    
    // Add expiration time for our cache
    tokenData.expiration = Date.now() + (tokenData.expires_in * 1000);
    
    // Cache the token for this environment
    tokenCache[mode] = tokenData;
    
    console.log(`Successfully obtained auth token for PayPal ${mode} mode`);
    return tokenData.access_token;
  } catch (error) {
    console.error(`Error getting PayPal auth token for ${mode}:`, error);
    throw error;
  }
}

/**
 * Get subscription details from PayPal
 */
export async function getSubscription(
  subscriptionId: string, 
  mode: 'production' | 'sandbox' = 'production'
): Promise<PayPalSubscription> {
  try {
    const accessToken = await getAccessToken(mode);
    const apiBase = mode === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    console.log(`Fetching subscription details from PayPal ${mode} API for ID: ${subscriptionId}`);
    
    const response = await fetch(`${apiBase}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`PayPal subscription error (${mode}):`, errorData);
      try {
        const jsonError = JSON.parse(errorData) as PayPalError;
        throw new Error(`Failed to get subscription for ${mode}: ${jsonError.message || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`Failed to get subscription for ${mode}: ${response.status} ${response.statusText}`);
      }
    }

    const subscriptionData = await response.json() as PayPalSubscription;
    console.log(`Successfully retrieved subscription data from PayPal ${mode} API`);
    return subscriptionData;
  } catch (error) {
    console.error(`Error getting PayPal subscription for ${mode}:`, error);
    throw error;
  }
}

/**
 * Cancel a subscription in PayPal
 */
export async function cancelSubscription(
  subscriptionId: string, 
  reason: string = 'Customer canceled subscription',
  mode: 'production' | 'sandbox' = 'production'
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken(mode);
    const apiBase = mode === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    console.log(`Canceling subscription in PayPal ${mode} API for ID: ${subscriptionId}`);
    
    const response = await fetch(`${apiBase}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`PayPal cancel subscription error (${mode}):`, errorData);
      try {
        const jsonError = JSON.parse(errorData) as PayPalError;
        throw new Error(`Failed to cancel subscription for ${mode}: ${jsonError.message || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`Failed to cancel subscription for ${mode}: ${response.status} ${response.statusText}`);
      }
    }

    console.log(`Successfully canceled subscription in PayPal ${mode} API`);
    return true; // 204 No Content indicates success
  } catch (error) {
    console.error(`Error canceling PayPal subscription for ${mode}:`, error);
    throw error;
  }
}

/**
 * Activate a suspended subscription in PayPal
 */
export async function activateSubscription(
  subscriptionId: string, 
  reason: string = 'Subscription reactivated',
  mode: 'production' | 'sandbox' = 'production'
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken(mode);
    const apiBase = mode === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    console.log(`Activating subscription in PayPal ${mode} API for ID: ${subscriptionId}`);
    
    const response = await fetch(`${apiBase}/v1/billing/subscriptions/${subscriptionId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`PayPal activate subscription error (${mode}):`, errorData);
      try {
        const jsonError = JSON.parse(errorData) as PayPalError;
        throw new Error(`Failed to activate subscription for ${mode}: ${jsonError.message || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`Failed to activate subscription for ${mode}: ${response.status} ${response.statusText}`);
      }
    }

    console.log(`Successfully activated subscription in PayPal ${mode} API`);
    return true; // 204 No Content indicates success
  } catch (error) {
    console.error(`Error activating PayPal subscription for ${mode}:`, error);
    throw error;
  }
}