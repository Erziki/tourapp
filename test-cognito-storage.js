// test-cognito-storage.js
// Use this to verify that subscription data is storing correctly in Cognito

import { Auth } from 'aws-amplify';
import { storeSubscriptionInUserAttributes, getSubscriptionFromUserAttributes } from '@/lib/auth/cognito-utils';

/**
 * Tests if subscription data can be stored and retrieved from Cognito
 */
async function testCognitoSubscriptionStorage() {
  try {
    console.log('Starting Cognito subscription storage test...');
    
    // First, ensure user is authenticated
    try {
      const user = await Auth.currentAuthenticatedUser();
      console.log('User is authenticated:', user.username);
    } catch (authError) {
      console.error('User is not authenticated. Please log in first.');
      return false;
    }
    
    // Create test subscription data
    const testSubscription = {
      planId: 'test-plan',
      planType: 'pro',
      status: 'active',
      subscriptionId: 'TEST-SUB-' + Date.now(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      billingCycle: 'monthly',
      mode: 'sandbox'
    };
    
    // Step 1: Store in Cognito
    console.log('Attempting to store test subscription in Cognito...');
    try {
      await storeSubscriptionInUserAttributes(testSubscription);
      console.log('Test subscription stored successfully');
    } catch (storeError) {
      console.error('Failed to store test subscription:', storeError);
      return false;
    }
    
    // Step 2: Retrieve from Cognito
    console.log('Attempting to retrieve subscription data from Cognito...');
    try {
      const retrievedSubscription = await getSubscriptionFromUserAttributes();
      
      console.log('Retrieved subscription data:', retrievedSubscription);
      
      // Verify key fields match
      if (retrievedSubscription.subscriptionId === testSubscription.subscriptionId &&
          retrievedSubscription.planId === testSubscription.planId &&
          retrievedSubscription.billingCycle === testSubscription.billingCycle) {
        console.log('SUCCESS: Subscription data correctly stored and retrieved from Cognito!');
        return true;
      } else {
        console.error('Retrieved subscription does not match test data');
        console.log('Expected:', testSubscription);
        console.log('Actual:', retrievedSubscription);
        return false;
      }
    } catch (retrieveError) {
      console.error('Failed to retrieve subscription data:', retrieveError);
      return false;
    }
  } catch (error) {
    console.error('Test failed with unexpected error:', error);
    return false;
  }
}

// Run test when needed
// testCognitoSubscriptionStorage().then(success => {
//   console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
// });

export default testCognitoSubscriptionStorage;