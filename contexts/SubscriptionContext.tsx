// contexts/SubscriptionContext.tsx
"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { getSubscriptionFromUserAttributes, storeSubscriptionInUserAttributes } from '@/lib/auth/cognito-utils'
import { getPaymentMode } from '@/lib/payment/config-utils'

// Define subscription plan types
export type PlanType = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  maxTours: number
  maxScenesPerTour: number
  maxHotspotsPerScene: number
  videoSupport: boolean
  customBranding: boolean
  analytics: boolean
  teamMembers: number
  apiAccess: boolean
  prioritySupport: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  type: PlanType
  price: number
  billingPeriod: 'monthly' | 'yearly'
  limits: PlanLimits
  features: string[]
  popular?: boolean
}

export interface UserSubscription {
  planId: string
  planType: PlanType
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  subscriptionId?: string
  previousSubscriptionId?: string  // Track previous subscription for billing cycle changes
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  billingCycle: 'monthly' | 'yearly'  // Changed from optional to required
  trialEnd?: string
  mode?: 'production' | 'sandbox'
}

export interface UsageMetrics {
  toursCreated: number
  totalScenes: number
  publishedTours: number
}

interface SubscriptionContextType {
  plans: SubscriptionPlan[]
  currentSubscription: UserSubscription | null
  usageMetrics: UsageMetrics
  isLoading: boolean
  upgradeSubscription: (planId: string, subscriptionId?: string, billingCycle?: 'monthly' | 'yearly') => Promise<void>
  changeBillingCycle: (newBillingCycle: 'monthly' | 'yearly', newSubscriptionId?: string) => Promise<void> // Add this method
  cancelSubscription: () => Promise<void>
  resumeSubscription: () => Promise<void>
  getRemainingQuota: (toursCount: number) => {
    remainingTours: number
    tourLimitReached: boolean
  }
  isPlanFeatureAvailable: (feature: keyof PlanLimits) => boolean
  getCurrentPlan: () => SubscriptionPlan | null
  getCurrentPlanPrice: () => number
  getMaxScenesForCurrentPlan: () => number
  getMaxHotspotsForCurrentPlan: () => number
  refreshSubscription: () => Promise<void>
  refreshUsageMetrics: (tours: any[]) => void
  paymentMode: 'production' | 'sandbox'
}

// Define subscription plans
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    type: 'free',
    price: 0,
    billingPeriod: 'monthly',
    limits: {
      maxTours: 2,
      maxScenesPerTour: 3,
      maxHotspotsPerScene: 5,
      videoSupport: false,
      customBranding: false,
      analytics: true,
      teamMembers: 1,
      apiAccess: false,
      prioritySupport: false
    },
    features: [
      '2 Virtual Tours',
      '3 Scenes per tour',
      '5 Hotspots per scene',
      '360° Video support',
      'Basic analytics',
      'Embed tours on websites',
    ]
  },
  {
    id: 'pro',
    name: 'Professional',
    type: 'pro',
    price: 29,
    billingPeriod: 'monthly',
    popular: true,
    limits: {
      maxTours: 20,
      maxScenesPerTour: 50,
      maxHotspotsPerScene: 20,
      videoSupport: true,
      customBranding: true,
      analytics: true,
      teamMembers: 1,
      apiAccess: false,
      prioritySupport: false
    },
    features: [
      '20 Virtual Tours',
      '50 Scenes per tour',
      '20 Hotspots per scene',
      '360° Video support',
      'Advanced analytics',
      'Embed tours on websites',
      'Priority support',
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    type: 'enterprise',
    price: 99,
    billingPeriod: 'monthly',
    limits: {
      maxTours: 100,
      maxScenesPerTour: 100,
      maxHotspotsPerScene: 50,
      videoSupport: true,
      customBranding: true,
      analytics: true,
      teamMembers: 10,
      apiAccess: true,
      prioritySupport: true
    },
    features: [
      '100 Virtual Tours',
      '100 Scenes per tour',
      '50 Hotspots per scene',
      '360° Video support',
      'Embed tours on websites',
      'Priority support',
    ]
  }
];

