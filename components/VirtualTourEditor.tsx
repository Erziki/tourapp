// components/VirtualTourEditor.tsx
"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import HotspotEditor from "@/components/HotspotEditor"
import SceneManager from "@/components/SceneManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ErrorBoundary from "@/components/ErrorBoundary"
import UnsavedChangesDialog from "./UnsavedChangesDialog"
import DragIndicator from "@/components/DragIndicator"
import EditModeTooltip from "@/components/EditModeTooltip"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { 
  GripVertical, 
  Expand, 
  Minimize, 
  Save, 
  Image, 
  Map, 
  Settings, 
  Plus,
  Upload,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  AlertTriangle,
  Info,
  AlertCircle
} from "lucide-react"
import { useTours } from "@/contexts/ToursContext"

// Add these imports for subscription features
import { useSubscription } from "@/contexts/SubscriptionContext"
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits"
import SubscriptionLimitDialog from "@/components/SubscriptionLimitDialog"
import { InfoCircle } from "@/components/icons/InfoCircle"

// Declare global interface for hotspot dragging
declare global {
  interface Window {
    isDraggingAnyHotspot?: boolean;
  }
}

// Lazy load the PanoramaContainer
const PanoramaContainer = dynamic(() => import("@/components/PanoramaContainer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-lg">Loading viewer...</div>
    </div>
  ),
})

export interface HotspotData {
  id: number
  name: string
  position: { x: number; y: number; z: number }
  type: "text" | "image" | "video" | "audio" | "pdf" | "scene" | "tts" | "voice"
  content?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  audioTitle?: string
  pdfUrl?: string
  pdfTitle?: string
  targetSceneId?: number
  icon: string
  style?: {
    color?: string
    size?: number
  }
  ttsText?: string
  ttsLanguage?: string
  ttsVoiceGender?: "male" | "female"
  voiceRecording?: Blob
}

export interface SceneData {
  id: number
  name: string
  type: 'image' | 'video'
  imageUrl?: string
  videoUrl?: string
  hotspots: HotspotData[]
  order?: number
}

export interface TourData {
  id: string
  name: string
  description: string
  scenes: SceneData[]
  createdAt: string
  updatedAt: string
  isDraft: boolean
  thumbnail?: string
  type?: 'image' | 'video'
}

interface VirtualTourEditorProps {
  initialTour?: TourData
}


