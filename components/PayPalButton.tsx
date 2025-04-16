"use client"

import { useState, useEffect, useRef } from 'react'
import { SubscriptionPlan } from "@/contexts/SubscriptionContext"
import { Loader2, AlertTriangle } from 'lucide-react'
import { getPaymentMode, getPayPalClientId, getPayPalPlanId, logEnvironmentVariables } from '@/lib/payment/config-utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface PayPalButtonProps {
  plan: SubscriptionPlan
  billingCycle: 'monthly' | 'yearly'
  onSuccess: (subscriptionId: string) => void
  onError: (error: Error) => void
  mode?: 'production' | 'sandbox'
  isChangingBillingCycleOnly?: boolean // Add this prop
}

// Types for PayPal SDK
interface PayPalButtonsComponentProps {
  style?: {
    layout?: 'vertical' | 'horizontal'
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black'
    shape?: 'rect' | 'pill'
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'subscribe'
    height?: number
  }
  createSubscription?: (data: any, actions: any) => Promise<string>
  onApprove: (data: any, actions: any) => Promise<void>
  onError?: (err: any) => void
  onCancel?: () => void
}

interface PayPalNamespace {
  Buttons: (props: PayPalButtonsComponentProps) => {
    render: (container: string | HTMLElement) => void
  }
}

declare global {
  interface Window {
    paypal?: PayPalNamespace
  }
}

