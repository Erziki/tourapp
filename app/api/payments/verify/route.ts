// app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCognitoCurrentUser } from '@/lib/auth/cognito-utils';
import { getSubscription, detectSubscriptionMode } from '@/lib/payment/paypal-client';
import { getPayPalPlanId, getPaymentMode } from '@/lib/payment/config-utils';

export async function POST(req: NextRequest) {
  try {
    // Get current user
    let user = await getCognitoCurrentUser();
    
    // Parse request body
    const { 
      subscriptionId, 
      planId, 
      billingCycle = 'monthly', 
      mode: providedMode 
    } = await req.json();
    
    // Log the full request for debugging
    console.log('Payment verification request:', {
      userId: user?.attributes?.sub || 'unknown',
      subscriptionId,
      planId,
      billingCycle,
      providedMode,
      userAgent: req.headers.get('user-agent')
    });
    
    // Validate required fields
    if (!subscriptionId) {
      console.error('Missing subscriptionId in verification request');
      return NextResponse.json(
        { error: 'Missing required subscriptionId' },
        { status: 400 }
      );
    }
    
    if (!planId) {
      console.error('Missing planId in verification request');
      return NextResponse.json(
        { error: 'Missing required planId' },
        { status: 400 }
      );
    }
    
    // Determine payment mode from multiple sources: 
    // 1. Explicitly provided mode (if present)
    // 2. Environment default
    // 3. Subscription ID pattern (for backward compatibility)
    const defaultMode = getPaymentMode();
    const modeFromSubscription = detectSubscriptionMode(subscriptionId);
    
    // Use provided mode, or fall back to detected mode
    const paypalMode = providedMode || defaultMode || modeFromSubscription;
    
    // Log the determined mode
    console.log('Verification using mode:', {
      providedMode,
      defaultMode, 
      modeFromSubscription,
      finalMode: paypalMode
    });
    
    // Special handling for simulated IDs in development
    if (subscriptionId.startsWith('SIMULATED-') && process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Accepting simulated subscription:', subscriptionId);
      return NextResponse.json({
        verified: true,
        subscriptionId,
        status: 'ACTIVE',
        planId: planId,
        mode: paypalMode,
        simulated: true,
        message: 'Simulated subscription accepted in development mode'
      });
    }
    
    // In sandbox mode or development environment, we're more lenient
    const isDevOrSandbox = process.env.NODE_ENV !== 'production' || paypalMode === 'sandbox';
    
    // Validate format - production IDs typically start with 'S-', sandbox with 'I-'
    // In development mode we're more lenient about this check
    const isValidFormat = isDevOrSandbox || 
                         subscriptionId.startsWith('I-') || 
                         subscriptionId.startsWith('S-');
    
    if (!isValidFormat) {
      return NextResponse.json(
        { error: 'Invalid subscription ID format. Only PayPal subscriptions are accepted.' },
        { status: 400 }
      );
    }
    
    // For development or sandbox mode, we can skip verification against PayPal API to make testing easier
    if (isDevOrSandbox && process.env.SKIP_PAYPAL_VERIFICATION === 'true') {
      console.log('Development/Sandbox mode with SKIP_PAYPAL_VERIFICATION: Accepting without API verification');
      return NextResponse.json({
        verified: true,
        subscriptionId,
        status: 'ACTIVE',
        planId: planId,
        mode: paypalMode,
        skippedVerification: true,
        message: 'Subscription accepted without API verification (dev/sandbox only)'
      });
    }
    
    // Verify subscription with PayPal API
    try {
      // This will throw if the subscription doesn't exist or is invalid
      const subscriptionData = await getSubscription(subscriptionId, paypalMode);
      
      // Check subscription status
      const validStatuses = ['ACTIVE', 'APPROVED', 'CREATED'];
      if (!validStatuses.includes(subscriptionData.status)) {
        return NextResponse.json(
          { error: `Subscription is not active. Current status: ${subscriptionData.status}` },
          { status: 400 }
        );
      }
      
      // Log success for debugging
      console.log(`${paypalMode} subscription verified with PayPal:`, {
        status: subscriptionData.status,
        planId: subscriptionData.plan_id,
      });
      
      return NextResponse.json({
        verified: true,
        subscriptionId,
        status: subscriptionData.status,
        planId: subscriptionData.plan_id,
        mode: paypalMode,
        message: `${paypalMode} subscription verified successfully`
      });
      
    } catch (paypalError) {
      console.error(`Error verifying with PayPal ${paypalMode} API:`, paypalError);
      
      // In development or sandbox mode, we can be more lenient with verification
      if (isDevOrSandbox) {
        console.log('Non-production environment - accepting payment with limited verification');
        
        return NextResponse.json({
          verified: true,
          subscriptionId,
          mode: paypalMode,
          warning: 'API error during verification',
          message: 'Subscription accepted with limited verification (dev/sandbox only)'
        });
      }
      
      // In production, we require strict verification
      return NextResponse.json(
        { error: `Failed to verify subscription with PayPal ${paypalMode}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    return NextResponse.json(
      { error: 'Failed to verify payment. Please try again.' },
      { status: 500 }
    );
  }
}