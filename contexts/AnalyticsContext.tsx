// contexts/AnalyticsContext.tsx
"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface VisitData {
  tourId: string
  timestamp: string
  country: string
  city: string
  device: string
  isEmbed?: boolean
  referrer?: string
}

interface TourAnalytics {
  tourId: string
  totalVisits: number
  uniqueVisitors: number
  visitsPerCountry: Record<string, number>
  visitsPerDay: Record<string, number>
  devicesUsed: Record<string, number>
  embedVisits: number
  embedsPerDomain: Record<string, number>
  embedsActive: boolean
}

interface AnalyticsContextType {
  analytics: Record<string, TourAnalytics>
  addVisit: (visit: VisitData) => Promise<void>
  getTourAnalytics: (tourId: string) => TourAnalytics | null
  refreshAnalytics: (tourId: string) => Promise<void>
  refreshAllAnalytics: () => Promise<void>
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [analytics, setAnalytics] = useState<Record<string, TourAnalytics>>({})

  // Function to add a visit - will only record if it's an embed visit
  const addVisit = useCallback(async (visit: VisitData) => {
    // Only track visits from embeds
    if (!visit.isEmbed) {
      console.log('Skipping non-embed visit')
      return
    }

    if (!isAuthenticated || !user?.attributes.sub) {
      console.warn('Cannot add visit: No authenticated user')
      return
    }

    try {
      // Send the visit data to our API with the user ID
      const response = await fetch('/api/analytics/visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...visit,
          isEmbed: true, // Ensure this is set
          ownerId: user.attributes.sub // Include the owner ID
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to record visit: ${response.statusText}`)
      }

      // Refresh the analytics for this tour to reflect the new visit
      await refreshAnalytics(visit.tourId)
    } catch (error) {
      console.error('Error adding visit:', error)
    }
  }, [isAuthenticated, user])

  // Function to refresh analytics for a specific tour
  const refreshAnalytics = useCallback(async (tourId: string) => {
    if (!isAuthenticated || !user?.attributes.sub) {
      console.warn('Cannot refresh analytics: No authenticated user')
      return
    }

    try {
      // Include user ID as query param (optional - the backend can also look it up)
      const response = await fetch(`/api/analytics/${tourId}?userId=${user.attributes.sub}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }
      
      const tourAnalytics = await response.json()
      
      setAnalytics(prev => ({
        ...prev,
        [tourId]: tourAnalytics
      }))
    } catch (error) {
      console.error(`Error refreshing analytics for tour ${tourId}:`, error)
    }
  }, [isAuthenticated, user])

  // Function to refresh analytics for all tours owned by the user
  const refreshAllAnalytics = useCallback(async () => {
    if (!isAuthenticated || !user?.attributes.sub) {
      console.warn('Cannot refresh all analytics: No authenticated user')
      return
    }

    try {
      const response = await fetch(`/api/analytics?userId=${user.attributes.sub}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch all analytics: ${response.statusText}`)
      }
      
      const allAnalytics = await response.json()
      
      setAnalytics(allAnalytics)
    } catch (error) {
      console.error('Error refreshing all analytics:', error)
    }
  }, [isAuthenticated, user])

  // Load all analytics when the component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.attributes.sub) {
      refreshAllAnalytics()
    }
  }, [isAuthenticated, user, refreshAllAnalytics])

  // Get analytics for a specific tour
  const getTourAnalytics = useCallback((tourId: string) => {
    return analytics[tourId] || null
  }, [analytics])

  return (
    <AnalyticsContext.Provider value={{ 
      analytics, 
      addVisit, 
      getTourAnalytics, 
      refreshAnalytics,
      refreshAllAnalytics
    }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}