// components/TourDebug.tsx
"use client"

import { useTours } from "@/contexts/ToursContext"

export function TourDebug() {
  const { tours } = useTours()

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-lg max-w-md max-h-96 overflow-auto">
        <pre className="text-xs">
          {JSON.stringify(tours, null, 2)}
        </pre>
      </div>
    )
  }

  return null
}