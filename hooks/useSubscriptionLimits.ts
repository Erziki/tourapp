// hooks/useSubscriptionLimits.ts
"use client"

import { useSubscription } from "@/contexts/SubscriptionContext"
import { useTours } from "@/contexts/ToursContext"
import { SceneData, HotspotData } from "@/components/VirtualTourEditor"

interface SubscriptionLimitsReturn {
  canCreateNewTour: boolean;
  canAddScene: (tourId: string) => boolean;
  canAddHotspot: (tourId: string, sceneId: number) => boolean;
  canUseVideoScene: boolean;
  isAtTourLimit: boolean;
  reachedTourLimit: () => boolean;
  reachedSceneLimit: (tourId: string) => boolean;
  reachedHotspotLimit: (tourId: string, sceneId: number) => boolean;
  getMaxScenesAllowed: () => number;
  getMaxHotspotsAllowed: () => number;
  getScenesRemaining: (tourId: string) => number;
  getHotspotsRemaining: (tourId: string, sceneId: number) => number;
  getToursRemaining: () => number;
}

export function useSubscriptionLimits(): SubscriptionLimitsReturn {
  // Get all necessary functions from subscription context
  const { 
    getCurrentPlan, 
    getMaxScenesForCurrentPlan, 
    getMaxHotspotsForCurrentPlan,
    getRemainingQuota,
    isPlanFeatureAvailable
  } = useSubscription()
  
  // Get tours in a try-catch to prevent errors if called outside ToursProvider
  let tours: any[] = []
  try {
    const { tours: toursList } = useTours()
    tours = toursList
  } catch (error) {
    console.warn('useSubscriptionLimits: useTours not available, using empty tours array')
  }

  const getToursRemaining = (): number => {
    const { remainingTours } = getRemainingQuota(tours.length)
    return remainingTours
  }

  const reachedTourLimit = (): boolean => {
    const { tourLimitReached } = getRemainingQuota(tours.length)
    return tourLimitReached
  }

  const canCreateNewTour = (): boolean => {
    return !reachedTourLimit()
  }

  const getTourById = (tourId: string) => {
    return tours.find(tour => tour.id === tourId)
  }

  const reachedSceneLimit = (tourId: string): boolean => {
    const tour = getTourById(tourId)
    if (!tour) return false

    const maxScenes = getMaxScenesForCurrentPlan()
    return tour.scenes.length >= maxScenes
  }

  const canAddScene = (tourId: string): boolean => {
    return !reachedSceneLimit(tourId)
  }

  const getSceneById = (tourId: string, sceneId: number) => {
    const tour = getTourById(tourId)
    if (!tour) return null
    return tour.scenes.find(scene => scene.id === sceneId)
  }

  const reachedHotspotLimit = (tourId: string, sceneId: number): boolean => {
    const scene = getSceneById(tourId, sceneId)
    if (!scene) return false

    const maxHotspots = getMaxHotspotsForCurrentPlan()
    return scene.hotspots.length >= maxHotspots
  }

  const canAddHotspot = (tourId: string, sceneId: number): boolean => {
    return !reachedHotspotLimit(tourId, sceneId)
  }

  const canUseVideoScene = (): boolean => {
    return isPlanFeatureAvailable('videoSupport')
  }

  const getMaxScenesAllowed = (): number => {
    return getMaxScenesForCurrentPlan()
  }

  const getMaxHotspotsAllowed = (): number => {
    return getMaxHotspotsForCurrentPlan()
  }

  const getScenesRemaining = (tourId: string): number => {
    const tour = getTourById(tourId)
    if (!tour) return getMaxScenesForCurrentPlan()

    const maxScenes = getMaxScenesForCurrentPlan()
    return Math.max(0, maxScenes - tour.scenes.length)
  }

  const getHotspotsRemaining = (tourId: string, sceneId: number): number => {
    const scene = getSceneById(tourId, sceneId)
    if (!scene) return getMaxHotspotsForCurrentPlan()

    const maxHotspots = getMaxHotspotsForCurrentPlan()
    return Math.max(0, maxHotspots - scene.hotspots.length)
  }

  return {
    canCreateNewTour,
    canAddScene,
    canAddHotspot,
    canUseVideoScene,
    isAtTourLimit: reachedTourLimit(),
    reachedTourLimit,
    reachedSceneLimit,
    reachedHotspotLimit,
    getMaxScenesAllowed,
    getMaxHotspotsAllowed,
    getScenesRemaining,
    getHotspotsRemaining,
    getToursRemaining
  }
}