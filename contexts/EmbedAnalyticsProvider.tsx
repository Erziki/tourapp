"use client"

import React, { createContext, useContext, useCallback } from 'react'

interface VisitData {
  tourId: string
  timestamp: string
  country: string
  city: string
  device: string
  isEmbed?: boolean
  referrer?: string
  visitorId?: string  // Added to help with deduplication
  ownerId?: string    // Added to store the tour owner ID
}

interface EmbedAnalyticsContextType {
  recordVisit: (visit: VisitData) => Promise<void>
}

const EmbedAnalyticsContext = createContext<EmbedAnalyticsContextType | undefined>(undefined)

// Set of recorded visitor IDs to prevent duplicate visits
const recordedVisits = new Set<string>()

export function EmbedAnalyticsProvider({ children }: { children: React.ReactNode }) {
  // This function records an embed visit with deduplication
  const recordVisit = useCallback(async (visit: VisitData): Promise<void> => {
    try {
      console.log("EmbedAnalyticsProvider: Recording visit for tour:", visit.tourId);
      
      // Create a unique key for this visit to prevent duplicates
      const visitKey = `${visit.visitorId || 'unknown'}-${visit.tourId}-${visit.timestamp.split('T')[0]}`
      
      // Skip if we already recorded this visit in this session
      if (recordedVisits.has(visitKey)) {
        console.log('EmbedAnalyticsProvider: Skipping duplicate visit:', visitKey)
        return
      }
      
      // Add to our set of recorded visits
      recordedVisits.add(visitKey)
      
      // Ensure isEmbed is set to true
      const visitData = {
        ...visit,
        isEmbed: true // Always set this flag for embed visits
      }
      
      // Log the visit data we're about to send (for debugging)
      console.log('EmbedAnalyticsProvider: Sending embed visit data:', {
        tourId: visitData.tourId,
        timestamp: visitData.timestamp,
        country: visitData.country,
        device: visitData.device,
        isEmbed: visitData.isEmbed,
        visitorId: visitData.visitorId?.substring(0, 8) || 'unknown', // Partial ID for privacy
        ownerId: visitData.ownerId || '(to be determined by API)'
      })
      
      // Send to API with deduplication parameter
      const response = await fetch('/api/analytics/visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitData),
      })
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to record visit (${response.status}): ${errorText}`)
      }
      
      const responseData = await response.json();
      console.log('EmbedAnalyticsProvider: API response:', responseData)
      
      console.log('EmbedAnalyticsProvider: Embed visit recorded successfully')
    } catch (error) {
      console.error('EmbedAnalyticsProvider: Failed to record embed visit:', error)
    }
  }, [])

  return (
    <EmbedAnalyticsContext.Provider value={{ recordVisit }}>
      {children}
    </EmbedAnalyticsContext.Provider>
  )
}

export function useEmbedAnalytics() {
  const context = useContext(EmbedAnalyticsContext)
  if (context === undefined) {
    throw new Error('useEmbedAnalytics must be used within an EmbedAnalyticsProvider')
  }
  return context
}