// app/api/subscription/fix-billing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCognitoCurrentUser, getSubscriptionFromUserAttributes, storeSubscriptionInUserAttributes } from '@/lib/auth/cognito-utils';
import { configureServerAmplify } from '@/lib/auth/server-amplify-config';

// Configure Amplify for server-side
configureServerAmplify();

/**
 * Emergency API endpoint to force correct billing cycle
 * http://yourdomain.com/api/subscription/fix-billing?cycle=monthly
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
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
    
    // Get the desired billing cycle from query params (default to monthly)
    const { searchParams } = new URL(req.url);
    const forceCycle = searchParams.get('cycle') || 'monthly';
    
    if (forceCycle !== 'monthly' && forceCycle !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly".' },
        { status: 400 }
      );
    }
    
    // Get current subscription from Cognito
    let subscription;
    try {
      subscription = await getSubscriptionFromUserAttributes();
      console.log('Current subscription:', subscription);
      
      // Store original values for logging
      const originalBillingCycle = subscription.billingCycle || 'unknown';
      
      // Force billing cycle to specified value
      subscription.billingCycle = forceCycle;
      
      // Store back in Cognito
      await storeSubscriptionInUserAttributes(subscription);
      
      return NextResponse.json({ 
        success: true, 
        message: `EMERGENCY FIX: Billing cycle changed from ${originalBillingCycle} to ${forceCycle}`,
        details: {
          userId: user.username,
          planId: subscription.planId,
          planType: subscription.planType,
          subscriptionId: subscription.subscriptionId,
          billingCycle: subscription.billingCycle
        }
      });
    } catch (error) {
      console.error('Error fixing billing cycle:', error);
      return NextResponse.json(
        { error: 'Failed to fix billing cycle. Please contact support.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error. Please try again later.' },
      { status: 500 }
    );
  }
}