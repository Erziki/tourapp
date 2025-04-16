// app/editor/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTours } from "@/contexts/ToursContext"
import VirtualTourEditor from "@/components/VirtualTourEditor"
import type { TourData } from "@/components/VirtualTourEditor"
// Add setupTheme import
import { setupTheme } from "@/components/theme-toggle"

export default function EditTourPage() {
  const params = useParams()
  const router = useRouter()
  const { tours } = useTours()
  const [tour, setTour] = useState<TourData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize theme
    setupTheme()
    
    try {
      console.log('Params ID:', params.id)
      console.log('Available tours:', tours)
      
      const foundTour = tours.find(t => t.id === params.id)
      console.log('Found tour:', foundTour)

      if (!foundTour) {
        setError('Tour not found')
        return
      }

      // Deep clone the tour data to avoid reference issues
      const clonedTour = JSON.parse(JSON.stringify(foundTour))
      setTour(clonedTour)
    } catch (err) {
      setError('Error loading tour data')
      console.error('Error in edit page:', err)
    }
  }, [params.id, tours])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-lg text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  if (!tour) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Loading tour...</div>
      </div>
    )
  }

  return <VirtualTourEditor initialTour={tour} />
}