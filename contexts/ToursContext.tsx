"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { TourData } from "@/components/VirtualTourEditor"
import { useAuth } from "@/contexts/AuthContext"
// Remove the problematic import
// import { useSubscription } from "@/contexts/SubscriptionContext"
import { 
  uploadTourToS3, 
  listUserToursFromS3, 
  deleteTourFromS3,
  tourExistsInS3
} from "@/lib/aws/s3-utils"
import { validateTour } from "@/utils/validation"
import { toast } from "sonner"

interface ToursContextType {
  tours: TourData[]
  addTour: (tour: TourData) => Promise<void>
  updateTour: (id: string, tourData: TourData) => Promise<void>
  deleteTour: (id: string) => Promise<void>
  isLoading: boolean
  error: string | null
  refreshTours: () => Promise<void>
  isTourDisabled: (tourId: string) => boolean
  getDisabledReason: () => 'plan_downgraded' | 'limit_exceeded' | 'payment_failed' | null
}

const ToursContext = createContext<ToursContextType | undefined>(undefined)

export function ToursProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  // Remove direct subscription context usage
  // const { 
  //   getCurrentPlan, 
  //   currentSubscription,
  //   getRemainingQuota 
  // } = useSubscription()
  
  const [tours, setTours] = useState<TourData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [disabledTours, setDisabledTours] = useState<string[]>([])
  const [disabledReason, setDisabledReason] = useState<
    'plan_downgraded' | 'limit_exceeded' | 'payment_failed' | null
  >(null)

  // Load tours from S3 when authenticated
  const loadToursFromS3 = async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use user's sub from Cognito as the user ID
      const userId = user.attributes.sub || ''
      
      if (!userId) {
        throw new Error("User ID not available")
      }

      const userTours = await listUserToursFromS3(userId)
      console.log(`Loaded ${userTours.length} tours from S3`)
      
      // Validate each tour to ensure consistent structure
      const validatedTours = userTours.map(tour => validateTour(tour))
      setTours(validatedTours)
    } catch (err) {
      console.error("Error loading tours from S3:", err)
      setError("Failed to load your tours. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  // Load tours when user authenticates
  useEffect(() => {
    loadToursFromS3()
  }, [isAuthenticated, user])

  // Modified to accept parameters for subscription enforcement rather than using context
  const enforceSubscriptionLimits = (
    currentPlan: any,
    subscriptionStatus: string
  ) => {
    // Check nothing if there's no plan data
    if (!currentPlan) {
      return { disabledTours: [], reason: null }
    }
    
    // If the subscription is not active, mark all tours as disabled
    if (subscriptionStatus !== 'active') {
      return { 
        disabledTours: tours, 
        reason: 'payment_failed' as const 
      }
    }
    
    // For active subscriptions, check tour limits
    const maxTours = currentPlan.limits?.maxTours || 0

    // If user has more tours than allowed by their plan
    if (tours.length > maxTours) {
      // Disable the excess tours (keep the newest ones enabled)
      const sortedTours = [...tours].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      
      // Keep only the allowed number of tours enabled
      const toursToDisable = sortedTours.slice(maxTours)
      return { 
        disabledTours: toursToDisable, 
        reason: 'limit_exceeded' as const 
      }
    }
    
    return { disabledTours: [], reason: null }
  }

  // Function to update subscription enforcement from outside
  // This can be called from Dashboard to apply limits
  const updateSubscriptionEnforcement = (
    currentPlan: any, 
    subscriptionStatus: string
  ) => {
    if (!currentPlan) return
    
    const { disabledTours: toursToDisable, reason } = enforceSubscriptionLimits(
      currentPlan,
      subscriptionStatus
    )
    
    if (toursToDisable.length > 0) {
      // Store the IDs of tours that should be disabled
      setDisabledTours(toursToDisable.map(tour => tour.id))
      setDisabledReason(reason)
      
      // Mark these tours as draft in storage to prevent them from being embedded
      toursToDisable.forEach(tour => {
        if (!tour.isDraft) {
          updateTour(tour.id, { ...tour, isDraft: true })
        }
      })
    } else {
      setDisabledTours([])
      setDisabledReason(null)
    }
  }

  // Function to check if a tour is disabled due to subscription limits
  const isTourDisabled = useCallback((tourId: string): boolean => {
    return disabledTours.includes(tourId)
  }, [disabledTours])

  // Function to get the reason a tour is disabled
  const getDisabledReason = useCallback((): 'plan_downgraded' | 'limit_exceeded' | 'payment_failed' | null => {
    return disabledReason
  }, [disabledReason])

  const addTour = async (tour: TourData) => {
    if (!isAuthenticated || !user?.attributes.sub) {
      toast.error("You must be logged in to save tours")
      return
    }

    // We'll check subscription limits in the component instead
    // Removed subscription check code

    setIsLoading(true)
    setError(null)

    try {
      const userId = user.attributes.sub
      
      // Validate tour before saving
      const validatedTour = validateTour(tour)
      console.log(`Adding tour with ${validatedTour.scenes.length} scenes`)
      
      // Upload to S3
      await uploadTourToS3(userId, validatedTour)
      
      // Update local state
      setTours(prevTours => [...prevTours, validatedTour])
      
      toast.success("Tour saved successfully")
    } catch (err) {
      console.error("Error adding tour:", err)
      setError("Failed to save tour. Please try again.")
      toast.error("Failed to save tour. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateTour = async (id: string, tourData: TourData) => {
    if (!isAuthenticated || !user?.attributes.sub) {
      toast.error("You must be logged in to update tours")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userId = user.attributes.sub
      
      // Validate tour before saving
      const validatedTour = validateTour(tourData)
      console.log(`Updating tour with ${validatedTour.scenes.length} scenes`)
      
      // Check if the tour exists
      const exists = tours.some(tour => tour.id === id)
      
      // Update local state
      if (!exists) {
        setTours(prevTours => [...prevTours, validatedTour])
      } else {
        setTours(prevTours => 
          prevTours.map(tour => tour.id === id ? validatedTour : tour)
        )
      }
      
      // Upload to S3
      await uploadTourToS3(userId, validatedTour)
      toast.success("Tour updated successfully")
    } catch (err) {
      console.error("Error updating tour:", err)
      setError("Failed to update tour. Please try again.")
      toast.error("Failed to update tour. Please check your connection and try again.")
      
      // Refresh tours to ensure local state matches S3
      await loadToursFromS3()
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTour = async (id: string) => {
    if (!isAuthenticated || !user?.attributes.sub) {
      toast.error("You must be logged in to delete tours")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userId = user.attributes.sub
      console.log(`Deleting tour with ID: ${id} for user: ${userId}`)
      
      // Delete from S3 first - this will throw an error if deletion fails
      await deleteTourFromS3(userId, id)
      
      // Verify the tour was deleted
      const exists = await tourExistsInS3(userId, id)
      if (exists) {
        throw new Error(`Failed to delete tour: Tour still exists in S3 after deletion`)
      }
      
      // Only update local state after successful S3 deletion
      setTours(prevTours => prevTours.filter(tour => tour.id !== id))
      
      // Remove from disabled tours list if present
      if (disabledTours.includes(id)) {
        setDisabledTours(prevDisabled => prevDisabled.filter(tourId => tourId !== id))
      }
      
      toast.success("Tour deleted successfully")
    } catch (err) {
      console.error("Error deleting tour:", err)
      setError("Failed to delete tour. Please try again.")
      toast.error("Failed to delete tour. Please check your connection and try again.")
      
      // Refresh tours to ensure local state matches S3
      await loadToursFromS3()
    } finally {
      setIsLoading(false)
    }
  }

  // Function to manually refresh tours
  const refreshTours = async () => {
    await loadToursFromS3()
  }

  return (
    <ToursContext.Provider value={{ 
      tours, 
      addTour, 
      updateTour, 
      deleteTour,
      isLoading,
      error,
      refreshTours,
      isTourDisabled,
      getDisabledReason
    }}>
      {children}
    </ToursContext.Provider>
  )
}

export function useTours() {
  const context = useContext(ToursContext)
  if (context === undefined) {
    throw new Error('useTours must be used within a ToursProvider')
  }
  return context
}