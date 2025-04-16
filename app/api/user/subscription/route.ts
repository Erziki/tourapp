// app/api/user/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCognitoCurrentUser, storeSubscriptionInUserAttributes, getSubscriptionFromUserAttributes } from '@/lib/auth/cognito-utils';
import { 
  getSubscription, 
  cancelSubscription, 
  activateSubscription, 
  detectSubscriptionMode 
} from '@/lib/payment/paypal-client';
import { getPaymentMode } from '@/lib/payment/config-utils';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { configureServerAmplify } from '@/lib/auth/server-amplify-config';

// Configure Amplify for server-side use BEFORE using any Cognito functions
configureServerAmplify();

/**
 * GET to retrieve user's subscription
 */
export async function GET(req: NextRequest) {
  try {
    // Try to authenticate user
    let user = null;
    try {
      user = await getCognitoCurrentUser();
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Try to get subscription from Cognito attributes
    let subscription = null;
    try {
      subscription = await getSubscriptionFromUserAttributes();
      console.log('API: Got subscription from Cognito:', {
        planId: subscription.planId,
        billingCycle: subscription.billingCycle,
        subscriptionId: subscription.subscriptionId
      });
    } catch (error) {
      console.error('API: Error getting subscription from Cognito:', error);
      
      // Fall back to default subscription
      subscription = {
        planId: 'free',
        planType: 'free',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        billingCycle: 'monthly',
        mode: getPaymentMode()
      };
    }
    
    // CRITICAL: Billing Cycle Verification - Check for common indicators in subscription ID
    if (subscription.subscriptionId) {
      let subscriptionId = subscription.subscriptionId.toLowerCase();
      
      // Look for clues in the subscription ID
      const monthlyKeywords = ['monthly', 'month', '-m-', 'mo-'];
      const yearlyKeywords = ['yearly', 'annual', '-y-', 'yr-'];
      
      const hasMonthlyIndicator = monthlyKeywords.some(keyword => subscriptionId.includes(keyword));
      const hasYearlyIndicator = yearlyKeywords.some(keyword => subscriptionId.includes(keyword));
      
      // Correct inconsistent data if found
      if (hasMonthlyIndicator && subscription.billingCycle === 'yearly') {
        console.warn('API: Correcting billing cycle from yearly to monthly based on subscription ID');
        subscription.billingCycle = 'monthly';
        
        // Store the correction in Cognito
        try {
          await storeSubscriptionInUserAttributes(subscription);
          console.log('API: Successfully stored billing cycle correction in Cognito');
        } catch (e) {
          console.error('API: Failed to store billing cycle correction:', e);
        }
      } else if (hasYearlyIndicator && subscription.billingCycle === 'monthly') {
        console.warn('API: Correcting billing cycle from monthly to yearly based on subscription ID');
        subscription.billingCycle = 'yearly';
        
        // Store the correction in Cognito
        try {
          await storeSubscriptionInUserAttributes(subscription);
          console.log('API: Successfully stored billing cycle correction in Cognito');
        } catch (e) {
          console.error('API: Failed to store billing cycle correction:', e);
        }
      }
    }
    
    // Always ensure billing cycle has a valid value
    if (!subscription.billingCycle || 
        (subscription.billingCycle !== 'monthly' && subscription.billingCycle !== 'yearly')) {
      console.warn('API: Setting missing or invalid billing cycle to monthly default');
      subscription.billingCycle = 'monthly';
    }
    
    // Always set the mode
    if (!subscription.mode) {
      subscription.mode = getPaymentMode();
    }
    
    // Return the verified and possibly corrected subscription
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('API: Error handling subscription request:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription data' },
      { status: 500 }
    );
  }
}

/**
 * POST to update subscription plan
 */
