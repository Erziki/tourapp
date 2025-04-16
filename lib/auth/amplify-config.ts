// lib/auth/amplify-config.ts
import { Amplify } from 'aws-amplify';

export function configureAmplify() {
  // Check if we have the required credentials
  const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID;
  
  // Only configure Amplify if we have valid credentials
  if (userPoolId && userPoolClientId) {
    console.log('Configuring Amplify with Cognito credentials');
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
    console.log('No Cognito credentials found - using development mode');
    // Don't configure Amplify at all in development without credentials
    // This will allow the fallback mock users to work
  }
}