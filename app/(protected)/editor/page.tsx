// app/editor/page.tsx
"use client"

import { useEffect, useState } from "react"
import VirtualTourEditor from "@/components/VirtualTourEditor"
import type { TourData } from "@/components/VirtualTourEditor"
import { setupTheme } from "@/components/theme-toggle"
import { useRouter } from "next/navigation"

export default function EditorPage() {
  const [initialTour, setInitialTour] = useState<TourData | undefined>(undefined)
  const router = useRouter()

  useEffect(() => {
    // Use setupTheme
    setupTheme()
    
    // Check for template data in localStorage
    const templateData = localStorage.getItem('newTourTemplate')
    
    if (templateData) {
      try {
        const template = JSON.parse(templateData)
        setInitialTour(template)
        // Clear the template data after loading
        localStorage.removeItem('newTourTemplate')
      } catch (error) {
        console.error("Error parsing tour template:", error)
        // If there's an error, create a default template
        createDefaultTemplate()
      }
    } else {
      // No template found, create a default one
      createDefaultTemplate()
    }
  }, [])

  const createDefaultTemplate = () => {
    // Create a default tour template
    const defaultTemplate: TourData = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Tour",
      description: "",
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDraft: true,
      type: 'image' // Default to image type
    }
    
    setInitialTour(defaultTemplate)
  }

  return <VirtualTourEditor initialTour={initialTour} />
}