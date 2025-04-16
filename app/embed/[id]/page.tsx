"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import TourViewer from "@/components/TourViewer"
import type { TourData } from "@/components/VirtualTourEditor"
import { setupTheme } from "@/components/theme-toggle"
import { useEmbedAnalytics } from "@/contexts/EmbedAnalyticsProvider"

// Helper function to get user's location
async function getUserLocation() {
  try {
    console.log("Getting user location...");
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    console.log("Location retrieved:", data.country_name, data.city);
    return {
      country: data.country_name,
      city: data.city
    }
  } catch (error) {
    console.error('Error getting location:', error)
    return {
      country: 'Unknown',
      city: 'Unknown'
    }
  }
}

// Helper function to detect device type - browser-safe version
function getDeviceType() {
  if (typeof navigator === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet"
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile"
  }
  return "desktop"
}

// Helper to get referrer domain - browser-safe version
function getReferrerDomain() {
  if (typeof document === 'undefined') return 'direct';
  
  try {
    if (document.referrer) {
      const url = new URL(document.referrer)
      return url.hostname
    }
  } catch (error) {
    console.error('Error parsing referrer:', error)
  }
  return 'direct'
}

// Generate a simple visitor ID
function generateVisitorId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function EmbedTourPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { recordVisit } = useEmbedAnalytics()
  const [tour, setTour] = useState<TourData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tourOwnerId, setTourOwnerId] = useState<string | null>(null)
  
  // Use ref to track if visit has been recorded
  const visitRecorded = useRef(false)
  
  // Check if this is a preview (from the embed code generator)
  const skipAnalytics = searchParams.get('skip-analytics') === 'true'
  
  useEffect(() => {
    // Apply theme
    setupTheme()
    
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Store the tour ID
    const tourId = params.id as string
    console.log("Embed page loaded for tour:", tourId);
    
    if (skipAnalytics) {
      console.log("Skipping analytics for preview iframe");
    }
    
    // Fetch the tour
    const fetchTour = async () => {
      if (!tourId) {
        console.error("No tour ID provided");
        return;
      }
      
      try {
        setLoading(true)
        setError(null)
        
        console.log("Fetching tour data for ID:", tourId);

        // Fetch tour data
        const response = await fetch(`/api/tours/${tourId}?embed=true`)
        
        if (!response.ok) {
          throw new Error(`Failed to load tour: ${response.statusText}`)
        }

        const tourData = await response.json()
        
        if (!tourData) {
          throw new Error("Tour not found")
        }
        
        console.log("Tour data loaded successfully");
        setTour(tourData)

        // Extract owner ID from response headers if available
        const ownerIdHeader = response.headers.get('X-Tour-Owner-Id');
        if (ownerIdHeader) {
          setTourOwnerId(ownerIdHeader);
          console.log("Tour owner ID from headers:", ownerIdHeader);
        }

        // Record the visit only if:
        // 1. We haven't already recorded it
        // 2. This is not a preview (skip-analytics is not true)
        if (!visitRecorded.current && !skipAnalytics) {
          console.log("Preparing to record embed visit...");
          
          // Generate a visitor ID 
          const visitorId = generateVisitorId();
          console.log("Generated visitor ID:", visitorId);
          
          // Get location data
          const location = await getUserLocation()
          
          // Get device type
          const device = getDeviceType();
          console.log("Detected device type:", device);
          
          // Get referrer
          const referrer = getReferrerDomain();
          console.log("Detected referrer:", referrer);
          
          // Create timestamp
          const timestamp = new Date().toISOString();
          console.log("Visit timestamp:", timestamp);
          
          // Mark visit as recorded BEFORE async call to prevent race conditions
          visitRecorded.current = true
          
          console.log("Recording embed visit with data:", {
            tourId,
            timestamp,
            country: location.country,
            city: location.city,
            device,
            isEmbed: true,
            referrer,
            visitorId,
            ...(ownerIdHeader ? { ownerId: ownerIdHeader } : {})
          });
          
          try {
            // Record the visit through the context provider
            await recordVisit({
              tourId,
              timestamp,
              country: location.country,
              city: location.city,
              device,
              isEmbed: true,
              referrer,
              visitorId,
              ...(ownerIdHeader ? { ownerId: ownerIdHeader } : {})
            });
            
            console.log("Visit recorded successfully!");
          } catch (apiError) {
            console.error("Error recording visit:", apiError);
          }
        } else if (skipAnalytics) {
          console.log("Not recording visit - this is a preview");
        } else {
          console.log("Visit already recorded for this session");
        }
      } catch (error) {
        console.error("Error loading embedded tour:", error)
        setError(error instanceof Error ? error.message : "Failed to load tour")
      } finally {
        setLoading(false)
      }
    }

    // Execute the fetch function
    fetchTour()
    
  }, [params.id, recordVisit, skipAnalytics])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-white text-lg">Loading tour...</div>
      </div>
    )
  }

  if (error || !tour) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
        <div className="text-xl mb-4">Error Loading Tour</div>
        <div className="text-gray-300">{error || "Tour not found"}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black">
      <TourViewer tour={tour} isEmbedded={true} />
    </div>
  )
}