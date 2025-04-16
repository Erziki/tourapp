"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { SubscriptionPlan } from '@/contexts/SubscriptionContext'
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getPaymentMode } from '@/lib/payment/config-utils'
import PayPalButton from '@/components/PayPalButton'

interface PaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  plan: SubscriptionPlan | null
  billingCycle: 'monthly' | 'yearly'
  onSuccess: (subscriptionId: string) => Promise<void>
  currentPlanId?: string // Added to detect billing cycle changes
  currentBillingCycle?: 'monthly' | 'yearly' // Added to detect billing cycle changes
}

export default function PaymentDialog({
  isOpen,
  onClose,
  plan,
  billingCycle,
  onSuccess,
  currentPlanId,
  currentBillingCycle
}: PaymentDialogProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [paymentMode, setPaymentMode] = useState<'production' | 'sandbox'>(getPaymentMode())

  // Detect if this is just a billing cycle change for the same plan
  const isChangingBillingCycleOnly = 
    currentPlanId && 
    plan?.id === currentPlanId && 
    billingCycle !== currentBillingCycle;
  
  // Calculate price based on billing cycle
  const yearlyDiscount = 20 // 20% discount
  const getPrice = () => {
    if (!plan) return 0
    if (billingCycle === 'yearly') {
      return Number((plan.price * (1 - yearlyDiscount / 100)).toFixed(2))
    }
    return plan.price
  }

  // Calculate yearly total price
  const getYearlyTotal = () => {
    if (!plan || billingCycle !== 'yearly') return 0
    return Number((plan.price * 12 * (1 - yearlyDiscount / 100)).toFixed(2))
  }

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setError(null);
    }
  }, [isOpen]);

  // Log when billing cycle change is detected
  useEffect(() => {
    if (isChangingBillingCycleOnly) {
      console.log('Detected billing cycle change only:', {
        plan: plan?.id,
        fromCycle: currentBillingCycle,
        toCycle: billingCycle
      });
    }
  }, [isChangingBillingCycleOnly, plan?.id, currentBillingCycle, billingCycle]);

  const handlePaymentSuccess = async (subscriptionId: string) => {
    if (!plan) return
    
    setStatus('processing')
    setError(null)
    
    try {
      // Enhanced logging to debug the payment process
      console.log(`Payment successful with subscription ID: ${subscriptionId}`, {
        plan: plan.id,
        billingCycle,
        isChangingBillingCycleOnly,
        paymentMode
      });
      
      // Explicitly log the billing cycle being sent to the API
      console.log(`Using billing cycle for payment processing: ${billingCycle}`);
      
      // Call the parent component's success handler and wait for it to complete
      await onSuccess(subscriptionId)
      
      // Set success state AFTER the onSuccess has fully completed
      setStatus('success')
      
      // Automatically close dialog after success with a slightly longer delay
      // to ensure state propagation through the app
      setTimeout(() => {
        onClose()
      }, 3000)
    } catch (e: any) {
      console.error('Payment processing error:', e)
      setStatus('error')
      setError(e.message || 'Failed to process your subscription. Please try again.')
    }
  }

  const handlePaymentError = (error: Error) => {
    setStatus('error')
    setError(error.message || 'Payment failed. Please try again later.')
  }

  const resetDialog = () => {
    setStatus('idle')
    setError(null)
    onClose()
  }

  if (!plan) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isChangingBillingCycleOnly 
              ? `Change to ${billingCycle} billing` 
              : `Subscribe to ${plan.name}`}
          </DialogTitle>
          <DialogDescription>
            {isChangingBillingCycleOnly
              ? `You're changing from ${currentBillingCycle} billing to ${billingCycle} billing.`
              : billingCycle === 'monthly' 
                ? 'You will be charged monthly for this subscription.'
                : `You will be charged annually with a ${yearlyDiscount}% discount.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-700 dark:text-gray-300">Processing your payment...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {isChangingBillingCycleOnly
                  ? 'Billing cycle changed successfully!'
                  : 'Payment Successful!'}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {isChangingBillingCycleOnly
                  ? `Your subscription is now on ${billingCycle} billing.`
                  : 'Your subscription has been activated.'}
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>{error || 'An error occurred during payment. Please try again.'}</AlertDescription>
            </Alert>
          )}
          
          {status === 'idle' && (
            <>
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{plan.name} Plan</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        {billingCycle === 'yearly' ? 'Annual billing' : 'Monthly billing'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${getPrice().toFixed(2)}<span className="text-sm font-normal">/mo</span></div>
                      {billingCycle === 'yearly' && (
                        <div className="text-green-600 dark:text-green-400 text-sm">
                          Save ${(plan.price * 12 * yearlyDiscount / 100).toFixed(2)}/year
                        </div>
                      )}
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-gray-500 mt-1">
                          ${getYearlyTotal()} billed annually
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isChangingBillingCycleOnly && (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <AlertDescription>
                        Your previous subscription will be canceled, and you'll be billed immediately for the new {billingCycle} subscription.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-medium mb-2">Plan features:</h4>
                    <ul className="space-y-1 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-gray-600 dark:text-gray-300">
                          <span className="text-green-500 mr-2">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <PayPalButton 
                plan={plan} 
                billingCycle={billingCycle}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                mode={paymentMode}
                isChangingBillingCycleOnly={isChangingBillingCycleOnly} // Pass this flag
              />
            </>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button 
            variant="outline" 
            onClick={resetDialog}
            disabled={status === 'processing'}
          >
            Cancel
          </Button>
          
          {status === 'success' && (
            <Button 
              onClick={resetDialog}
              className="bg-green-600 hover:bg-green-700"
            >
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}