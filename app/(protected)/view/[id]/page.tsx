// app/view/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTours } from "@/contexts/ToursContext"
import type { TourData } from "@/components/VirtualTourEditor"
import TourViewer from "@/components/TourViewer"

export default function ViewTourPage() {
  const params = useParams()
  const router = useRouter()
  const { tours } = useTours()
  const [tour, setTour] = useState<TourData | null>(null)

  useEffect(() => {
    const foundTour = tours.find(t => t.id === params.id)
    if (!foundTour) {
      router.push('/')
      return
    }
    setTour(foundTour)
    
    // Note: We no longer track analytics for regular view page visits
    // Only embed visits are tracked
  }, [params.id, tours, router])

  if (!tour) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-lg text-gray-500">Loading tour...</div>
      </div>
    )
  }

  return <TourViewer tour={tour} />
}