export async function POST(req: NextRequest) {
  try {
    // Try to authenticate user
    let user = null;
    try {
      user = await getCognitoCurrentUser();
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      planId, 
      subscriptionId, 
      billingCycle = 'monthly',
      mode: providedMode,
      changingBillingCycleOnly = false,  // Add support for billing cycle changes
      previousSubscriptionId  // Add support for tracking the previous subscription when changing billing cycles
    } = body;
    
    // Verify if we received a billing cycle
    if (!billingCycle || (billingCycle !== 'monthly' && billingCycle !== 'yearly')) {
      console.warn('API: Invalid billing cycle provided, defaulting to monthly');
      body.billingCycle = 'monthly';
    }
    
    // Determine payment mode from multiple sources
    const configMode = getPaymentMode();
    const detectedMode = subscriptionId ? detectSubscriptionMode(subscriptionId) : configMode;
    
    // Use provided mode, or fall back to detected mode
    const paypalMode = providedMode || detectedMode;
    
    // Log the incoming data
    console.log('Subscription update request:', {
      userId: user?.attributes?.sub || 'unknown',
      planId,
      subscriptionId,
      billingCycle,
      changingBillingCycleOnly, // Log whether this is just a billing cycle change
      previousSubscriptionId, // Log the previous subscription ID if provided
      configMode,
      detectedMode,
      finalMode: paypalMode,
      timestamp: new Date().toISOString()
    });
    
    if (!planId) {
      return NextResponse.json(
        { error: 'Missing planId' },
        { status: 400 }
      );
    }
    
    // For free plan, we don't need to verify any subscription
    let paypalSubscriptionDetails = null;
    
    // Important: Skip subscription ID check if this is just a billing cycle change
    // or if it's a free plan
    if (planId !== 'free' && !changingBillingCycleOnly && !subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId for paid plan' },
        { status: 400 }
      );
    }
    
    // If we have a new subscription ID, verify it (unless this is a free plan)
    if (planId !== 'free' && subscriptionId) {
      // For PayPal subscriptions (starting with I- or S-)
      const isPayPalFormat = subscriptionId.startsWith('I-') || subscriptionId.startsWith('S-');
      
      if (isPayPalFormat) {
        try {
          // Verify with PayPal API
          paypalSubscriptionDetails = await getSubscription(subscriptionId, paypalMode);
          
          console.log(`PayPal ${paypalMode} subscription details:`, {
            status: paypalSubscriptionDetails.status,
            planId: paypalSubscriptionDetails.plan_id
          });
          
          // Check subscription status
          const validStatuses = ['ACTIVE', 'APPROVED', 'CREATED'];
          if (!validStatuses.includes(paypalSubscriptionDetails.status)) {
            return NextResponse.json(
              { error: `Subscription is not active. Current status: ${paypalSubscriptionDetails.status}` },
              { status: 400 }
            );
          }
        } catch (paypalError) {
          console.error(`Error fetching PayPal ${paypalMode} subscription:`, paypalError);
          
          // In production, we need to enforce verification, but be more lenient
          // if this is just a billing cycle change
          if (process.env.NODE_ENV === 'production' && paypalMode === 'production' && !changingBillingCycleOnly) {
            return NextResponse.json(
              { error: `Could not verify subscription with PayPal ${paypalMode}` },
              { status: 400 }
            );
          }
          
          // In development or if just changing billing cycle, we can be more lenient
          console.log('Non-production environment or changing billing cycle only - continuing despite verification error');
        }
      } else if (planId !== 'free' && !changingBillingCycleOnly) {
        // Reject non-PayPal IDs for paid plans, unless this is just a billing cycle change
        return NextResponse.json(
          { error: 'Invalid subscription ID format' },
          { status: 400 }
        );
      }
    }
    
    // If this is a billing cycle change, and we have a previous subscription ID,
    // we should cancel the previous subscription
    if (changingBillingCycleOnly && previousSubscriptionId) {
      try {
        console.log(`Canceling previous subscription ${previousSubscriptionId} due to billing cycle change`);
        
        // Check if it's a PayPal subscription ID
        const isPayPalFormat = previousSubscriptionId.startsWith('I-') || previousSubscriptionId.startsWith('S-');
        
        if (isPayPalFormat) {
          // Cancel the previous subscription with PayPal
          await cancelSubscription(previousSubscriptionId, 'Changed billing cycle', paypalMode);
          console.log(`Successfully canceled previous subscription ${previousSubscriptionId}`);
        } else {
          console.warn(`Invalid previous subscription ID format: ${previousSubscriptionId}`);
        }
      } catch (cancelError) {
        console.error(`Error canceling previous subscription ${previousSubscriptionId}:`, cancelError);
        // Continue processing - don't fail the request if cancellation fails
      }
    }
    
    // Map plan IDs to their respective types to ensure consistent data
    const planType = planId === 'pro' ? 'pro' : 
                     planId === 'enterprise' ? 'enterprise' : 'free';
    
    // Calculate subscription period based on current date
    const currentPeriodStart = new Date().toISOString();
    
    // If we have PayPal data, use it
    let currentPeriodEnd = '';
    if (paypalSubscriptionDetails && paypalSubscriptionDetails.billing_info?.next_billing_time) {
      currentPeriodEnd = paypalSubscriptionDetails.billing_info.next_billing_time;
    } else {
      // Default to 30 days for monthly, 365 for yearly
      const periodDays = billingCycle === 'yearly' ? 365 : 30;
      currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // Create subscription record
    const subscription = {
      planId,
      planType,
      status: 'active',
      subscriptionId: subscriptionId || '',
      previousSubscriptionId: previousSubscriptionId || '', // Track the previous subscription ID
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      billingCycle: billingCycle || 'monthly',
      mode: paypalMode
    };
    
    // Store subscription data in Cognito user attributes
    if (user && user.attributes.sub) {
      try {
        console.log('Storing subscription in Cognito user attributes:', {
          planId: subscription.planId,
          planType: subscription.planType,
          subscriptionId: subscription.subscriptionId,
          billingCycle: subscription.billingCycle,
          mode: subscription.mode
        });
        
        // Store the subscription in user attributes
        await storeSubscriptionInUserAttributes(subscription);
        
        console.log('Successfully stored subscription in Cognito');
        
        // Verify the data was stored correctly by fetching it back
        try {
          const userAttributes = await fetchUserAttributes();
          if (userAttributes['custom:subscription']) {
            console.log('Verified subscription data stored in Cognito');
          } else {
            console.warn('Verification check: custom:subscription attribute not found after storage');
          }
        } catch (verifyError) {
          console.warn('Could not verify subscription storage:', verifyError);
        }
      } catch (storageError) {
        console.error('Error storing subscription in user attributes:', storageError);
        
        // Log the specific error for debugging
        if (storageError.name === 'AuthUserPoolException') {
          console.error('AuthUserPoolException: Amplify configuration issue. Check server-side Amplify setup.');
        }
      }
    } else {
      console.error('No user sub found, cannot store subscription in Cognito');
    }
    
    // Return the subscription object to client
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE to cancel the current subscription
 */
export async function DELETE(req: NextRequest) {
  try {
    // Try to authenticate user
    let user = null;
    try {
      user = await getCognitoCurrentUser();
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Parse request for subscription ID
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const providedMode = searchParams.get('mode');
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId' },
        { status: 400 }
      );
    }
    
    // Determine payment mode from multiple sources
    const configMode = getPaymentMode();
    const detectedMode = detectSubscriptionMode(subscriptionId);
    
    // Use provided mode, or fall back to detected mode
    const paypalMode = providedMode as 'production' | 'sandbox' || detectedMode;
    
    console.log('Canceling subscription:', {
      userId: user?.attributes?.sub || 'unknown',
      subscriptionId,
      configMode,
      detectedMode,
      finalMode: paypalMode
    });
    
    // Cancel with PayPal API
    const isPayPalFormat = subscriptionId.startsWith('I-') || subscriptionId.startsWith('S-');
    if (isPayPalFormat) {
      try {
        await cancelSubscription(subscriptionId, 'Canceled by user', paypalMode);
      } catch (paypalError) {
        console.error(`Error canceling with PayPal ${paypalMode}:`, paypalError);
        
        // In production, we should fail if cancellation fails
        if (process.env.NODE_ENV === 'production' && paypalMode === 'production') {
          return NextResponse.json(
            { error: `Failed to cancel subscription with PayPal ${paypalMode}` },
            { status: 500 }
          );
        }
        
        // In development with sandbox, we can be more lenient
        console.log('Non-production environment - continuing despite cancellation error');
      }
    }
    
    // Get current subscription to preserve correct billing cycle
    let currentBillingCycle = 'monthly';
    try {
      const currentSubscription = await getSubscriptionFromUserAttributes();
      if (currentSubscription && currentSubscription.billingCycle) {
        currentBillingCycle = currentSubscription.billingCycle;
        console.log(`Preserving billing cycle (${currentBillingCycle}) during cancellation`);
      }
    } catch (e) {
      console.warn('Could not get current subscription billing cycle:', e);
    }
    
    // Create updated subscription record
    const subscription = {
      planId: 'free',
      planType: 'free',
      status: 'active',
      subscriptionId,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: true,
      billingCycle: currentBillingCycle, // Preserve the billing cycle
      mode: paypalMode
    };
    
    // Store updated subscription in Cognito
    if (user && user.attributes.sub) {
      try {
        console.log('Storing canceled subscription status in Cognito:', {
          planId: subscription.planId,
          planType: subscription.planType,
          subscriptionId: subscription.subscriptionId,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          billingCycle: subscription.billingCycle,
          mode: subscription.mode
        });
        
        await storeSubscriptionInUserAttributes(subscription);
        console.log('Successfully stored canceled subscription in Cognito');
        
        // Verify storage was successful
        try {
          const userAttributes = await fetchUserAttributes();
          if (userAttributes['custom:subscription']) {
            console.log('Verified cancellation data stored in Cognito');
          } else {
            console.warn('Verification check: custom:subscription attribute not found after cancellation storage');
          }
        } catch (verifyError) {
          console.warn('Could not verify cancellation storage:', verifyError);
        }
      } catch (storageError) {
        console.error('Error storing canceled subscription in user attributes:', storageError);
        // Continue processing and return subscription to client anyway
      }
    } else {
      console.error('No user sub found, cannot store canceled subscription in Cognito');
    }
    
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * PATCH to resume a previously canceled subscription
 */
export async function PATCH(req: NextRequest) {
  try {
    // Try to authenticate user
    let user = null;
    try {
      user = await getCognitoCurrentUser();
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      subscriptionId,
      mode: providedMode
    } = body;
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId' },
        { status: 400 }
      );
    }
    
    // Determine payment mode from multiple sources
    const configMode = getPaymentMode();
    const detectedMode = detectSubscriptionMode(subscriptionId);
    
    // Use provided mode, or fall back to detected mode
    const paypalMode = providedMode as 'production' | 'sandbox' || detectedMode;
    
    console.log('Resuming subscription:', {
      userId: user?.attributes?.sub || 'unknown',
      subscriptionId,
      configMode,
      detectedMode,
      finalMode: paypalMode
    });
    
    // Activate subscription with PayPal API
    const isPayPalFormat = subscriptionId.startsWith('I-') || subscriptionId.startsWith('S-');
    if (isPayPalFormat) {
      try {
        await activateSubscription(subscriptionId, 'Reactivated by user', paypalMode);
      } catch (paypalError) {
        console.error(`Error reactivating with PayPal ${paypalMode}:`, paypalError);
        
        // In production, we should fail if reactivation fails
        if (process.env.NODE_ENV === 'production' && paypalMode === 'production') {
          return NextResponse.json(
            { error: `Failed to reactivate subscription with PayPal ${paypalMode}` },
            { status: 500 }
          );
        }
        
        // In development with sandbox, we can be more lenient
        console.log('Non-production environment - continuing despite reactivation error');
      }
    }
    
    // Get existing subscription details to preserve proper plan type and billing cycle
    let planId = 'pro'; // Default assumption
    let billingCycle = 'monthly'; // Default assumption
    let planType = 'pro'; // Default assumption
    
    try {
      // Try to get existing subscription from Cognito
      const existingSubscription = await getSubscriptionFromUserAttributes();
      if (existingSubscription) {
        // Preserve billing cycle and plan details
        billingCycle = existingSubscription.billingCycle || 'monthly';
        planId = existingSubscription.planId || 'pro';
        planType = existingSubscription.planType || 'pro';
        
        console.log('Retrieved existing subscription details for resumption:', {
          planId,
          planType,
          billingCycle
        });
      }
    } catch (error) {
      console.error('Error getting existing subscription details, using defaults:', error);
    }
    
    // Create updated subscription record
    const subscription = {
      planId,
      planType,
      status: 'active',
      subscriptionId,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      billingCycle,
      mode: paypalMode
    };
    
    // Store updated subscription in Cognito
    if (user && user.attributes.sub) {
      try {
        console.log('Storing reactivated subscription in Cognito:', {
          planId: subscription.planId,
          planType: subscription.planType,
          subscriptionId: subscription.subscriptionId,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          billingCycle: subscription.billingCycle,
          mode: subscription.mode
        });
        
        await storeSubscriptionInUserAttributes(subscription);
        console.log('Successfully stored reactivated subscription in Cognito');
        
        // Verify storage was successful
        try {
          const userAttributes = await fetchUserAttributes();
          if (userAttributes['custom:subscription']) {
            console.log('Verified reactivation data stored in Cognito');
          } else {
            console.warn('Verification check: custom:subscription attribute not found after reactivation storage');
          }
        } catch (verifyError) {
          console.warn('Could not verify reactivation storage:', verifyError);
        }
      } catch (storageError) {
        console.error('Error storing reactivated subscription in user attributes:', storageError);
        // Continue processing and return subscription to client anyway
      }
    } else {
      console.error('No user sub found, cannot store reactivated subscription in Cognito');
    }
    
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}