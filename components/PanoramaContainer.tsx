"use client"

import { useState, useEffect, useRef } from 'react'
import PanoramaViewer from './PanoramaViewer'
import VideoPanoramaViewer from './VideoPanoramaViewer'
import type { SceneData, HotspotData } from '../app/(protected)/editor/page'
import { Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface PanoramaContainerProps {
  scene: SceneData
  onAddHotspot: (position: { x: number; y: number; z: number }) => void
  onUpdateHotspot: (id: number, data: Partial<HotspotData>) => void
  onDeleteHotspot: (id: number) => void
  onSelectHotspot?: (id: number) => void
  isEditing: boolean
  scenes: SceneData[]
  currentSceneId: number | null
  onSceneChange: (id: number) => void
  setSelectedHotspotId?: (id: number | null) => void
  setOpenQuickActionHotspotId?: (id: number | null) => void
}

export default function PanoramaContainer({
  scene,
  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
  onSelectHotspot,
  isEditing,
  scenes,
  currentSceneId,
  onSceneChange,
  setSelectedHotspotId,
  setOpenQuickActionHotspotId,
}: PanoramaContainerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [key, setKey] = useState(Date.now()) // Used to force remount when scene changes
  
  // Add container ref for better layout management
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  // Reset loading state and key when scene changes
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    setErrorMessage('')
    setKey(Date.now())
    
    // Reset any ongoing drag operations
    window.isDraggingAnyHotspot = false
    window.dispatchEvent(new CustomEvent('hotspot-drag-end'))
    
    // Automatically hide loading state after 10 seconds as a fallback
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 10000)
    
    return () => clearTimeout(timer)
  }, [scene.id])

  // Handle loading state changes from the viewers
  const handleLoadingStateChange = (loading: boolean) => {
    setIsLoading(loading)
  }

  // Handle errors from the viewers
  const handleError = (error: string) => {
    setHasError(true)
    setErrorMessage(error)
    setIsLoading(false)
  }

  // Add a fullscreen change listener to handle layout restoration
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && containerRef.current) {
        // Reset any dimensions that might have been affected when exiting fullscreen
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.width = '';
            containerRef.current.style.height = '';
          }
          
          if (viewerRef.current) {
            viewerRef.current.style.width = '';
            viewerRef.current.style.height = '';
          }
        }, 100);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle cleanup of global dragging state
  useEffect(() => {
    return () => {
      // Ensure dragging state is cleaned up when unmounting
      window.isDraggingAnyHotspot = false
      window.dispatchEvent(new CustomEvent('hotspot-drag-end'))
    }
  }, []);

  // Handle retry for error states
  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    setKey(Date.now())
  }

  if (hasError) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-full w-full bg-gray-900 text-white panorama-container">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">Error loading panorama</div>
          <p className="mb-4">{errorMessage || "There was a problem loading the panorama content."}</p>
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleRetry}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative panorama-container">
      {/* Single loading indicator for both image and video panoramas */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-black/70 z-10"
          >
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
              <div className="text-white">
                Loading 360° {scene.type === 'video' ? 'video' : 'image'}...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={viewerRef} className="w-full h-full">
        {scene.type === 'video' && scene.videoUrl ? (
          <VideoPanoramaViewer
            key={`video-${key}`}
            videoUrl={scene.videoUrl}
            hotspots={scene.hotspots}
            onAddHotspot={onAddHotspot}
            onUpdateHotspot={onUpdateHotspot}
            onDeleteHotspot={onDeleteHotspot}
            onSelectHotspot={onSelectHotspot}
            isEditing={isEditing}
            scenes={scenes}
            currentSceneId={currentSceneId}
            onSceneChange={onSceneChange}
            onLoadingStateChange={handleLoadingStateChange}
            onError={handleError}
            setSelectedHotspotId={setSelectedHotspotId}
            setOpenQuickActionHotspotId={setOpenQuickActionHotspotId}
          />
        ) : (
          <PanoramaViewer
            key={`image-${key}`}
            imageUrl={scene.imageUrl || ''}
            hotspots={scene.hotspots}
            onAddHotspot={onAddHotspot}
            onUpdateHotspot={onUpdateHotspot}
            onDeleteHotspot={onDeleteHotspot}
            onSelectHotspot={onSelectHotspot}
            isEditing={isEditing}
            scenes={scenes}
            currentSceneId={currentSceneId}
            onSceneChange={onSceneChange}
            onLoadingStateChange={handleLoadingStateChange}
            onError={handleError}
            setSelectedHotspotId={setSelectedHotspotId}
            setOpenQuickActionHotspotId={setOpenQuickActionHotspotId}
          />
        )}
      </div>
    </div>
  )
}