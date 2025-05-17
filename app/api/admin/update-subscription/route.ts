// app/api/admin/update-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { configureServerAmplify } from '@/lib/auth/server-amplify-config';
import { getCognitoCurrentUser } from '@/lib/auth/cognito-utils';
import { fetchAuthSession } from 'aws-amplify/auth';

// Configure Amplify for server-side
configureServerAmplify();

// AWS Region from environment
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || '';
const IDENTITY_POOL_ID = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '';

/**
 * Get credentials from Cognito Identity Pool using the current authenticated session
 */
async function getAdminCredentials() {
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
    console.error('Error getting admin credentials:', error);
    throw new Error(`Failed to get admin credentials: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    // First authenticate the current user
    try {
      await getCognitoCurrentUser();
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed, user not logged in' },
        { status: 401 }
      );
    }
    
    // Get the data from the request
    const { userId, subscription } = await req.json();
    
    if (!userId || !subscription) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters (userId, subscription)' 
      }, { status: 400 });
    }
    
    console.log('Admin API: Updating subscription for user:', userId);
    console.log('Subscription data:', {
      planId: subscription.planId,
      planType: subscription.planType,
      billingCycle: subscription.billingCycle,
      subscriptionId: subscription.subscriptionId
    });
    
    try {
      // Get credentials from Cognito Identity Pool
      const credentials = await getAdminCredentials();
      
      // Create Cognito client with acquired credentials
      const cognitoClient = new CognitoIdentityProviderClient({
        region: AWS_REGION,
        credentials
      });
      
      // Convert subscription to JSON string
      const subscriptionJson = JSON.stringify(subscription);
      
      // Create command to update user attributes using admin privileges
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
        UserAttributes: [
          {
            Name: 'custom:subscription',
            Value: subscriptionJson
          }
        ]
      });
      
      // Execute the command
      await cognitoClient.send(updateCommand);
      
      console.log('Admin API: Successfully updated subscription in Cognito');
      
      return NextResponse.json({
        success: true,
        message: 'Subscription updated successfully using admin API'
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
    console.error('Admin API general error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      name: error.name,
      code: error.code,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // First authenticate the current user
    try {
      await getCognitoCurrentUser();
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed, user not logged in' },
        { status: 401 }
      );
    }
    
    // Get userId from query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required userId parameter' 
      }, { status: 400 });
    }
    
    try {
      // Get credentials from Cognito Identity Pool
      const credentials = await getAdminCredentials();
      
      // Create Cognito client with acquired credentials
      const cognitoClient = new CognitoIdentityProviderClient({
        region: AWS_REGION,
        credentials
      });
      
      // Create command to get user attributes using admin privileges
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId
      });
      
      // Execute the command
      const userResult = await cognitoClient.send(getUserCommand);
      
      // Extract subscription attribute
      let subscription = null;
      if (userResult.UserAttributes) {
        const subscriptionAttr = userResult.UserAttributes.find(
          attr => attr.Name === 'custom:subscription'
        );
        
        if (subscriptionAttr && subscriptionAttr.Value) {
          try {
            subscription = JSON.parse(subscriptionAttr.Value);
          } catch (parseError) {
            console.error('Error parsing subscription JSON:', parseError);
          }
        }
      }
      
      // If no subscription found, return a default free one
      if (!subscription) {
        subscription = {
          planId: 'free',
          planType: 'free',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          billingCycle: 'monthly',
          mode: process.env.NEXT_PUBLIC_PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'production'
        };
      }
      
      return NextResponse.json(subscription);
    } catch (cognitoError) {
      console.error('Error with Cognito operation:', cognitoError);
      
      if (cognitoError.name === 'AccessDeniedException') {
        return NextResponse.json({ 
          success: false, 
          error: 'Access denied. The authenticated user does not have permission to perform this operation.',
          details: 'The IAM role associated with your Cognito Identity Pool must have cognito-idp:AdminGetUser permission',
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
    console.error('Admin API general error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      name: error.name,
      code: error.code,
    }, { status: 500 });
  }
}