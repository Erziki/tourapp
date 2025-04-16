"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle } from "lucide-react"

interface SubscriptionLimitDialogProps {
  isOpen: boolean
  onClose: () => void
  limitType: 'tour' | 'scene' | 'hotspot' | 'video'
  currentPlanName: string
  upgradePlanName?: string
  onUpgradeClick: () => void
}

export default function SubscriptionLimitDialog({
  isOpen,
  onClose,
  limitType,
  currentPlanName,
  upgradePlanName = 'Professional',
  onUpgradeClick
}: SubscriptionLimitDialogProps) {
  const getLimitMessage = () => {
    switch (limitType) {
      case 'tour':
        return `You've reached the maximum number of tours allowed in your ${currentPlanName} plan.`
      case 'scene':
        return `You've reached the maximum number of scenes allowed per tour in your ${currentPlanName} plan.`
      case 'hotspot':
        return `You've reached the maximum number of hotspots allowed per scene in your ${currentPlanName} plan.`
      case 'video':
        return `Video tours are only available in ${upgradePlanName} and higher plans.`
      default:
        return `You've reached a subscription limit in your ${currentPlanName} plan.`
    }
  }

  const getActionText = () => {
    switch (limitType) {
      case 'tour':
        return 'Create more tours'
      case 'scene':
        return 'Add more scenes per tour'
      case 'hotspot':
        return 'Add more hotspots per scene'
      case 'video':
        return 'Enable video tours'
      default:
        return 'Unlock more features'
    }
  }

  const handleUpgrade = () => {
    onUpgradeClick()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
            Subscription limit reached
          </DialogTitle>
          <DialogDescription>
            {getLimitMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Upgrade to {upgradePlanName} plan
            </h3>
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              {getActionText()} with our {upgradePlanName} plan and unlock additional premium features.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpgrade}
            className="bg-blue-600 hover:bg-blue-700"
          >
            View Upgrade Options
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}