// lib/payment/paypal-utils.ts

import { SubscriptionPlan } from "@/contexts/SubscriptionContext";

// PayPal client credentials - use your real client ID here
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID_HERE';
const PAYPAL_MODE = process.env.NODE_ENV === 'production' ? 'live' : 'sandbox';

// Types for PayPal SDK
interface PayPalButtonsComponentProps {
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?: 'rect' | 'pill';
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'subscribe';
    height?: number;
    tagline?: boolean;
  };
  createSubscription?: (data: any, actions: any) => Promise<string>;
  createOrder?: (data: any, actions: any) => Promise<string>;
  onApprove: (data: any, actions: any) => Promise<void>;
  onError?: (err: any) => void;
  onCancel?: () => void;
}

interface PayPalNamespace {
  Buttons: (props: PayPalButtonsComponentProps) => {
    render: (container: string | HTMLElement) => void;
  };
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

/**
 * Loads the PayPal SDK script
 */
export function loadPayPalScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.paypal) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=subscription&vault=true`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
}

/**
 * Sets up PayPal subscription buttons
 */
export function setupPayPalSubscription(
  containerId: string,
  plan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly',
  onSuccess: (subscriptionId: string) => void,
  onError: (error: Error) => void
): void {
  if (!window.paypal) {
    onError(new Error('PayPal SDK not loaded'));
    return;
  }

  // Clear existing buttons
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  // Calculate final price based on billing cycle
  const planPrice = plan.price;
  const yearlyDiscount = 20; // 20% discount for yearly plans
  
  const finalPrice = billingCycle === 'yearly' 
    ? (planPrice * 12 * (1 - yearlyDiscount / 100)).toFixed(2)
    : planPrice.toFixed(2);

  // Create PayPal buttons
  const buttons = window.paypal?.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'subscribe',
      tagline: false
    },
    createSubscription: async (data, actions) => {
      // Create the subscription
      try {
        // For monthly subscriptions
        if (billingCycle === 'monthly') {
          return await actions.subscription.create({
            plan_id: plan.id, // This should match a plan ID created in your PayPal dashboard
            custom_id: `${plan.id}_${billingCycle}_${Date.now()}`, // For tracking
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              user_action: 'SUBSCRIBE_NOW',
              return_url: window.location.href,
              cancel_url: window.location.href
            }
          });
        } 
        // For yearly subscriptions
        else {
          return await actions.subscription.create({
            plan_id: `${plan.id}_yearly`, // This should match a yearly plan ID in your PayPal dashboard
            custom_id: `${plan.id}_${billingCycle}_${Date.now()}`, // For tracking
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              user_action: 'SUBSCRIBE_NOW',
              return_url: window.location.href,
              cancel_url: window.location.href
            }
          });
        }
      } catch (error) {
        console.error('Error creating subscription:', error);
        onError(error instanceof Error ? error : new Error('Failed to create subscription'));
        throw error;
      }
    },
    onApprove: async (data, actions) => {
      // Payment approved
      try {
        console.log('Subscription approved:', data);
        
        // The subscriptionID is what we need to track this subscription
        const { subscriptionID } = data;
        
        // Call our success callback
        onSuccess(subscriptionID);
        
        return;
      } catch (error) {
        console.error('Error processing subscription approval:', error);
        onError(error instanceof Error ? error : new Error('Error processing subscription'));
      }
    },
    onError: (err) => {
      console.error('PayPal error:', err);
      onError(err instanceof Error ? err : new Error('PayPal subscription failed'));
    },
    onCancel: () => {
      console.log('PayPal subscription canceled by user');
      // You can handle cancellation if needed
    }
  });

  // Render buttons
  if (buttons && container) {
    buttons.render(`#${containerId}`);
  } else {
    onError(new Error('Failed to render PayPal buttons'));
  }
}