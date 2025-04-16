// lib/auth/cognito-utils.ts
import { getCurrentUser, fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';

/**
 * Configures Amplify if needed before using Auth functions
 * This helps ensure Auth functions work in different contexts
 */
function ensureAmplifyConfigured() {
  // Check if Amplify is already configured
  try {
    // This will throw an error if Amplify is not configured
    Amplify.getConfig();
  } catch (error) {
    // If not configured, configure it with environment variables
    const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
    const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID;
    
    if (userPoolId && userPoolClientId) {
      console.log('Auto-configuring Amplify with Cognito credentials');
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId,
            loginWith: {
              email: true,
            },
          },
        },
      });
    } else {
      console.warn('Cannot auto-configure Amplify - missing credentials');
    }
  }
}

/**
 * Gets the current authenticated Cognito user
 * Returns a default mock user if auth is not configured
 */
export async function getCognitoCurrentUser() {
  try {
    // Ensure Amplify is configured before using Auth functions
    ensureAmplifyConfigured();
    
    // Try to get the current user and their attributes
    const currentUser = await getCurrentUser();
    const userAttributes = await fetchUserAttributes();
    
    return {
      username: currentUser.username,
      attributes: userAttributes
    };
  } catch (error) {
    console.error('Error getting Cognito user:', error);
    
    // Only provide mock user in development
    if (process.env.NODE_ENV !== 'production') {
      return {
        username: 'dev-user',
        attributes: {
          sub: 'mock-user-id',
          email: 'dev@example.com',
          email_verified: 'true',
          given_name: 'Dev',
          family_name: 'User'
        }
      };
    }
    
    // In production, propagate the error
    throw error;
  }
}

/**
 * Stores subscription data in user custom attributes
 * Makes sure Amplify is configured first
 */
export async function storeSubscriptionInUserAttributes(
  subscriptionData: {
    planId: string;
    planType: string;
    status: string;
    subscriptionId?: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    billingCycle: 'monthly' | 'yearly';
    mode?: 'production' | 'sandbox';
  }
) {
  try {
    // Ensure Amplify is configured before using Auth functions
    ensureAmplifyConfigured();
    
    // Convert subscription data to string for storage
    const subscriptionJson = JSON.stringify(subscriptionData);
    
    console.log('Storing subscription data:', {
      planId: subscriptionData.planId,
      planType: subscriptionData.planType,
      subscriptionId: subscriptionData.subscriptionId,
      billingCycle: subscriptionData.billingCycle,
      mode: subscriptionData.mode
    });
    
    // Update the user's custom:subscription attribute
    await updateUserAttributes({
      userAttributes: {
        'custom:subscription': subscriptionJson
      }
    });
    
    console.log('Successfully stored subscription in Cognito user attributes');
    
    // Verify the data was stored correctly by fetching it back
    try {
      const attributes = await fetchUserAttributes();
      if (attributes['custom:subscription']) {
        console.log('Verified subscription data stored in Cognito');
      } else {
        console.warn('Verification failed: custom:subscription attribute not found after storage');
      }
    } catch (verifyError) {
      console.warn('Could not verify subscription storage:', verifyError);
    }
    
    return subscriptionJson;
  } catch (error) {
    console.error('Error storing subscription data:', error);
    throw error;
  }
}

/**
 * Retrieves subscription data from user custom attributes
 * Makes sure Amplify is configured first
 */
export async function getSubscriptionFromUserAttributes() {
  try {
    // Ensure Amplify is configured before using Auth functions
    ensureAmplifyConfigured();
    
    // Fetch the user's attributes
    const userAttributes = await fetchUserAttributes();
    
    // Check if the custom:subscription attribute exists
    if (userAttributes['custom:subscription']) {
      const subscriptionJson = userAttributes['custom:subscription'];
      console.log('Found subscription data in Cognito');
      
      try {
        return JSON.parse(subscriptionJson);
      } catch (parseError) {
        console.error('Error parsing subscription JSON from Cognito:', parseError);
        throw parseError;
      }
    } else {
      console.log('No custom:subscription attribute found in Cognito');
      throw new Error('No subscription found in Cognito user attributes');
    }
  } catch (error) {
    console.error('Error getting subscription from user attributes:', error);
    
    // Return default free subscription
    return getDefaultSubscription();
  }
}

/**
 * Get default free subscription
 */
function getDefaultSubscription() {
  return {
    planId: 'free',
    planType: 'free',
    status: 'active',
    subscriptionId: '',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    cancelAtPeriodEnd: false,
    billingCycle: 'monthly',
    mode: getDefaultPaymentMode()
  };
}

/**
 * Get default payment mode from environment
 */
function getDefaultPaymentMode(): 'production' | 'sandbox' {
  return process.env.NEXT_PUBLIC_PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'production';
}