// Default free subscription
const DEFAULT_SUBSCRIPTION: UserSubscription = {
  planId: 'free',
  planType: 'free',
  status: 'active',
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  cancelAtPeriodEnd: false,
  billingCycle: 'monthly',  // Ensure this is set as required
  mode: 'production'
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    toursCreated: 0,
    totalScenes: 0,
    publishedTours: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Get payment mode from environment
  const paymentMode = getPaymentMode();

  // Log the mode for debugging
  useEffect(() => {
    console.log('Using payment mode from environment:', paymentMode);
  }, [paymentMode]);

  // Fetch the user's subscription when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserSubscription();
    } else {
      setCurrentSubscription(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Function to update real usage metrics based on actual tours data
  const updateRealUsageMetrics = useCallback((tours: any[]) => {
    if (!tours || tours.length === 0) {
      setUsageMetrics({
        toursCreated: 0,
        totalScenes: 0,
        publishedTours: 0
      });
      return;
    }

    // Calculate metrics from tours
    const publishedTours = tours.filter(tour => !tour.isDraft).length;
    const totalScenes = tours.reduce((count, tour) => {
      return count + (tour.scenes ? tour.scenes.length : 0);
    }, 0);

    setUsageMetrics({
      toursCreated: tours.length,
      totalScenes,
      publishedTours
    });
  }, []);

  const fetchUserSubscription = async () => {
    setIsLoading(true);
    try {
      let subscription;
      
      // First try to get subscription from Cognito attributes
      try {
        console.log('Attempting to get subscription from Cognito attributes');
        subscription = await getSubscriptionFromUserAttributes();
        console.log('Retrieved subscription from Cognito:', subscription);
      } catch (cognitoError) {
        console.warn('Could not retrieve subscription from Cognito:', cognitoError);
        
        // Check if we need to handle missing subscription attribute
        if (cognitoError.message && cognitoError.message.includes('No subscription found')) {
          console.log('No subscription attribute found in Cognito, will create a default one');
        }
        
        // If Cognito fails, try the API
        try {
          console.log('Falling back to API for subscription data');
          const response = await fetch('/api/user/subscription');
          
          if (response.ok) {
            subscription = await response.json();
            console.log('Successfully retrieved subscription from API:', subscription);
            
            // Store in Cognito for future use
            try {
              await storeSubscriptionInUserAttributes(subscription);
            } catch (storageError) {
              console.warn('Failed to store API subscription in Cognito:', storageError);
            }
          } else {
            throw new Error(`API request failed with status: ${response.status}`);
          }
        } catch (apiError) {
          console.error('Error fetching subscription from API:', apiError);
          
          // As a final fallback, use the free plan
          console.log('Falling back to default free subscription');
          subscription = DEFAULT_SUBSCRIPTION;
          
          // Try to store this default subscription in Cognito
          try {
            await storeSubscriptionInUserAttributes(subscription);
            console.log('Successfully stored default free subscription in Cognito');
          } catch (storageError) {
            console.warn('Failed to store default subscription in Cognito:', storageError);
          }
        }
      }
      
      // CRITICAL FIX: Ensure subscription has a valid billing cycle
      if (subscription) {
        // Force check and correct billing cycle
        if (!subscription.billingCycle) {
          console.log('No billing cycle found in subscription, defaulting to monthly');
          subscription.billingCycle = 'monthly';
        }
        
        // If subscription ID is present, validate billing cycle against it
        if (subscription.subscriptionId) {
          const subscriptionId = subscription.subscriptionId.toLowerCase();
          
          // Check if subscription ID provides clues about billing cycle
          if ((subscriptionId.includes('month') || subscriptionId.includes('-m-')) && 
              subscription.billingCycle === 'yearly') {
            console.warn('CRITICAL FIX: Subscription ID suggests monthly but billing cycle is yearly');
            subscription.billingCycle = 'monthly';
            
            // Save the correction
            try {
              await storeSubscriptionInUserAttributes(subscription);
              console.log('Successfully fixed billing cycle to monthly based on subscription ID');
            } catch (e) {
              console.error('Failed to store billing cycle correction:', e);
            }
          }
        }
        
        // Always ensure mode is set
        if (!subscription.mode) {
          subscription.mode = paymentMode;
        }
        
        // Log final billing cycle determination
        console.log(`Final billing cycle: ${subscription.billingCycle}`);
      }
      
      // Set the subscription data
      setCurrentSubscription(subscription);
      return subscription;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      // Ensure we always have a valid subscription by using the default free plan
      const defaultSub = DEFAULT_SUBSCRIPTION;
      setCurrentSubscription(defaultSub); 
      return defaultSub;
    } finally {
      setIsLoading(false);
    }
  };

  // Get the current plan price with billing cycle applied
  const getCurrentPlanPrice = (): number => {
    const currentPlan = getCurrentPlan();
    if (!currentPlan) return 0;
    
    // CRITICAL FIX: Add detailed logging for debugging
    console.log('Calculating current plan price:', {
      planId: currentPlan.id,
      planType: currentPlan.type,
      basePrice: currentPlan.price,
      billingCycle: currentSubscription?.billingCycle,
      subscriptionId: currentSubscription?.subscriptionId
    });
    
    // IMPORTANT: Always use the subscription's billing cycle directly
    // Do not use any other source or calculation
    if (currentSubscription?.billingCycle === 'yearly') {
      const discountedPrice = Number((currentPlan.price * 0.8).toFixed(2));
      console.log(`Using yearly price with discount: ${currentPlan.price} * 0.8 = ${discountedPrice}`);
      return discountedPrice;
    }
    
    // Default to monthly price
    console.log(`Using standard monthly price: ${currentPlan.price}`);
    return currentPlan.price;
  };

  // Add this helper method to directly access subscription billing information
  const getSubscriptionBillingDetails = () => {
    if (!currentSubscription || !getCurrentPlan()) {
      return {
        cycle: 'monthly' as const,
        isYearly: false,
        rawPrice: 0,
        displayPrice: 0,
        discount: 0
      };
    }
    
    const plan = getCurrentPlan()!;
    const isYearly = currentSubscription.billingCycle === 'yearly';
    const rawPrice = plan.price;
    const discount = isYearly ? 0.2 : 0; // 20% discount for yearly
    const displayPrice = isYearly ? rawPrice * 0.8 : rawPrice;
    
    return {
      cycle: currentSubscription.billingCycle,
      isYearly,
      rawPrice,
      displayPrice,
      discount
    };
  };

  const changeBillingCycle = async (
    newBillingCycle: 'monthly' | 'yearly',
    newSubscriptionId?: string
  ) => {
    setIsLoading(true);
    try {
      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }
  
      console.log('Changing billing cycle:', {
        fromCycle: currentSubscription.billingCycle,
        toCycle: newBillingCycle,
        planId: currentSubscription.planId,
        subscriptionId: newSubscriptionId || currentSubscription.subscriptionId || 'none'
      });
      
      // Try the regular API first
      try {
        // Call API to handle the billing cycle change
        const response = await fetch('/api/user/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: currentSubscription.planId,
            subscriptionId: newSubscriptionId,
            previousSubscriptionId: currentSubscription.subscriptionId, // Pass the previous ID to cancel it
            billingCycle: newBillingCycle,
            changingBillingCycleOnly: true, // Signal this is just a billing cycle change
            mode: paymentMode
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('Server response error when changing billing cycle:', errorData);
          throw new Error(`Failed to change billing cycle: ${errorData}`);
        }
        
        const updatedSubscription = await response.json();
        
        // CRITICAL FIX: Force the correct billing cycle in case server returns inconsistent data
        if (!updatedSubscription.billingCycle || updatedSubscription.billingCycle !== newBillingCycle) {
          console.log(`Server didn't return correct billing cycle, forcing to: ${newBillingCycle}`);
          updatedSubscription.billingCycle = newBillingCycle;
        }
        
        // Store in Cognito to ensure persistence
        try {
          console.log('Storing updated subscription with new billing cycle in Cognito');
          await storeSubscriptionInUserAttributes(updatedSubscription);
        } catch (storageError) {
          console.warn('Failed to store billing cycle change in Cognito:', storageError);
        }
        
        // Update local state
        setCurrentSubscription(updatedSubscription);
        
        toast.success(`Successfully changed to ${newBillingCycle} billing!`);
        
        return updatedSubscription;
      } catch (apiError) {
        console.error('Error calling regular API, trying admin API:', apiError);
        
        // If regular API fails, try admin API as fallback
        if (!user?.attributes?.sub) {
          throw new Error('User ID not available');
        }
        
        // Create the updated subscription data
        const updatedSubscription = {
          ...currentSubscription,
          billingCycle: newBillingCycle,
          subscriptionId: newSubscriptionId || currentSubscription.subscriptionId,
          previousSubscriptionId: currentSubscription.subscriptionId
        };
        
        // Call admin API
        const adminResponse = await fetch('/api/admin/update-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.attributes.sub,
            subscription: updatedSubscription
          }),
        });
        
        if (!adminResponse.ok) {
          const errorData = await adminResponse.text();
          throw new Error(`Admin API failed: ${errorData}`);
        }
        
        // Update local state
        setCurrentSubscription(updatedSubscription);
        
        toast.success(`Successfully changed to ${newBillingCycle} billing!`);
        
        return updatedSubscription;
      }
    } catch (error) {
      console.error('Error changing billing cycle:', error);
      toast.error('Failed to change billing cycle. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeSubscription = async (
    planId: string, 
    subscriptionId?: string, 
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) => {
    setIsLoading(true);
    try {
      // Check if this is just a billing cycle change for the same plan
      if (
        currentSubscription && 
        currentSubscription.planId === planId && 
        currentSubscription.billingCycle !== billingCycle
      ) {
        console.log('Detected billing cycle change for same plan, using changeBillingCycle method');
        return await changeBillingCycle(billingCycle, subscriptionId);
      }
  
      // Add more detailed logging
      console.log('Upgrading subscription with:', {
        planId,
        subscriptionId,
        billingCycle,
        mode: paymentMode
      });
      
      // Validate that we have a subscription ID for paid plans
      if (planId !== 'free' && !subscriptionId) {
        console.error('Missing subscription ID during upgrade to paid plan');
        throw new Error('Missing subscription ID - payment not completed');
      }
      
      // Create the subscription data
      const subscriptionData = {
        planId,
        planType: planId === 'pro' ? 'pro' : planId === 'enterprise' ? 'enterprise' : 'free',
        status: 'active',
        subscriptionId,
        previousSubscriptionId: currentSubscription?.subscriptionId,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        billingCycle,
        mode: paymentMode
      };
      
      // First try the regular API
      try {
        console.log('Calling API to confirm subscription');
        const response = await fetch('/api/user/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId,
            subscriptionId,
            previousSubscriptionId: currentSubscription?.subscriptionId,
            billingCycle,
            mode: paymentMode
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const updatedSubscription = await response.json();
        setCurrentSubscription(updatedSubscription);
        return updatedSubscription;
      } catch (apiError) {
        console.error('Regular API call failed, trying admin API:', apiError);
        
        // If the regular API fails, try the admin API as a fallback
        if (!user?.attributes?.sub) {
          throw new Error('User ID not available');
        }
        
        const adminResponse = await fetch('/api/admin/update-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.attributes.sub,
            subscription: subscriptionData
          }),
        });
        
        if (!adminResponse.ok) {
          throw new Error(`Admin API request failed: ${adminResponse.status}`);
        }
        
        // Update local state with our data since we know the admin API worked
        setCurrentSubscription(subscriptionData);
        
        toast.success(`Successfully upgraded to ${SUBSCRIPTION_PLANS.find(p => p.id === planId)?.name || ''} plan!`);
        
        return subscriptionData;
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast.error('Failed to upgrade subscription. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setIsLoading(true);
    try {
      if (!currentSubscription?.subscriptionId) {
        throw new Error('No active subscription found');
      }
      
      const response = await fetch(`/api/user/subscription?subscriptionId=${currentSubscription.subscriptionId}&mode=${currentSubscription.mode || paymentMode}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      const updatedSubscription = await response.json();
      
      // Also update in Cognito
      try {
        await storeSubscriptionInUserAttributes(updatedSubscription);
      } catch (storageError) {
        console.warn('Error storing cancellation in Cognito:', storageError);
      }
      
      setCurrentSubscription(updatedSubscription);
      toast.success('Your subscription will be canceled at the end of the billing period');
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resumeSubscription = async () => {
    setIsLoading(true);
    try {
      if (!currentSubscription?.subscriptionId) {
        throw new Error('No subscription found to resume');
      }
      
      const response = await fetch('/api/user/subscription', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: currentSubscription.subscriptionId,
          mode: currentSubscription.mode || paymentMode
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to resume subscription');
      }
      
      const updatedSubscription = await response.json();
      
      // Also update in Cognito
      try {
        await storeSubscriptionInUserAttributes(updatedSubscription);
      } catch (storageError) {
        console.warn('Error storing reactivation in Cognito:', storageError);
      }
      
      setCurrentSubscription(updatedSubscription);
      toast.success('Your subscription has been resumed');
    } catch (error) {
      console.error('Error resuming subscription:', error);
      toast.error('Failed to resume subscription. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscription = async () => {
    setIsLoading(true);
    try {
      console.log('Refreshing subscription data...');
      let subscription;
      
      // Get subscription from API with proper error handling
      try {
        console.log('Fetching subscription from API endpoint...');
        const response = await fetch('/api/user/subscription', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (response.ok) {
          subscription = await response.json();
          console.log('Successfully retrieved subscription from API:', {
            planId: subscription.planId,
            planType: subscription.planType,
            billingCycle: subscription.billingCycle,
            subscriptionId: subscription.subscriptionId
          });
        } else {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }
      } catch (apiError) {
        console.error('Error fetching subscription from API:', apiError);
        
        // Try to get from Cognito attributes as fallback
        try {
          console.log('Falling back to getting subscription from Cognito...');
          subscription = await getSubscriptionFromUserAttributes();
          console.log('Successfully retrieved subscription from Cognito:', {
            planId: subscription.planId,
            planType: subscription.planType,
            billingCycle: subscription.billingCycle
          });
        } catch (cognitoError) {
          console.error('Error fetching subscription from Cognito:', cognitoError);
          
          // As a final fallback, use the free plan
          console.log('Using default free subscription as fallback');
          subscription = DEFAULT_SUBSCRIPTION;
        }
      }
      
      // Ensure the subscription has the correct mode
      if (subscription && !subscription.mode) {
        subscription.mode = paymentMode;
      }
      
      // Ensure billingCycle is set (default to monthly if missing)
      if (subscription && !subscription.billingCycle) {
        console.log('No billing cycle found during refresh, setting to monthly');
        subscription.billingCycle = 'monthly';
      }
      
      // CRITICAL: For billing cycle changes, verify the change was applied correctly
      if (currentSubscription && subscription &&
          currentSubscription.planId === subscription.planId &&
          currentSubscription.billingCycle !== subscription.billingCycle) {
        console.log('Detected billing cycle change in refresh:', {
          from: currentSubscription.billingCycle,
          to: subscription.billingCycle
        });
      }
      
      // Deep comparison to see if anything actually changed
      const hasChanged = JSON.stringify(currentSubscription) !== JSON.stringify(subscription);
      
      if (hasChanged) {
        console.log('Subscription data has changed, updating state');
        // Set the subscription data
        setCurrentSubscription(subscription);
      } else {
        console.log('No change detected in subscription data');
      }
      
      return subscription;
    } catch (error) {
      console.error('Error refreshing user subscription:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlan = (): SubscriptionPlan | null => {
    if (!currentSubscription) return null;
    return SUBSCRIPTION_PLANS.find(plan => plan.id === currentSubscription.planId) || null;
  };

  // Modified to accept the tours count as a parameter instead of using the tours context
  const getRemainingQuota = (toursCount: number = 0) => {
    const currentPlan = getCurrentPlan();
    const maxTours = currentPlan?.limits.maxTours || 0;
    const remainingTours = Math.max(0, maxTours - toursCount);
    
    return {
      remainingTours,
      tourLimitReached: toursCount >= maxTours
    };
  };

  const isPlanFeatureAvailable = (feature: keyof PlanLimits): boolean => {
    const currentPlan = getCurrentPlan();
    if (!currentPlan) return false;
    
    // Special handling for numeric limits
    if (typeof currentPlan.limits[feature] === 'number') {
      return (currentPlan.limits[feature] as number) > 0;
    }
    
    // Boolean features
    return !!currentPlan.limits[feature];
  };

  const getMaxScenesForCurrentPlan = (): number => {
    const currentPlan = getCurrentPlan();
    return currentPlan?.limits.maxScenesPerTour || 0;
  };

  const getMaxHotspotsForCurrentPlan = (): number => {
    const currentPlan = getCurrentPlan();
    return currentPlan?.limits.maxHotspotsPerScene || 0;
  };

  return (
    <SubscriptionContext.Provider value={{
      plans: SUBSCRIPTION_PLANS,
      currentSubscription,
      usageMetrics,
      isLoading,
      upgradeSubscription,
      changeBillingCycle,
      cancelSubscription,
      resumeSubscription,
      getRemainingQuota,
      isPlanFeatureAvailable,
      getCurrentPlan,
      getCurrentPlanPrice,
      getMaxScenesForCurrentPlan,
      getMaxHotspotsForCurrentPlan,
      refreshSubscription,
      refreshUsageMetrics: updateRealUsageMetrics,
      paymentMode
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
