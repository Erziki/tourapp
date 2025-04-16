// components/EditModeTooltip.tsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info } from 'lucide-react'

interface EditModeTooltipProps {
  isEditing: boolean
}

export default function EditModeTooltip({ isEditing }: EditModeTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Show the tooltip when entering edit mode
    if (isEditing && !isDismissed) {
      // Small delay to ensure the mode has switched first
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 500)
      
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isEditing, isDismissed])

  // Check if the tooltip has been dismissed before
  useEffect(() => {
    const hasBeenDismissed = localStorage.getItem('editModeTooltipDismissed') === 'true'
    setIsDismissed(hasBeenDismissed)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('editModeTooltipDismissed', 'true')
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
            <button 
              onClick={handleDismiss}
              className="absolute top-2 right-2 text-white/80 hover:text-white"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Edit Mode Tips</h3>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Click on a hotspot to see edit options</li>
                  <li>Select "Move" to start positioning a hotspot</li>
                  <li>Drag and drop to position precisely</li>
                  <li>Click anywhere on the panorama to add a new hotspot</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}