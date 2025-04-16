// utils/subscription-enforcement.ts
import { TourData } from "@/components/VirtualTourEditor"
import { SubscriptionPlan, PlanType } from "@/contexts/SubscriptionContext"

interface SubscriptionEnforcementResult {
  isAllowed: boolean
  disabledTours: TourData[] 
  reason: 'plan_downgraded' | 'limit_exceeded' | 'payment_failed' | null
}

/**
 * Checks if a tour is allowed to be active based on subscription limits
 */
export function checkTourEligibility(
  tour: TourData,
  currentPlan: SubscriptionPlan | null,
  publishedToursCount: number
): { 
  isAllowed: boolean 
  reason: 'plan_downgraded' | 'limit_exceeded' | 'payment_failed' | null
} {
  if (!currentPlan) {
    return { isAllowed: false, reason: 'plan_downgraded' }
  }

  // Check if tour exceeds scene limit
  if (tour.scenes.length > currentPlan.limits.maxScenesPerTour) {
    return { isAllowed: false, reason: 'limit_exceeded' }
  }

  // Check if any scene exceeds hotspot limit
  const exceedsHotspotLimit = tour.scenes.some(
    scene => scene.hotspots.length > currentPlan.limits.maxHotspotsPerScene
  )
  if (exceedsHotspotLimit) {
    return { isAllowed: false, reason: 'limit_exceeded' }
  }

  // Check if tour uses video scenes but plan doesn't support it
  const hasVideoScenes = tour.scenes.some(scene => scene.type === 'video')
  if (hasVideoScenes && !currentPlan.limits.videoSupport) {
    return { isAllowed: false, reason: 'limit_exceeded' }
  }

  // Check total published tours limit
  if (
    !tour.isDraft && 
    publishedToursCount > currentPlan.limits.maxTours
  ) {
    return { isAllowed: false, reason: 'limit_exceeded' }
  }

  // All checks passed
  return { isAllowed: true, reason: null }
}

/**
 * Enforces subscription limits on a list of tours
 * Returns which tours should be disabled and for what reason
 */
export function enforceSubscriptionLimits(
  tours: TourData[], 
  currentPlan: SubscriptionPlan | null,
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing'
): SubscriptionEnforcementResult {
  if (!currentPlan) {
    return {
      isAllowed: false,
      disabledTours: tours,
      reason: 'plan_downgraded'
    }
  }

  // If subscription is not active, disable all non-draft tours that exceed free limits
  if (subscriptionStatus !== 'active' && currentPlan.type !== 'free') {
    const freePlan = getFreeSubscriptionPlan()
    const publishedTours = tours.filter(tour => !tour.isDraft)
    const publishedToursCount = publishedTours.length
    
    const disabledTours = tours.filter(tour => {
      // Check if this tour would be allowed on the free plan
      const { isAllowed } = checkTourEligibility(
        tour, 
        freePlan, 
        Math.min(publishedToursCount, freePlan.limits.maxTours)
      )
      
      // Disable if not allowed on free plan and not already a draft
      return !isAllowed && !tour.isDraft
    })
    
    return {
      isAllowed: disabledTours.length === 0,
      disabledTours,
      reason: 'plan_downgraded'
    }
  }

  // For active subscriptions, enforce plan limits
  const publishedTours = tours.filter(tour => !tour.isDraft)
  const publishedToursCount = publishedTours.length
  
  // Process tours in creation date order (oldest first)
  const sortedTours = [...tours].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  
  const disabledTours: TourData[] = []
  let currentPublishedCount = 0
  
  sortedTours.forEach(tour => {
    if (!tour.isDraft) {
      currentPublishedCount++
    }
    
    const { isAllowed, reason } = checkTourEligibility(
      tour,
      currentPlan,
      currentPublishedCount
    )
    
    if (!isAllowed) {
      disabledTours.push(tour)
    }
  })
  
  return {
    isAllowed: disabledTours.length === 0,
    disabledTours,
    reason: disabledTours.length > 0 ? 'limit_exceeded' : null
  }
}

/**
 * Returns the default free subscription plan
 */
export function getFreeSubscriptionPlan(): SubscriptionPlan {
  return {
    id: 'free',
    name: 'Free',
    type: 'free',
    price: 0,
    billingPeriod: 'monthly',
    limits: {
      maxTours: 3,
      maxScenesPerTour: 10,
      maxHotspotsPerScene: 5,
      videoSupport: false,
      customBranding: false,
      analytics: false,
      teamMembers: 1,
      apiAccess: false,
      prioritySupport: false
    },
    features: [
      '3 Virtual Tours',
      '10 Scenes per tour',
      '5 Hotspots per scene',
      'Basic analytics',
    ]
  }
}