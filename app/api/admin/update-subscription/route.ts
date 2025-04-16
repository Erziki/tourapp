// app/api/admin/update-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

export async function POST(req: NextRequest) {
  try {
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
    
    // Initialize Cognito client with AWS credentials
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_KEY || ''
      }
    });
    
    // Convert subscription to JSON string
    const subscriptionJson = JSON.stringify(subscription);
    
    // Create command to update user attributes using admin privileges
    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
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
  } catch (error) {
    console.error('Admin API error updating subscription:', error);
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
    // Get userId from query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required userId parameter' 
      }, { status: 400 });
    }
    
    // Initialize Cognito client with AWS credentials
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_KEY || ''
      }
    });
    
    // Create command to get user attributes using admin privileges
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
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
  } catch (error) {
    console.error('Admin API error getting subscription:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      name: error.name,
      code: error.code,
    }, { status: 500 });
  }
}