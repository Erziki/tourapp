// app/api/subscription/fix-billing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { getCognitoCurrentUser } from '@/lib/auth/cognito-utils';
import { fetchAuthSession } from 'aws-amplify/auth';
import { configureServerAmplify } from '@/lib/auth/server-amplify-config';

// Configure Amplify for server-side
configureServerAmplify();

// AWS Region from environment
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || '';
const IDENTITY_POOL_ID = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '';

/**
 * Get credentials from Cognito Identity Pool using the current authenticated session
 */
async function getFixerCredentials() {
  try {
    // Get the current auth session
    const session = await fetchAuthSession();
    
    // Check for valid session
    if (!session || !session.tokens || !session.tokens.idToken) {
      throw new Error('No valid authentication session found');
    }
    
    // Get the JWT token
    const idToken = session.tokens.idToken.toString();
    
    // Get credentials from Cognito Identity Pool
    return fromCognitoIdentityPool({
      identityPoolId: IDENTITY_POOL_ID,
      clientConfig: { region: AWS_REGION },
      logins: {
        [`cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken
      }
    });
  } catch (error) {
    console.error('Error getting fixer credentials:', error);
    throw new Error(`Failed to get credentials: ${error.message}`);
  }
}

/**
 * Emergency API endpoint to force correct billing cycle and plan
 * http://yourdomain.com/api/subscription/fix-billing?cycle=monthly&plan=pro&subscriptionId=I-1234567890
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
    const planId = searchParams.get('plan') || 'free';
    const subscriptionId = searchParams.get('subscriptionId') || '';
    
    if (forceCycle !== 'monthly' && forceCycle !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly".' },
        { status: 400 }
      );
    }
    
    // Create a default subscription with the specified billing cycle
    try {
      // Get credentials from Cognito Identity Pool
      const credentials = await getFixerCredentials();
      
      // Create Cognito client with acquired credentials
      const cognitoClient = new CognitoIdentityProviderClient({
        region: AWS_REGION,
        credentials
      });
      
      // Create a subscription object
      const subscription = {
        planId: planId,
        planType: planId === 'pro' ? 'pro' : 
                 planId === 'enterprise' ? 'enterprise' : 'free',
        status: 'active',
        subscriptionId: subscriptionId,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + (forceCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        billingCycle: forceCycle,
        mode: process.env.NEXT_PUBLIC_PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'production'
      };
      
      // Convert to JSON
      const subscriptionJson = JSON.stringify(subscription);
      
      // Create command to update user attributes using admin privileges
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.username,
        UserAttributes: [
          {
            Name: 'custom:subscription',
            Value: subscriptionJson
          }
        ]
      });
      
      // Execute the command
      await cognitoClient.send(updateCommand);
      
      return NextResponse.json({ 
        success: true, 
        message: `EMERGENCY FIX: Plan set to ${planId} with ${forceCycle} billing cycle`,
        details: {
          userId: user.username,
          planId: subscription.planId,
          planType: subscription.planType,
          subscriptionId: subscription.subscriptionId,
          billingCycle: subscription.billingCycle
        }
      });
    } catch (cognitoError) {
      console.error('Error with Cognito operation:', cognitoError);
      
      if (cognitoError.name === 'AccessDeniedException') {
        return NextResponse.json({ 
          success: false, 
          error: 'Access denied. The authenticated user does not have permission to perform this operation.',
          details: 'The IAM role associated with your Cognito Identity Pool must have cognito-idp:AdminUpdateUserAttributes permission',
          code: cognitoError.code
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Cognito operation failed: ${cognitoError.message}`,
        code: cognitoError.code || 'UnknownError'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error. Please try again later.' },
      { status: 500 }
    );
  }
}