export default function PayPalButton({
  plan,
  billingCycle,
  onSuccess,
  onError,
  mode: providedMode,
  isChangingBillingCycleOnly = false // Default to false
}: PayPalButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Determine payment mode - use provided mode, or fall back to environment setting
  const configuredMode = getPaymentMode()
  const paymentMode = providedMode as 'production' | 'sandbox' || configuredMode
  
  // Log environment variables when component mounts (in development only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      logEnvironmentVariables()
    }
  }, [])

  // Log if this is a billing cycle change for debugging
  useEffect(() => {
    if (isChangingBillingCycleOnly) {
      console.log('PayPalButton: Handling billing cycle change', {
        plan: plan.id,
        billingCycle,
        mode: paymentMode
      });
    }
  }, [isChangingBillingCycleOnly, plan.id, billingCycle, paymentMode]);
    
  // Load PayPal script
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check if script is already loaded
    if (window.paypal) {
      setIsScriptLoaded(true)
      return
    }
    
    setIsLoading(true)
    
    // Get the appropriate client ID based on mode
    const clientId = getPayPalClientId(paymentMode)
    
    if (!clientId) {
      console.error(`PayPal ${paymentMode} Client ID is missing`)
      setConfigError(`PayPal ${paymentMode} Client ID is missing. Please check your environment configuration.`)
      setIsLoading(false)
      return
    }
    
    const script = document.createElement('script')
    
    // Use the correct PayPal SDK URL with the client ID for the active mode
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=subscription&vault=true&commit=true`
    
    console.log("Loading PayPal SDK with URL:", script.src)
    script.async = true
    
    script.onload = () => {
      console.log(`PayPal SDK loaded successfully for ${paymentMode} mode`)
      setIsScriptLoaded(true)
      setIsLoading(false)
    }
    
    script.onerror = (err) => {
      console.error('Error loading PayPal SDK:', err)
      setConfigError(`Failed to load PayPal SDK for ${paymentMode} mode. Please check your network connection and try again.`)
      setIsLoading(false)
    }
    
    document.body.appendChild(script)
    
    return () => {
      // Cleanup if component unmounts during loading
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [onError, paymentMode])
  
  // Render PayPal button once script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current || typeof window === 'undefined' || !window.paypal) return
    
    // Clear previous buttons and errors
    containerRef.current.innerHTML = ''
    setConfigError(null)
    
    try {
      // Get the PayPal plan ID for this plan and billing cycle
      const paypalPlanId = getPayPalPlanId(plan.type, billingCycle, paymentMode)
      
      if (!paypalPlanId) {
        console.error(`No plan ID found for ${plan.type} (${billingCycle}) in ${paymentMode} mode`)
        setConfigError(`PayPal plan ID is missing for the ${plan.name} plan with ${billingCycle} billing cycle in ${paymentMode} mode. Please check your environment configuration.`)
        return
      }
      
      console.log(`Using PayPal plan ID for ${paymentMode}:`, paypalPlanId)
      
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'subscribe'
        },
        createSubscription: (data, actions) => {
          setIsLoading(true)
          console.log("Creating subscription with plan ID:", paypalPlanId)
          
          // Generate a custom ID to help with tracking - include plan ID, billing cycle and timestamp
          const customId = `${plan.id}_${billingCycle}_${Date.now()}`
          
          return actions.subscription.create({
            plan_id: paypalPlanId,
            custom_id: customId,
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              user_action: 'SUBSCRIBE_NOW',
              return_url: window.location.href,
              cancel_url: window.location.href
            }
          }).catch(err => {
            console.error('Error creating subscription:', err)
            setIsLoading(false)
            onError(err instanceof Error ? err : new Error('Failed to create subscription'))
            throw err
          })
        },
        onApprove: async (data, actions) => {
          try {
            // IMPORTANT: This is where we get the subscription ID
            const { subscriptionID } = data
            
            if (!subscriptionID) {
              throw new Error('No subscription ID returned from PayPal')
            }
            
            console.log(`Subscription approved with ID: ${subscriptionID} in ${paymentMode} mode`)
            
            // CRITICAL: Log all data from PayPal to ensure we have the correct subscription ID
            console.log('Complete PayPal approval data:', data)
            
            // For development/sandbox mode or billing cycle changes: allow simpler verification
            if (process.env.NODE_ENV !== 'production' || paymentMode === 'sandbox' || isChangingBillingCycleOnly) {
              console.log('Development/Sandbox mode or billing cycle change: Proceeding with simplified verification')
              // DIRECTLY pass the subscription ID to the success handler
              onSuccess(subscriptionID)
              return
            }
            
            // In production, verify the payment with the backend
            try {
              const verifyResponse = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  subscriptionId: subscriptionID, // Make sure this exact ID is used
                  planId: plan.id,
                  billingCycle,
                  mode: paymentMode,
                  changingBillingCycleOnly: isChangingBillingCycleOnly // Pass this flag
                }),
              })
              
              if (!verifyResponse.ok) {
                const errorData = await verifyResponse.text()
                
                // If just changing billing cycle, be more lenient with verification errors
                if (isChangingBillingCycleOnly) {
                  console.warn('Verification failed but continuing due to billing cycle change only:', errorData)
                  onSuccess(subscriptionID)
                  return
                }
                
                throw new Error(`Payment verification failed: ${errorData}`)
              }
              
              const verificationResult = await verifyResponse.json()
              console.log('Verification result:', verificationResult)
              
              // Send the success callback with the subscription ID
              onSuccess(subscriptionID)
            } catch (verifyError) {
              console.error('Verification error:', verifyError)
              
              // Even if verification fails in dev or for billing cycle changes, allow the subscription to proceed
              if (process.env.NODE_ENV !== 'production' || isChangingBillingCycleOnly) {
                console.warn('Proceeding despite verification error due to development mode or billing cycle change')
                onSuccess(subscriptionID)
                return
              }
              
              throw verifyError
            }
          } catch (error) {
            console.error('Error processing approval:', error)
            onError(error instanceof Error ? error : new Error('Error processing subscription'))
          } finally {
            setIsLoading(false)
          }
        },
        onError: (err) => {
          console.error('PayPal error:', err)
          setIsLoading(false)
          onError(err instanceof Error ? err : new Error('PayPal subscription failed'))
        },
        onCancel: () => {
          console.log('Subscription cancelled by user')
          setIsLoading(false)
        }
      }).render(containerRef.current)
    } catch (error) {
      console.error('Error rendering PayPal buttons:', error)
      setConfigError(`Failed to render PayPal buttons: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }, [isScriptLoaded, plan, billingCycle, onSuccess, onError, paymentMode, isChangingBillingCycleOnly])
  
  // Create a simulated payment in development mode
  const handleSimulatePayment = async () => {
    try {
      setIsLoading(true)
      
      // Create a fake subscription ID with appropriate prefix
      let subscriptionId;
      
      if (isChangingBillingCycleOnly) {
        // For billing cycle changes, use a special prefix
        subscriptionId = `CYCLE-CHANGE-${plan.type}-${billingCycle}-${Date.now()}`;
        console.log('Simulating payment for billing cycle change:', subscriptionId);
      } else {
        // For normal subscriptions
        subscriptionId = `SIMULATED-${plan.type}-${billingCycle}-${Date.now()}`;
        console.log('Simulating payment for new subscription:', subscriptionId);
      }
      
      // Wait a bit to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call the success handler with our simulated ID
      onSuccess(subscriptionId);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Simulated payment failed'));
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Configuration error message */}
      {configError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {configError}
            
            {/* For development, offer simulation option */}
            {(process.env.NODE_ENV !== 'production' || paymentMode === 'sandbox') && (
              <div className="mt-2">
                <Button 
                  onClick={handleSimulatePayment}
                  className="w-full mt-2"
                  variant="outline"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    `Simulate ${isChangingBillingCycleOnly ? 'Billing Change' : 'Successful Payment'}`
                  )}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* PayPal button container */}
      <div 
        ref={containerRef} 
        className={`min-h-[40px] ${isLoading ? 'opacity-50' : ''}`}
      />

      {/* Loading indicator */}
      {isLoading && !configError && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  )
}