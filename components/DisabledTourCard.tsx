// components/DisabledTourCard.tsx
"use client"

import { TourData } from "@/components/VirtualTourEditor"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Lock, CreditCard } from "lucide-react"

interface DisabledTourCardProps {
  tour: TourData
  reason: 'plan_downgraded' | 'limit_exceeded' | 'payment_failed'
  onUpgradeClick?: () => void
}

export default function DisabledTourCard({ tour, reason, onUpgradeClick }: DisabledTourCardProps) {
  const getReasonMessage = () => {
    switch (reason) {
      case 'plan_downgraded':
        return 'This tour is disabled because your subscription was downgraded.'
      case 'limit_exceeded':
        return 'This tour exceeds the limits of your current subscription plan.'
      case 'payment_failed':
        return 'This tour is disabled due to a payment issue with your subscription.'
      default:
        return 'This tour is currently disabled.'
    }
  }

  return (
    <Card className="bg-gray-50 dark:bg-gray-800 overflow-hidden shadow-sm opacity-80 relative">
      {/* Tour Preview with overlay */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
        {tour.thumbnail ? (
          <img
            src={tour.thumbnail}
            alt={tour.name}
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 dark:text-gray-500">No preview available</div>
          </div>
        )}
        
        {/* Overlay with lock icon */}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
          <Lock className="h-12 w-12 text-white mb-3" />
          <h3 className="text-white font-bold text-lg mb-1">{tour.name}</h3>
          <p className="text-white/90 text-center mb-3">{getReasonMessage()}</p>
          <Badge variant="outline" className="bg-red-500/20 text-white border-red-400">
            {reason === 'plan_downgraded' ? 'Subscription Required' : 
             reason === 'limit_exceeded' ? 'Limit Exceeded' : 'Payment Issue'}
          </Badge>
        </div>
      </div>
      
      <div className="p-4 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tour.scenes.length} scenes · {tour.isDraft ? 'Draft' : 'Published'}
          </p>
        </div>
        
        <Button
          onClick={onUpgradeClick}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Upgrade Plan
        </Button>
      </div>
    </Card>
  )
}