export default function VirtualTourEditor({ initialTour }: VirtualTourEditorProps) {
  const router = useRouter()
  const { addTour, updateTour } = useTours()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tourName, setTourName] = useState(initialTour?.name || "Untitled Tour")
  const [tourDescription, setTourDescription] = useState(initialTour?.description || "")
  const [tourThumbnail, setTourThumbnail] = useState<string | undefined>(initialTour?.thumbnail)
  const [scenes, setScenes] = useState<SceneData[]>(initialTour?.scenes || [])
  const [currentSceneId, setCurrentSceneId] = useState<number | null>(
    initialTour?.scenes[0]?.id || null
  )
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'scenes' | 'hotspots' | 'settings'>('scenes')
  const [showViewModeNotification, setShowViewModeNotification] = useState(true)
  
  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  
  // Hotspot dragging state
  const [isDraggingHotspot, setIsDraggingHotspot] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  
  // Hotspot selection state
  const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(null)
  
  // Track open quick actions for hotspots
  const [openQuickActionHotspotId, setOpenQuickActionHotspotId] = useState<number | null>(null)

  // Track open accordion items for the hotspot list
  const [openAccordionItem, setOpenAccordionItem] = useState<string | null>(null)
  
  // Subscription limit dialog state
  const [showSubscriptionLimitDialog, setShowSubscriptionLimitDialog] = useState(false)
  const [subscriptionLimitType, setSubscriptionLimitType] = useState<'tour' | 'scene' | 'hotspot' | 'video'>('tour')
  const { getCurrentPlan } = useSubscription()
  const { 
    canAddScene, 
    canAddHotspot, 
    canUseVideoScene, 
    getMaxScenesAllowed,
    getMaxHotspotsAllowed
  } = useSubscriptionLimits()
  
  const sceneIdCounter = useRef(
    Math.max(0, ...scenes.map(scene => scene.id), 0) + 1
  )
  const panoramaContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Fullscreen functionality
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Define currentScene using useMemo
  const currentScene = useMemo(
    () => scenes.find((scene) => scene.id === currentSceneId),
    [scenes, currentSceneId]
  )

  // Reset dragging state when scene or hotspot selection changes
  useEffect(() => {
    // Reset dragging state whenever hotspot selection changes or scene changes
    setIsDraggingHotspot(false);
    
    // Reset global flag
    if (typeof window !== 'undefined') {
      window.isDraggingAnyHotspot = false;
    }
    
    // Also dispatch the event to ensure any listeners are notified
    window.dispatchEvent(new CustomEvent('hotspot-drag-end'));
  }, [selectedHotspotId, currentSceneId]);

  // Handler for selecting a hotspot from the panorama view
  const handleSelectHotspot = useCallback((hotspotId: number) => {
    // Close any previously selected hotspot
    setSelectedHotspotId(null);
    
    // Close any open quick actions
    setOpenQuickActionHotspotId(null);
    
    // Small delay to ensure state updates before selecting the new hotspot
    setTimeout(() => {
      setSelectedHotspotId(hotspotId);
      // Switch to the hotspots tab
      setActiveTab('hotspots');
      // Open the accordion for this hotspot
      setOpenAccordionItem(`hotspot-${hotspotId}`);
    }, 10);
  }, []);

  // Scroll selected hotspot into view
  useEffect(() => {
    if (selectedHotspotId && activeTab === 'hotspots') {
      // Set the open accordion item
      setOpenAccordionItem(`hotspot-${selectedHotspotId}`);
      
      // Give DOM time to update
      setTimeout(() => {
        try {
          const accordionItem = document.querySelector(`[data-hotspot-id="${selectedHotspotId}"]`);
          if (accordionItem) {
            accordionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch (err) {
          console.error("Error scrolling to hotspot:", err);
        }
      }, 150);
    }
  }, [selectedHotspotId, activeTab]);

  // Clear selected hotspot when changing scenes
  useEffect(() => {
    setSelectedHotspotId(null);
    setOpenQuickActionHotspotId(null);
    setOpenAccordionItem(null);
  }, [currentSceneId]);

  const toggleFullscreen = useCallback(() => {
    if (panoramaContainerRef.current) {
      if (!document.fullscreenElement) {
        // Store the current layout state
        document.body.classList.add('is-entering-fullscreen');
        
        // Request fullscreen on the panorama container
        panoramaContainerRef.current.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
          document.body.classList.remove('is-entering-fullscreen');
        });
        setIsFullscreen(true);
      } else {
        // Add a class to handle the transition
        document.body.classList.add('is-exiting-fullscreen');
        
        // Exit fullscreen
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, [])

  // Set up event listeners for hotspot dragging
  useEffect(() => {
    const handleDragStart = () => {
      setIsDraggingHotspot(true)
    }
    
    const handleDragEnd = () => {
      setIsDraggingHotspot(false)
    }
    
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingHotspot) {
        // Only update drag position if it's within the panorama container
        const panoramaContainer = document.querySelector('.panorama-container');
        if (panoramaContainer) {
          const containerRect = panoramaContainer.getBoundingClientRect();
          if (
            e.clientX >= containerRect.left && 
            e.clientX <= containerRect.right && 
            e.clientY >= containerRect.top && 
            e.clientY <= containerRect.bottom
          ) {
            setDragPosition({ x: e.clientX, y: e.clientY })
          }
        }
      }
    }
    
    window.addEventListener('hotspot-drag-start', handleDragStart)
    window.addEventListener('hotspot-drag-end', handleDragEnd)
    document.addEventListener('pointermove', handlePointerMove)
    
    return () => {
      window.removeEventListener('hotspot-drag-start', handleDragStart)
      window.removeEventListener('hotspot-drag-end', handleDragEnd)
      document.removeEventListener('pointermove', handlePointerMove)
    }
  }, [isDraggingHotspot])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (isCurrentlyFullscreen) {
        // We've entered fullscreen
        document.body.classList.remove('is-entering-fullscreen');
        document.body.classList.add('is-fullscreen');
      } else {
        // We've exited fullscreen
        document.body.classList.remove('is-fullscreen');
        document.body.classList.remove('is-exiting-fullscreen');
        
        // Force layout recalculation
        if (containerRef.current && mainContentRef.current) {
          // Apply a small timeout to ensure the browser has finished its own layout adjustments
          setTimeout(() => {
            // Force flex layout recalculation
            mainContentRef.current.style.display = 'none';
            void mainContentRef.current.offsetHeight; // Force reflow
            mainContentRef.current.style.display = 'flex';
            
            // Reset any dimensions on the panorama container
            if (panoramaContainerRef.current) {
              panoramaContainerRef.current.style.width = '';
              panoramaContainerRef.current.style.height = '';
            }
            
            // Also reset the main container
            containerRef.current.style.width = '';
            containerRef.current.style.height = '';
          }, 150);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [])

  // Additional resize handler to ensure proper layout after any window resize
  useEffect(() => {
    const handleResize = () => {
      // Skip if we're in fullscreen mode
      if (document.fullscreenElement) return;
      
      // Reset layout on window resize
      if (mainContentRef.current && containerRef.current) {
        // Reset any explicit dimensions
        mainContentRef.current.style.width = '';
        mainContentRef.current.style.height = '';
        containerRef.current.style.width = '';
        containerRef.current.style.height = '';
        
        if (panoramaContainerRef.current) {
          panoramaContainerRef.current.style.width = '';
          panoramaContainerRef.current.style.height = '';
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (initialTour) {
      // Check if there are changes compared to the initial tour
      const initialTourJSON = JSON.stringify(initialTour)
      const currentTourJSON = JSON.stringify({
        id: initialTour.id,
        name: tourName,
        description: tourDescription,
        scenes: scenes,
        createdAt: initialTour.createdAt,
        updatedAt: initialTour.updatedAt,
        isDraft: initialTour.isDraft,
        thumbnail: tourThumbnail,
        type: scenes[0]?.type || initialTour.type
      })
      
      setHasUnsavedChanges(initialTourJSON !== currentTourJSON)
    } else if (scenes.length > 0 || tourName !== "Untitled Tour" || tourDescription !== "") {
      // For new tours, consider any content as unsaved changes
      setHasUnsavedChanges(true)
    }
  }, [tourName, tourDescription, scenes, tourThumbnail, initialTour])

  // Add beforeunload event listener for tab/browser closing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = "You have unsaved changes. If you leave now, your changes will be lost."
        e.preventDefault()
        e.returnValue = message // Required for Chrome
        return message // For other browsers
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // Handle back button and other navigation within the app
  const handleNavigation = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      // Show custom dialog
      setShowUnsavedDialog(true)
      // Store the pending navigation URL
      setPendingNavigation(path)
    } else {
      // No unsaved changes, proceed with navigation
      router.push(path)
    }
  }, [hasUnsavedChanges, router])

  // Handle confirming leaving without saving
  const handleConfirmLeave = useCallback(() => {
    setHasUnsavedChanges(false) // Prevent further prompts
    setShowUnsavedDialog(false)
    
    // Navigate to the pending URL if there is one
    if (pendingNavigation) {
      router.push(pendingNavigation)
    } else {
      router.push('/')
    }
  }, [pendingNavigation, router])

  const getThumbnail = (scenes: SceneData[]) => {
    if (tourThumbnail) return tourThumbnail
    
    const firstScene = scenes[0]
    if (!firstScene) return "/api/placeholder/400/300"
  
    if (firstScene.type === 'image') {
      return firstScene.imageUrl || "/api/placeholder/400/300"
    } else {
      // For video scenes, use a video thumbnail placeholder
      return "/api/placeholder/400/300?text=Video+Tour"
    }
  }
  
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      if (!tourName.trim()) {
        throw new Error("Tour name is required");
      }
      
      if (scenes.length === 0) {
        throw new Error("Tour must have at least one scene");
      }

      // Check if this tour exceeds the available limits
      const currentPlan = getCurrentPlan();
      if (!initialTour && currentPlan && scenes.length > currentPlan.limits.maxScenesPerTour) {
        throw new Error(`Your current plan allows a maximum of ${currentPlan.limits.maxScenesPerTour} scenes per tour.`);
      }
      
      // Check if any scene has too many hotspots
      const maxHotspots = getMaxHotspotsAllowed();
      const sceneWithTooManyHotspots = scenes.find(scene => scene.hotspots.length > maxHotspots);
      if (sceneWithTooManyHotspots) {
        throw new Error(`Your current plan allows a maximum of ${maxHotspots} hotspots per scene.`);
      }
  
      // Get appropriate thumbnail based on first scene type
      const thumbnail = getThumbnail(scenes);
  
      // Create a deep copy of the scenes array to ensure all data is captured
      const scenesClone = JSON.parse(JSON.stringify(scenes));
      
      // Log the scenes being saved for debugging
      console.log(`Saving tour with ${scenesClone.length} scenes:`, scenesClone);
      
      // Ensure each scene has required properties
      const validatedScenes = scenesClone.map((scene, index) => {
        // Ensure required properties
        if (!scene.hotspots) {
          scene.hotspots = [];
        }
        
        // Ensure scene has proper type
        if (!scene.type) {
          scene.type = scene.videoUrl ? 'video' : 'image';
        }
        
        return scene;
      });
  
      const tourData: TourData = {
        id: initialTour?.id || Math.random().toString(36).substr(2, 9),
        name: tourName,
        description: tourDescription,
        scenes: validatedScenes,
        createdAt: initialTour?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDraft: true,
        thumbnail: thumbnail,
        type: validatedScenes[0]?.type || 'image' // Add type to identify video tours
      };
  
      console.log(`Saving tour with ID: ${tourData.id}, Scenes: ${tourData.scenes.length}`);
      
      if (initialTour) {
        await updateTour(initialTour.id, tourData);
      } else {
        await addTour(tourData);
      }
      
      // After successful save, reset the unsaved changes flag
      setHasUnsavedChanges(false)
      
      // Success! Navigate back to the tours list
      router.push('/');
    } catch (error) {
      console.error("Error saving tour:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save tour");
    } finally {
      setIsSaving(false);
    }
  };

  const generateUniqueSceneName = useCallback(
    (baseName: string) => {
      let uniqueName = baseName
      let counter = 1
      while (scenes.some((scene) => scene.name === uniqueName)) {
        uniqueName = `${baseName} ${counter}`
        counter++
      }
      return uniqueName
    },
    [scenes],
  )

  // Updated handleAddScene to check subscription limits
  const handleAddScene = useCallback(
    (name: string, type: 'image' | 'video', url: string) => {
      const uniqueName = generateUniqueSceneName(name)
      
      // Check if video is supported on current plan
      if (type === 'video' && !canUseVideoScene()) {
        setSubscriptionLimitType('video')
        setShowSubscriptionLimitDialog(true)
        return
      }
      
      // Check if scene limit is reached
      if (!canAddScene(initialTour?.id || '')) {
        setSubscriptionLimitType('scene')
        setShowSubscriptionLimitDialog(true)
        return
      }
      
      const newScene: SceneData = {
        id: sceneIdCounter.current++,
        name: uniqueName,
        type,
        ...(type === 'image' ? { imageUrl: url } : { videoUrl: url }),
        hotspots: [],
      }
      setScenes((prevScenes) => [...prevScenes, newScene])
      setCurrentSceneId(newScene.id)
      setActiveTab('scenes')
    },
    [generateUniqueSceneName, canAddScene, canUseVideoScene, initialTour?.id],
  )

  const handleUpdateScene = useCallback(
    (id: number, data: Partial<SceneData>) => {
      setScenes((prevScenes) => {
        if (data.name) {
          const isDuplicateName = prevScenes.some((scene) => scene.id !== id && scene.name === data.name)
          if (isDuplicateName) {
            data.name = generateUniqueSceneName(data.name)
          }
        }
        
        // Check if updating to video type is allowed
        if (data.type === 'video' && !canUseVideoScene()) {
          setSubscriptionLimitType('video')
          setShowSubscriptionLimitDialog(true)
          return prevScenes
        }
        
        if (data.type) {
          if (data.type === 'image') {
            data.videoUrl = undefined
          } else {
            data.imageUrl = undefined
          }
        }
        
        return prevScenes.map((scene) => 
          scene.id === id ? { ...scene, ...data } : scene
        )
      })
    },
    [generateUniqueSceneName, canUseVideoScene],
  )

  const handleDeleteScene = useCallback(
    (id: number) => {
      setScenes((prevScenes) => {
        const updatedScenes = prevScenes.filter((scene) => scene.id !== id)
        if (currentSceneId === id) {
          setCurrentSceneId(updatedScenes.length > 0 ? updatedScenes[0].id : null)
        }
        return updatedScenes
      })
    },
    [currentSceneId],
  )

  const handleReorderScenes = useCallback((reorderedScenes: SceneData[]) => {
    setScenes(reorderedScenes)
  }, [])

  // Updated handleAddHotspot to check subscription limits
  const handleAddHotspot = useCallback(
    (position: { x: number; y: number; z: number }) => {
      if (currentSceneId === null) return

      // Get the current scene
      const scene = scenes.find((s) => s.id === currentSceneId);
      if (!scene) return;
      
      // Check if at hotspot limit
      if (!canAddHotspot(initialTour?.id || '', currentSceneId)) {
        setSubscriptionLimitType('hotspot')
        setShowSubscriptionLimitDialog(true)
        return
      }

      const newHotspot: HotspotData = {
        id: Date.now(),
        name: `Hotspot ${scene.hotspots.length + 1 || 1}`,
        position,
        type: "text",
        content: "New hotspot",
        icon: "text",
        style: {
          color: "#000000",
          size: 24,
        },
      }
      setScenes((prevScenes) =>
        prevScenes.map((scene) =>
          scene.id === currentSceneId ? { ...scene, hotspots: [...scene.hotspots, newHotspot] } : scene,
        ),
      )
      
      // Close any open quick actions
      setOpenQuickActionHotspotId(null);
      
      // Switch to hotspots tab when adding a new hotspot
      setActiveTab('hotspots')
      
      // Auto-select the new hotspot
      setSelectedHotspotId(newHotspot.id);
      // Open the accordion for this hotspot
      setOpenAccordionItem(`hotspot-${newHotspot.id}`);
    },
    [currentSceneId, scenes, initialTour?.id, canAddHotspot, setOpenQuickActionHotspotId, setActiveTab, setSelectedHotspotId, setOpenAccordionItem],
  )

  const handleUpdateHotspot = useCallback((sceneId: number, hotspotId: number, data: Partial<HotspotData>) => {
    setScenes((prevScenes) =>
      prevScenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              hotspots: scene.hotspots.map((hotspot) => 
                hotspot.id === hotspotId ? { ...hotspot, ...data } : hotspot
              ),
            }
          : scene,
      ),
    )
    
    // Close any open quick actions
    setOpenQuickActionHotspotId(null);
  }, [setOpenQuickActionHotspotId])

  const handleDeleteHotspot = useCallback((sceneId: number, hotspotId: number) => {
    setScenes((prevScenes) =>
      prevScenes.map((scene) =>
        scene.id === sceneId
          ? { ...scene, hotspots: scene.hotspots.filter((hotspot) => hotspot.id !== hotspotId) }
          : scene,
      ),
    )
    
    // Clear selection if the deleted hotspot is currently selected
    if (selectedHotspotId === hotspotId) {
      setSelectedHotspotId(null);
      setOpenAccordionItem(null);
    }
    
    // Close any open quick actions
    setOpenQuickActionHotspotId(null);
  }, [selectedHotspotId, setSelectedHotspotId, setOpenAccordionItem, setOpenQuickActionHotspotId])

  const handleReorderHotspots = useCallback((sceneId: number, reorderedHotspots: HotspotData[]) => {
    setScenes((prevScenes) =>
      prevScenes.map((scene) => 
        scene.id === sceneId ? { ...scene, hotspots: reorderedHotspots } : scene
      ),
    )
  }, [])

  // Custom upload handler for tour thumbnail
  const handleThumbnailUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTourThumbnail(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Memoized components
  const memoizedPanoramaViewer = useMemo(
    () =>
      currentScene ? (
        <ErrorBoundary>
          <PanoramaContainer
            key={currentScene.id}
            scene={currentScene}
            onAddHotspot={handleAddHotspot}
            onUpdateHotspot={(hotspotId, data) => handleUpdateHotspot(currentScene.id, hotspotId, data)}
            onDeleteHotspot={(hotspotId) => handleDeleteHotspot(currentScene.id, hotspotId)}
            onSelectHotspot={handleSelectHotspot}
            isEditing={isEditing}
            scenes={scenes}
            currentSceneId={currentSceneId}
            onSceneChange={setCurrentSceneId}
            setSelectedHotspotId={setSelectedHotspotId}
            setOpenQuickActionHotspotId={setOpenQuickActionHotspotId}
          />
        </ErrorBoundary>
      ) : (
        <div className="flex flex-col items-center justify-center h-full space-y-3 bg-gray-800 dark:bg-gray-800">
          <div className="text-center max-w-md px-4">
            <div className="inline-block p-4 rounded-full bg-gray-700 mb-2">
              <Image className="h-12 w-12 text-gray-500" />
            </div>
            <p className="text-lg text-center text-gray-300 mb-1">
              No scene selected
            </p>
            <p className="text-sm text-gray-400 mb-3">
              Create a new scene to get started with your virtual tour
            </p>
          </div>
        </div>
      ),
    [
      currentScene,
      isEditing,
      scenes,
      currentSceneId,
      handleAddHotspot,
      handleUpdateHotspot,
      handleDeleteHotspot,
      handleSelectHotspot,
      setSelectedHotspotId,
      setOpenQuickActionHotspotId
    ],
  )

  const memoizedHotspotsList = useMemo(
    () =>
      currentScene && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Hotspots</h2>
            <div className="text-sm text-gray-400">
              {isEditing ? "Click on panorama to add" : "Switch to Edit Mode to add"}
            </div>
          </div>
          
          {/* Display hotspot limit info */}
          {isEditing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-2 text-sm rounded-md border border-blue-100 dark:border-blue-800 mb-2">
              <p className="flex items-center">
                <InfoCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                {currentScene.hotspots.length} of {getMaxHotspotsAllowed()} hotspots used
              </p>
            </div>
          )}
          
          {currentScene.hotspots.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={currentScene.hotspots}
              onReorder={(reorderedHotspots) => handleReorderHotspots(currentScene.id, reorderedHotspots)}
              className="space-y-2"
            >
              <AnimatePresence>
              {currentScene.hotspots.map((hotspot) => (
                  <Reorder.Item key={hotspot.id} value={hotspot}>
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <Accordion 
                        type="single" 
                        collapsible
                        value={openAccordionItem}
                        onValueChange={setOpenAccordionItem}
                      >
                        <AccordionItem 
                          value={`hotspot-${hotspot.id}`} 
                          className={`border ${
                            hotspot.id === selectedHotspotId 
                              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' 
                              : 'border-gray-200 dark:border-gray-700'
                          } rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm`}
                          data-hotspot-id={hotspot.id}
                        >
                          <AccordionTrigger 
                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenQuickActionHotspotId(null);
                              setSelectedHotspotId(hotspot.id);
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <GripVertical className="h-5 w-5 text-gray-400 dark:text-gray-500 cursor-move" />
                              <span className="font-medium capitalize text-gray-900 dark:text-white">{hotspot.type}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {hotspot.name ? ` - ${hotspot.name}` : ""}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-3 max-h-[400px] overflow-y-auto bg-white dark:bg-gray-800">
                            <HotspotEditor
                              hotspot={hotspot}
                              onUpdate={(data) => handleUpdateHotspot(currentScene.id, hotspot.id, data)}
                              onDelete={() => handleDeleteHotspot(currentScene.id, hotspot.id)}
                              scenes={scenes}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
              <Plus className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-gray-700 dark:text-gray-300">No hotspots added yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isEditing 
                  ? "Click on the panorama to add hotspots" 
                  : "Switch to Edit Mode to add hotspots"}
              </p>
            </div>
          )}
        </div>
      ),
    [
      currentScene, 
      scenes, 
      isEditing, 
      handleUpdateHotspot, 
      handleDeleteHotspot, 
      handleReorderHotspots, 
      selectedHotspotId,
      openAccordionItem,
      setOpenAccordionItem,
      setOpenQuickActionHotspotId,
      getMaxHotspotsAllowed
    ],
  )

  const settingsPanel = useMemo(() => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Tour Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">Tour Name</label>
          <Input
            value={tourName}
            onChange={(e) => setTourName(e.target.value)}
            placeholder="Enter tour name"
            className="w-full bg-gray-700 border-gray-600 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">Description</label>
          <Textarea
            value={tourDescription}
            onChange={(e) => setTourDescription(e.target.value)}
            placeholder="Enter tour description"
            className="w-full bg-gray-700 border-gray-600 text-white"
            rows={4}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">Tour Type</label>
          <div className="text-sm bg-gray-700 rounded px-3 py-2 text-gray-300">
            {scenes[0]?.type === 'video' ? 'Video Tour' : 'Image Tour'}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 flex justify-between text-gray-200">
            <span>Thumbnail</span>
            <label className="text-xs text-blue-400 cursor-pointer hover:underline">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleThumbnailUpload}
              />
              Custom Thumbnail
            </label>
          </label>
          <div className="border border-gray-700 rounded-md p-2 bg-gray-700">
            <div className="aspect-video bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
              {tourThumbnail || scenes[0] ? (
                <img 
                  src={getThumbnail(scenes)} 
                  alt="Tour thumbnail" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-500 flex flex-col items-center">
                  <Upload className="h-8 w-8 mb-2" />
                  <span className="text-sm">No thumbnail</span>
                </div>
              )}
            </div>
          </div>
          {!tourThumbnail && scenes.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              The thumbnail is automatically generated from the first scene
            </p>
          )}
        </div>
        
        {/* Subscription info */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-200">Subscription Limits</label>
          <div className="text-sm bg-gray-700 rounded px-3 py-3 text-gray-300 space-y-2">
            <div className="flex justify-between items-center">
              <span>Scenes</span>
              <span className="font-medium">{scenes.length} / {getMaxScenesAllowed()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Hotspots per scene</span>
              <span className="font-medium">{getMaxHotspotsAllowed()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Video support</span>
              <span className={`font-medium ${canUseVideoScene() ? 'text-green-400' : 'text-red-400'}`}>
                {canUseVideoScene() ? 'Available' : 'Upgrade Required'}
              </span>
            </div>
          </div>
          {!canUseVideoScene() && scenes[0]?.type === 'video' && (
            <p className="text-xs text-amber-400 mt-1 flex items-start">
              <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              Your current plan doesn't support video tours. Upgrade to save this tour.
            </p>
          )}
        </div>
      </div>
    </div>
  ), [
    tourName, 
    tourDescription, 
    tourThumbnail, 
    scenes, 
    getThumbnail, 
    handleThumbnailUpload,
    getMaxScenesAllowed,
    getMaxHotspotsAllowed,
    canUseVideoScene
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Current editor state:', {
        tourName,
        tourDescription,
        scenesCount: scenes.length,
        currentSceneId
      })
    }
  }, [tourName, tourDescription, scenes, currentSceneId])

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        {/* Top action bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-20">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleNavigation('/')}
              className="h-9 w-9 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={tourName}
              onChange={(e) => setTourName(e.target.value)}
              placeholder="Untitled Tour"
              className="w-64 h-9 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsEditing(!isEditing);
                if (!isEditing) {
                  setShowViewModeNotification(false);
                }
              }}
              className="h-9 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isEditing ? "View Mode" : "Edit Mode"}
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              size="sm"
              className="h-9 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving ? 'Saving...' : 'Save Tour'}
            </Button>
          </div>
        </div>
  
        {/* Save Error Alert */}
        {saveError && (
          <Alert variant="destructive" className="mx-4 mt-2 z-20">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
  
        {/* Main Content without extra padding */}
        <div ref={mainContentRef} className="flex w-full flex-1 overflow-hidden main-content">
          {/* Vertical Navigation */}
          <div className="w-16 flex-fixed bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center">
            <div className="pt-4 pb-2">
              <Button
                variant={activeTab === 'scenes' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => {
                  setActiveTab('scenes');
                }}
                className="h-10 w-10 rounded-lg"
                title="Scenes"
              >
                <Map className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="py-2">
              <Button
                variant={activeTab === 'hotspots' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => {
                  setActiveTab('hotspots');
                }}
                className="h-10 w-10 rounded-lg"
                title="Hotspots"
                disabled={!currentScene}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="py-2">
              <Button
                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => {
                  setActiveTab('settings');
                }}
                className="h-10 w-10 rounded-lg"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
  
          {/* Side Panel */}
          <AnimatePresence>
            {(
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full w-[320px] flex-fixed bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
              >
                <div className="p-4 flex flex-col h-full">
                  {activeTab === 'scenes' && (
                    <div className="flex flex-col h-full">
                      {/* Scenes Limit Alert */}
                      {scenes.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-2 text-sm rounded-md border border-blue-100 dark:border-blue-800 mb-4">
                          <div className="flex justify-between items-center">
                            <span>Scenes used: </span>
                            <span className="font-medium">{scenes.length} / {getMaxScenesAllowed()}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Scrollable scenes container */}
                      <div className="overflow-y-auto flex-grow" style={{ height: "calc(100vh - 220px)" }}>
                        <div className="space-y-4">
                          <SceneManager
                            scenes={scenes}
                            currentSceneId={currentSceneId}
                            onAddScene={handleAddScene}
                            onUpdateScene={handleUpdateScene}
                            onDeleteScene={handleDeleteScene}
                            onSelectScene={setCurrentSceneId}
                            onReorderScenes={handleReorderScenes}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'hotspots' && currentScene && (
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hotspots</h2>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {isEditing ? "Click on panorama to add" : "Switch to Edit Mode to add"}
                        </div>
                      </div>
                      
                      {/* Hotspot limit display */}
                      {isEditing && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-2 text-sm rounded-md border border-blue-100 dark:border-blue-800 mb-4">
                          <div className="flex justify-between items-center">
                            <span>Hotspots used: </span>
                            <span className="font-medium">{currentScene.hotspots.length} / {getMaxHotspotsAllowed()}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Scrollable hotspots container */}
                      <div className="overflow-y-auto flex-grow" style={{ height: "calc(100vh - 220px)" }}>
                        {currentScene.hotspots.length > 0 ? (
                          <Reorder.Group
                            axis="y"
                            values={currentScene.hotspots}
                            onReorder={(reorderedHotspots) => handleReorderHotspots(currentScene.id, reorderedHotspots)}
                            className="space-y-2"
                          >
                            <AnimatePresence>
                              {currentScene.hotspots.map((hotspot) => (
                                <Reorder.Item key={hotspot.id} value={hotspot}>
                                  <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  >
                                    <Accordion 
                                      type="single" 
                                      collapsible
                                      value={openAccordionItem}
                                      onValueChange={setOpenAccordionItem}
                                    >
                                      <AccordionItem 
                                        value={`hotspot-${hotspot.id}`} 
                                        className={`border ${
                                          hotspot.id === selectedHotspotId 
                                            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' 
                                            : 'border-gray-200 dark:border-gray-700'
                                        } rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm`}
                                        data-hotspot-id={hotspot.id}
                                      >
                                        <AccordionTrigger 
                                          className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenQuickActionHotspotId(null);
                                            setSelectedHotspotId(hotspot.id);
                                          }}
                                        >
                                          <div className="flex items-center space-x-2">
                                            <GripVertical className="h-5 w-5 text-gray-400 dark:text-gray-500 cursor-move" />
                                            <span className="font-medium capitalize text-gray-900 dark:text-white">{hotspot.type}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                              {hotspot.name ? ` - ${hotspot.name}` : ""}
                                            </span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 py-3 max-h-[400px] overflow-y-auto bg-white dark:bg-gray-800">
                                          <HotspotEditor
                                            hotspot={hotspot}
                                            onUpdate={(data) => handleUpdateHotspot(currentScene.id, hotspot.id, data)}
                                            onDelete={() => handleDeleteHotspot(currentScene.id, hotspot.id)}
                                            scenes={scenes}
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  </motion.div>
                                </Reorder.Item>
                              ))}
                            </AnimatePresence>
                          </Reorder.Group>
                        ) : (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                            <Plus className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                            <p className="text-gray-700 dark:text-gray-300">No hotspots added yet</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {isEditing 
                                ? "Click on the panorama to add hotspots" 
                                : "Switch to Edit Mode to add hotspots"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                
                  {activeTab === 'settings' && (
                    <div className="flex flex-col h-full">
                      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Tour Settings</h2>
                      
                      {/* Scrollable settings container */}
                      <div className="overflow-y-auto flex-grow" style={{ height: "calc(100vh - 220px)" }}>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tour Name</label>
                            <Input
                              value={tourName}
                              onChange={(e) => setTourName(e.target.value)}
                              placeholder="Enter tour name"
                              className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                            <Textarea
                              value={tourDescription}
                              onChange={(e) => setTourDescription(e.target.value)}
                              placeholder="Enter tour description"
                              className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                              rows={4}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tour Type</label>
                            <div className="text-sm bg-gray-50 dark:bg-gray-700 rounded px-3 py-2 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                              {scenes[0]?.type === 'video' ? 'Video Tour' : 'Image Tour'}
                              {scenes[0]?.type === 'video' && !canUseVideoScene() && (
                                <span className="ml-2 text-amber-600 dark:text-amber-400 text-xs flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Requires Pro plan
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1 flex justify-between text-gray-700 dark:text-gray-300">
                              <span>Thumbnail</span>
                              <label className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden"
                                  onChange={handleThumbnailUpload}
                                />
                                Custom Thumbnail
                              </label>
                            </label>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-700">
                              <div className="aspect-video bg-white dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                                {tourThumbnail || scenes[0] ? (
                                  <img 
                                    src={getThumbnail(scenes)} 
                                    alt="Tour thumbnail" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center">
                                    <Upload className="h-8 w-8 mb-2" />
                                    <span className="text-sm">No thumbnail</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {!tourThumbnail && scenes.length > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                The thumbnail is automatically generated from the first scene
                              </p>
                            )}
                          </div>
                        
                          {/* Subscription limits section */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 mt-4">
                            <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">Subscription Limits</h3>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Current Plan:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{getCurrentPlan()?.name || 'Free'}</span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Scenes:</span>
                                <span className={`font-medium ${scenes.length >= getMaxScenesAllowed() ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                  {scenes.length} / {getMaxScenesAllowed()}
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Hotspots per scene:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {getMaxHotspotsAllowed()}
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Video tours:</span>
                                <span className={`font-medium ${canUseVideoScene() ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {canUseVideoScene() ? 'Available' : 'Upgrade Required'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => router.push('/dashboard?section=subscription')}
                            >
                              Manage Subscription
                            </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Panorama Viewer */}
          <div ref={containerRef} className="flex-fluid h-full relative bg-gray-100 dark:bg-gray-900">
            <div ref={panoramaContainerRef} className="w-full h-full">
              {memoizedPanoramaViewer}
            </div>
            
            {/* Viewer Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleFullscreen}
                className="bg-black/50 backdrop-blur-sm hover:bg-black/70 border-gray-700 text-white"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Mode Indicator - Moved to top left */}
            <div className="absolute top-4 left-4 z-10">
              <div className={`${isEditing ? "bg-blue-600" : "bg-gray-700"} text-white px-3 py-1 rounded-full text-sm flex items-center shadow-lg`}>
                {isEditing ? (
                  <>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit Mode
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    View Mode
                  </>
                )}
              </div>
            </div>
            
            {/* View Mode Notification */}
            {showViewModeNotification && !isEditing && (
              <div className="absolute top-20 left-0 right-0 mx-auto w-max z-50">
                <Alert className="bg-blue-500/80 text-white border-blue-600 backdrop-blur-sm shadow-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>View Mode</AlertTitle>
                  <AlertDescription>
                    You are currently in view mode. To add or edit hotspots, switch to Edit Mode.
                  </AlertDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-4 bg-transparent text-white border-white hover:bg-white/20"
                    onClick={() => setShowViewModeNotification(false)}
                  >
                    Dismiss
                  </Button>
                </Alert>
              </div>
            )}
            
            {/* Current Scene Name */}
            {currentScene && (
              <div className="absolute bottom-4 left-4 z-10">
                <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm shadow-lg">
                  {currentScene.name}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onConfirm={handleConfirmLeave}
      />
      
      {/* Drag Indicator */}
      <DragIndicator isVisible={isDraggingHotspot} position={dragPosition} />
      
      {/* Edit Mode Tutorial Tooltip */}
      <EditModeTooltip isEditing={isEditing} />

      {/* Subscription Limit Dialog */}
      <SubscriptionLimitDialog
        isOpen={showSubscriptionLimitDialog}
        onClose={() => setShowSubscriptionLimitDialog(false)}
        limitType={subscriptionLimitType}
        currentPlanName={getCurrentPlan()?.name || 'Free'}
        upgradePlanName="Professional"
        onUpgradeClick={() => router.push('/dashboard?section=subscription')}
      />
    </ErrorBoundary>
  )
}