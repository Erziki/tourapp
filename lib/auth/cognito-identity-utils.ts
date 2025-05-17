// lib/auth/cognito-identity-utils.ts
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { S3Client } from "@aws-sdk/client-s3";

// Configuration constants
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const IDENTITY_POOL_ID = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || "";
const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || "";

/**
 * Gets AWS credentials from Cognito Identity Pool using the JWT token from the current authenticated session
 */
export async function getAuthenticatedCredentials() {
  try {
    // Get the current auth session from Amplify
    const session = await fetchAuthSession();
    
    // Check if we have a valid token
    if (!session || !session.tokens || !session.tokens.idToken) {
      console.error('No valid authentication session found');
      throw new Error('User is not authenticated');
    }
    
    // Get the JWT token
    const idToken = session.tokens.idToken.toString();
    
    // Create credentials provider from Cognito Identity Pool
    const credentials = fromCognitoIdentityPool({
      identityPoolId: IDENTITY_POOL_ID,
      clientConfig: { region: REGION },
      logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken
      }
    });
    
    return credentials;
  } catch (error) {
    console.error('Error getting authenticated credentials:', error);
    throw error;
  }
}

/**
 * Alternative method to get credentials using the session API
 * This might be useful in some cases where the first method doesn't work
 */
export async function getAuthenticatedCredentialsCompat() {
  try {
    // Get current user and session using the modern API
    const currentUser = await getCurrentUser();
    const session = await fetchAuthSession();
    
    if (!session || !session.tokens || !session.tokens.idToken) {
      throw new Error('No valid session found');
    }
    
    const idToken = session.tokens.idToken.toString();
    
    // Create credentials provider
    const credentials = fromCognitoIdentityPool({
      identityPoolId: IDENTITY_POOL_ID,
      clientConfig: { region: REGION },
      logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken
      }
    });
    
    return credentials;
  } catch (error) {
    console.error('Error getting authenticated credentials (compat):', error);
    throw error;
  }
}

/**
 * Creates an S3 client with authenticated credentials
 */
export async function createAuthenticatedS3Client() {
  try {
    // Try to get credentials using the primary method
    const credentials = await getAuthenticatedCredentials();
    
    return new S3Client({
      region: REGION,
      credentials
    });
  } catch (firstError) {
    console.warn('Failed to get credentials with first method, trying alternate method:', firstError);
    
    try {
      // Fall back to the alternate method
      const credentials = await getAuthenticatedCredentialsCompat();
      
      return new S3Client({
        region: REGION,
        credentials
      });
    } catch (secondError) {
      console.error('Failed to get authenticated credentials with both methods:', secondError);
      throw secondError;
    }
  }
}

/**
 * Creates a Cognito client with authenticated credentials
 * This is for admin operations like getting and updating user attributes
 */
export async function createAuthenticatedCognitoClient() {
  try {
    // Try to get credentials using the primary method
    const credentials = await getAuthenticatedCredentials();
    
    return new CognitoIdentityProviderClient({
      region: REGION,
      credentials
    });
  } catch (firstError) {
    console.warn('Failed to get credentials with first method, trying alternate method:', firstError);
    
    try {
      // Fall back to the alternate method
      const credentials = await getAuthenticatedCredentialsCompat();
      
      return new CognitoIdentityProviderClient({
        region: REGION,
        credentials
      });
    } catch (secondError) {
      console.error('Failed to get authenticated credentials with both methods:', secondError);
      throw secondError;
    }
  }
}