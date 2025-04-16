// lib/auth/server-amplify-config.ts
import { Amplify } from 'aws-amplify';

let isConfigured = false;

/**
 * Configures Amplify specifically for server-side API routes
 * This is different from the client-side configuration
 */
export function configureServerAmplify() {
  // Avoid configuring multiple times
  if (isConfigured) return;

  // Get Cognito credentials from environment variables
  const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID;
  
  if (!userPoolId || !userPoolClientId) {
    console.warn('Missing Cognito credentials in environment variables');
    return;
  }

  try {
    // Configure Amplify with Cognito credentials for server-side
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
    }, { ssr: true }); // Important: specify SSR mode for server-side usage
    
    isConfigured = true;
    console.log('Server-side Amplify configured successfully');
  } catch (error) {
    console.error('Error configuring server-side Amplify:', error);
  }
}