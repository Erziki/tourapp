"use client"

import { useState, useEffect, useRef } from "react"
import { useSubscription } from "@/contexts/SubscriptionContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, AlertTriangle, CreditCard, LifeBuoy, TrendingUp, Check, ArrowLeft, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import PaymentDialog from "@/components/PaymentDialog"
import { toast } from 'sonner'
import ContactDialog from "@/components/ContactDialog"

export default function SubscriptionManager() {
  const { 
    currentSubscription, 
    usageMetrics, 
    getCurrentPlan,
    getRemainingQuota,
    cancelSubscription,
    resumeSubscription,
    plans,
    upgradeSubscription,
    changeBillingCycle,
    refreshSubscription,
  } = useSubscription()
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [showContactDialog, setShowContactDialog] = useState(false)
  
  const currentPlan = getCurrentPlan()
  const { remainingTours, tourLimitReached } = getRemainingQuota(usageMetrics.toursCreated)
  

  // Check if we just completed a subscription upgrade on page load
  useEffect(() => {
    // Check if we just completed a subscription upgrade
    const hasUpgraded = sessionStorage.getItem('subscription_upgraded');
    if (hasUpgraded === 'true') {
      // Get plan info from session storage
      const plan = sessionStorage.getItem('subscription_plan');
      const cycle = sessionStorage.getItem('subscription_cycle');
      
      // Clear flags from session storage
      sessionStorage.removeItem('subscription_upgraded');
      sessionStorage.removeItem('subscription_plan');
      sessionStorage.removeItem('subscription_cycle');
      
      // Show success message
      toast.success(`Successfully upgraded to ${
        plans.find(p => p.id === plan)?.name || 'new'
      } plan with ${cycle} billing!`);
    }
  }, []); // Empty dependency array so it only runs once on component mount

  // DEBUG: Log subscription details when they change - FIXED ORDER
  useEffect(() => {
    if (currentSubscription && currentPlan) {
      console.log('BILLING CYCLE DEBUG:', {
        planId: currentSubscription.planId,
        planName: currentPlan?.name,
        actualBillingCycle: currentSubscription.billingCycle,
        uiStatesBillingCycle: billingCycle, 
        subscriptionId: currentSubscription.subscriptionId
      });
    }
  }, [currentSubscription, billingCycle, currentPlan]);

  // Initialize the billing cycle tabs based on current subscription
  useEffect(() => {
    if (currentSubscription && currentSubscription.billingCycle) {
      console.log(`Setting billing cycle tabs to: ${currentSubscription.billingCycle}`);
      setBillingCycle(currentSubscription.billingCycle);
    } else {
      console.log('No billing cycle found in subscription, defaulting to monthly');
      setBillingCycle('monthly');
    }
  }, [currentSubscription]);
  
  if (!currentPlan || !currentSubscription) {
    return null
  }

  const totalUsagePercentage = Math.min(
    100,
    Math.round((usageMetrics.toursCreated / (currentPlan.limits.maxTours || 1)) * 100)
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Helper function to calculate display price directly from subscription data
  const getDisplayPrice = () => {
    if (!currentPlan) return '0.00';
    
    // CRITICAL FIX: Always use the billing cycle directly from subscription data
    // This ensures correct price display regardless of UI state
    const actualBillingCycle = currentSubscription.billingCycle || 'monthly';
    
    if (actualBillingCycle === 'yearly') {
      const yearlyPrice = (currentPlan.price * 0.8).toFixed(2);
      console.log(`Calculating yearly price: ${currentPlan.price} * 0.8 = ${yearlyPrice}`);
      return yearlyPrice;
    }
    
    // Default to monthly price (no discount)
    console.log(`Using standard monthly price: ${currentPlan.price}`);
    return currentPlan.price.toFixed(2);
  };

  const handleCancelSubscription = async () => {
    setProcessingAction(true)
    try {
      await cancelSubscription()
      setCancelDialogOpen(false)
      await refreshSubscription()
      setPaymentError(null)
    } catch (error) {
      console.error('Error canceling subscription:', error)
      setPaymentError('Failed to cancel subscription. Please try again.')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleResumeSubscription = async () => {
    setProcessingAction(true)
    try {
      await resumeSubscription()
      await refreshSubscription()
      setPaymentError(null)
    } catch (error) {
      console.error('Error resuming subscription:', error)
      setPaymentError('Failed to resume subscription. Please try again.')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleUpgradeClick = () => {
    setShowUpgradeOptions(true)
    setPaymentError(null)
  }

  const handleSelectPlan = (planId: string) => {
    // Check if this is just changing the billing cycle of the current plan
    const isChangingBillingCycle = 
      planId === currentPlan.id && 
      currentPlan.type !== 'free';
    
    // Debug logging
    console.log('Plan selected:', {
      selectedPlanId: planId,
      currentPlanId: currentPlan.id,
      selectedBillingCycle: billingCycle,
      currentBillingCycle: currentSubscription.billingCycle,
      isChangingBillingCycle
    });
    
    setSelectedPlan(planId);
    setShowPaymentDialog(true);
  }

  const handlePaymentSuccess = async (subscriptionId: string) => {
    if (!selectedPlan) {
      setPaymentError("No plan selected");
      return;
    }
    
    // Ensure we have a subscription ID
    if (!subscriptionId) {
      setPaymentError("Missing subscription ID from PayPal");
      return;
    }
    
    setProcessingAction(true);
    setPaymentError(null);
    
    try {
      console.log(`Processing subscription with ID: ${subscriptionId}`, {
        planId: selectedPlan,
        billingCycle,
        currentBillingCycle: currentSubscription.billingCycle,
        isChangingBillingCycle: selectedPlan === currentPlan?.id && billingCycle !== currentSubscription.billingCycle
      });
      
      // Explicitly log the billing cycle being used
      console.log(`Using billing cycle: ${billingCycle}`);
      
      // Check if this is just a billing cycle change for the same plan
      if (selectedPlan === currentPlan?.id && billingCycle !== currentSubscription.billingCycle) {
        console.log('Changing billing cycle only');
        // Use the dedicated billing cycle change method
        await changeBillingCycle(billingCycle, subscriptionId);
      } else {
        // Regular plan upgrade/change
        await upgradeSubscription(selectedPlan, subscriptionId, billingCycle);
      }
      
      // We'll do multiple refresh attempts to ensure data is synchronized
      console.log('Subscription updated, initiating refresh sequence...');
      
      // First refresh attempt
      console.log('First refresh attempt...');
      await refreshSubscription();
      
      // Simulate manual refresh with location.reload after timeout
      // This ensures complete data refresh without user intervention
      setTimeout(() => {
        console.log('Performing complete page refresh...');
        
        // Save a flag in session storage to show success message after reload
        sessionStorage.setItem('subscription_upgraded', 'true');
        sessionStorage.setItem('subscription_plan', selectedPlan);
        sessionStorage.setItem('subscription_cycle', billingCycle);
        
        // Refresh the page to ensure all data is freshly loaded
        window.location.reload();
        
      }, 1000); // Wait 1 second before reload for better UX
      
      // Close dialogs - they'll be closed by page reload anyway
      setShowPaymentDialog(false);
      setShowUpgradeOptions(false);
    } catch (error: any) {
      console.error('Error processing subscription:', error);
      setPaymentError(error.message || 'Failed to update your subscription. Please contact support.');
      throw error; // Rethrow to allow PaymentDialog to handle error display
    } finally {
      setProcessingAction(false);
    }
  };

  // Calculate yearly price with discount
  const getYearlyPrice = (monthlyPrice: number) => {
    const yearlyDiscount = 20; // 20% discount
    return (monthlyPrice * 12 * (1 - yearlyDiscount / 100)).toFixed(2);
  }

  // Calculate monthly savings when paid yearly
  const getMonthlySavings = (monthlyPrice: number) => {
    const yearlyDiscount = 20; // 20% discount
    const monthlySavings = monthlyPrice * yearlyDiscount / 100;
    return monthlySavings.toFixed(2);
  }

  const renderCurrentSubscription = () => (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Your Subscription</CardTitle>
            <CardDescription>Manage your plan and subscription settings</CardDescription>
          </div>
          <Badge 
            variant={currentSubscription.status === 'active' ? 'default' : 'destructive'} 
            className="capitalize"
          >
            {currentSubscription.status}
            {currentSubscription.cancelAtPeriodEnd ? ' (Cancels soon)' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Current Plan</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              {currentPlan.name}
              {currentPlan.popular && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  Popular
                </Badge>
              )}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Price</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${getDisplayPrice()}<span className="text-base font-normal text-gray-500 dark:text-gray-400">/month</span>
            </p>
            <p className="text-sm mt-1">
              {currentSubscription.billingCycle === 'yearly' 
                ? <span className="text-green-600 dark:text-green-400">Billed yearly (20% savings)</span>
                : <span className="text-gray-500 dark:text-gray-400">Billed monthly</span>
              }
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Billing Cycle</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              {currentSubscription.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
              {currentSubscription.billingCycle === 'yearly' && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-800 border-green-200">
                  20% off
                </Badge>
              )}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Renews: {currentPlan.type === 'free' ? 'Not Applicable' : formatDate(currentSubscription.currentPeriodEnd)}
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tours Usage</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {usageMetrics.toursCreated} of {currentPlan.limits.maxTours}
            </span>
          </div>
          <Progress value={totalUsagePercentage} className="h-2" />
          
          {tourLimitReached && (
            <div className="mt-2 flex items-start">
              <AlertTriangle className="text-amber-500 h-4 w-4 mt-0.5 mr-1.5 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                You've reached your tour limit. Upgrade your plan to create more tours.
              </p>
            </div>
          )}
        </div>

        {paymentError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-between">
        <div className="flex space-x-2">
          {currentSubscription.cancelAtPeriodEnd ? (
            <Button
              variant="outline"
              onClick={handleResumeSubscription}
              disabled={processingAction}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Resume Subscription
            </Button>
          ) : (
            currentPlan.type !== 'free' && (
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                disabled={processingAction}
              >
                Cancel Plan
              </Button>
            )
          )}
        </div>
        
        <Button
          onClick={handleUpgradeClick}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {currentPlan.type === 'free' ? 'Upgrade Plan' : 'Change Plan'}
        </Button>
      </CardFooter>
    </Card>
  )

  // Modified renderUpgradeOptions to filter out free plan
  const renderUpgradeOptions = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Choose a Plan</CardTitle>
            <CardDescription>Select the plan that best fits your needs</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowUpgradeOptions(false)} 
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subscription
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {paymentError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        )}

        <Alert className="mb-4 bg-blue-50 border-blue-100 text-blue-800">
          <Info className="h-4 w-4 mr-2 text-blue-600" />
          <AlertDescription>
            Choose a billing cycle and select the plan that best fits your needs. Yearly billing provides a 20% discount.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue={currentSubscription.billingCycle} className="w-full" onValueChange={(value) => setBillingCycle(value as 'monthly' | 'yearly')}>
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="monthly">Monthly Billing</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly Billing
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Save 20%</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="monthly" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2">
              {plans
                .filter(plan => plan.type !== 'free') // Filter out free plan
                .map((plan) => {
                  // Determine the button text and disabled state
                  let buttonText;
                  let shouldDisableButton = false;
                  
                  if (plan.id === currentPlan.id && currentSubscription.billingCycle === 'monthly') {
                    // This is the current plan with monthly billing
                    buttonText = 'Current Plan';
                    shouldDisableButton = true;
                  } else if (plan.id === currentPlan.id && currentSubscription.billingCycle === 'yearly') {
                    // Current plan but switching from yearly to monthly
                    buttonText = 'Switch to Monthly';
                    shouldDisableButton = false;
                  } else {
                    buttonText = 'Upgrade';
                    shouldDisableButton = processingAction;
                  }
                  
                  return (
                    <Card key={plan.id} className={`flex flex-col ${plan.id === currentPlan.id ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : ''}`}>
                      <CardHeader className={`${plan.popular ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        {plan.popular && (
                          <Badge className="w-fit mb-2 bg-blue-500">Most Popular</Badge>
                        )}
                        <CardTitle>{plan.name}</CardTitle>
                        <div className="mt-2">
                          <span className="text-3xl font-bold">${plan.price}</span>
                          <span className="text-gray-500 dark:text-gray-400">/month</span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <ul className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter className="pt-4 border-t">
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleSelectPlan(plan.id)}
                          disabled={shouldDisableButton || processingAction}
                        >
                          {buttonText}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>

          <TabsContent value="yearly" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2">
              {plans
                .filter(plan => plan.type !== 'free') // Filter out free plan
                .map((plan) => {
                  // Determine the button text and disabled state
                  let buttonText;
                  let shouldDisableButton = false;
                  
                  if (plan.id === currentPlan.id && currentSubscription.billingCycle === 'yearly') {
                    // This is the current plan with yearly billing
                    buttonText = 'Current Plan';
                    shouldDisableButton = true;
                  } else if (plan.id === currentPlan.id && currentSubscription.billingCycle === 'monthly') {
                    // Current plan but switching from monthly to yearly
                    buttonText = 'Switch to Yearly';
                    shouldDisableButton = false;
                  } else {
                    buttonText = 'Upgrade';
                    shouldDisableButton = processingAction;
                  }
                  
                  return (
                    <Card key={plan.id} className={`flex flex-col ${plan.id === currentPlan.id ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : ''}`}>
                      <CardHeader className={`${plan.popular ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        {plan.popular && (
                          <Badge className="w-fit mb-2 bg-blue-500">Most Popular</Badge>
                        )}
                        <CardTitle>{plan.name}</CardTitle>
                        <div className="mt-2">
                          <span className="text-3xl font-bold">${(plan.price * 0.8).toFixed(2)}</span>
                          <span className="text-gray-500 dark:text-gray-400">/month</span>
                          {plan.price > 0 && (
                            <div className="text-green-600 dark:text-green-400 text-sm mt-1">
                              Save ${getMonthlySavings(plan.price)}/month
                            </div>
                          )}
                        </div>
                        {plan.price > 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Billed as ${getYearlyPrice(plan.price)}/year
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <ul className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter className="pt-4 border-t">
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleSelectPlan(plan.id)}
                          disabled={shouldDisableButton || processingAction}
                        >
                          {buttonText}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )

  return (
    <div>
      {showUpgradeOptions ? renderUpgradeOptions() : renderCurrentSubscription()}

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You'll continue to have access until your current billing period ends on {formatDate(currentSubscription.currentPeriodEnd)}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md p-4 my-2">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-3 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-1">What happens after cancellation:</h3>
                <ul className="text-amber-700 dark:text-amber-300 text-sm space-y-1">
                  <li>• Your subscription will remain active until {formatDate(currentSubscription.currentPeriodEnd)}</li>
                  <li>• After that date, you'll be downgraded to the Free plan</li>
                  <li>• Tours exceeding free limits will be kept but set to draft mode</li>
                  <li>• You can reactivate your subscription anytime before it expires</li>
                </ul>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelDialogOpen(false)}
              disabled={processingAction}
            >
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={processingAction}
            >
              {processingAction ? 'Processing...' : 'Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      {selectedPlan && (
        <PaymentDialog
          isOpen={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          plan={plans.find(p => p.id === selectedPlan) || null}
          billingCycle={billingCycle}
          onSuccess={handlePaymentSuccess}
          // Add these props to detect billing cycle changes
          currentPlanId={currentPlan?.id}
          currentBillingCycle={currentSubscription?.billingCycle}
        />
      )}
      
      {!showUpgradeOptions && (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto">
        {/* Usage Details Card - Takes up 2/3 of the space */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                Usage Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <dt className="text-gray-600 dark:text-gray-300 font-medium">Tours Usage</dt>
                  <dd className="font-medium flex items-center">
                    <span className="mr-2">{usageMetrics.toursCreated} of {currentPlan.limits.maxTours}</span>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full" 
                        style={{ width: `${Math.min(100, (usageMetrics.toursCreated / currentPlan.limits.maxTours) * 100)}%` }}
                      ></div>
                    </div>
                  </dd>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <dt className="text-gray-600 dark:text-gray-300 font-medium">Tours Created</dt>
                  <dd className="font-medium">{usageMetrics.toursCreated}</dd>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <dt className="text-gray-600 dark:text-gray-300 font-medium">Published Tours</dt>
                  <dd className="font-medium">{usageMetrics.publishedTours}</dd>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <dt className="text-gray-600 dark:text-gray-300 font-medium">Total Scenes</dt>
                  <dd className="font-medium">{usageMetrics.totalScenes}</dd>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <dt className="text-gray-600 dark:text-gray-300 font-medium">Remaining Tours</dt>
                  <dd className="font-medium flex items-center">
                    <span className={remainingTours <= 3 ? "text-amber-500" : ""}>{remainingTours}</span>
                    {remainingTours <= 3 && remainingTours > 0 && (
                      <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
                    )}
                  </dd>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <dt className="text-gray-600 dark:text-gray-300 font-medium">Scenes per Tour</dt>
                  <dd className="font-medium">{currentPlan.limits.maxScenesPerTour}</dd>
                </div>
                
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600 dark:text-gray-300 font-medium">Hotspots per Scene</dt>
                  <dd className="font-medium">{currentPlan.limits.maxHotspotsPerScene}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Need Help Card - Takes up 1/3 of the space */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <LifeBuoy className="mr-2 h-5 w-5 text-blue-500" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                If you need assistance with your subscription or have questions, our support team is here to help you.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowContactDialog(true)}
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support Dialog */}
        <ContactDialog 
          isOpen={showContactDialog}
          onClose={() => setShowContactDialog(false)}
          title="Subscription Support"
          description="Have questions about your subscription? We're here to help."
        />
      </div>
    )}
    </div>
  )
}