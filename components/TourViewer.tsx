// components/TourViewer.tsx
"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { 
  Expand, 
  Minimize, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  ArrowLeft,
  Info
} from "lucide-react"
import type { TourData } from "@/components/VirtualTourEditor"
import ErrorBoundary from "@/components/ErrorBoundary"
import { motion, AnimatePresence } from "framer-motion"

const PanoramaContainer = dynamic(() => import("@/components/PanoramaContainer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-lg">Loading viewer...</div>
    </div>
  ),
})

interface TourViewerProps {
  tour: TourData
  isEmbedded?: boolean
}

export default function TourViewer({ tour, isEmbedded = false }: TourViewerProps) {
  const router = useRouter()
  const [currentSceneId, setCurrentSceneId] = useState<number | null>(
    tour.scenes[0]?.id || null
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(!isEmbedded) // Hide thumbnails by default in embed mode
  const [showTourInfo, setShowTourInfo] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const thumbnailsRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err)
        })
        setIsFullscreen(true)
      } else {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }, [])

  const scrollThumbnails = useCallback((direction: 'left' | 'right') => {
    if (thumbnailsRef.current) {
      const scrollAmount = 300
      thumbnailsRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const currentScene = tour.scenes.find(scene => scene.id === currentSceneId)

  if (!currentScene) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">No scenes available</div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 w-full h-full" ref={containerRef}>
        {/* Panorama Viewer */}
        <div className="w-full h-full">
          <PanoramaContainer
            key={currentScene.id}
            scene={currentScene}
            onAddHotspot={() => {}}
            onUpdateHotspot={() => {}}
            onDeleteHotspot={() => {}}
            isEditing={false}
            scenes={tour.scenes}
            currentSceneId={currentSceneId}
            onSceneChange={setCurrentSceneId}
          />
        </div>

        {/* Back Button - only show in normal mode, not embed */}
        {!isEmbedded && (
          <div className="absolute top-4 left-4 z-50">
            <Button 
              variant="outline"
              size="sm"
              className="bg-black/30 hover:bg-black/50 text-white border-none backdrop-blur-sm rounded-lg flex items-center gap-2"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Dashboard
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          {/* Tour Info button */}
          <Button 
            variant="outline"
            size="icon"
            className="bg-black/30 hover:bg-black/50 text-white border-none backdrop-blur-sm rounded-lg"
            onClick={() => setShowTourInfo(!showTourInfo)}
          >
            <Info className="h-4 w-4" />
          </Button>
          
          {/* Thumbnails toggle */}
          <Button 
            variant="outline"
            size="icon"
            className="bg-black/30 hover:bg-black/50 text-white border-none backdrop-blur-sm rounded-lg"
            onClick={() => setShowThumbnails(!showThumbnails)}
          >
            <Grid className="h-4 w-4" />
          </Button>
          
          {/* Fullscreen toggle */}
          <Button 
            variant="outline"
            size="icon"
            className="bg-black/30 hover:bg-black/50 text-white border-none backdrop-blur-sm rounded-lg"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </Button>
        </div>

        {/* Tour Info Panel */}
        <AnimatePresence>
          {showTourInfo && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute top-0 left-0 bottom-0 z-50 w-72 bg-black/70 backdrop-blur-md text-white p-6 overflow-y-auto"
            >
              <h2 className="text-xl font-bold mb-2">{tour.name}</h2>
              <p className="text-sm text-gray-300 mb-6">{tour.description}</p>
              
              <h3 className="text-md font-semibold mb-2">Available Scenes:</h3>
              <div className="space-y-2">
                {tour.scenes.map(scene => (
                  <button
                    key={scene.id}
                    onClick={() => {
                      setCurrentSceneId(scene.id)
                      setShowTourInfo(false)
                    }}
                    className={`block w-full text-left p-2 rounded text-sm ${
                      scene.id === currentSceneId 
                        ? 'bg-blue-600' 
                        : 'bg-black/30 hover:bg-black/50'
                    }`}
                  >
                    {scene.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene Thumbnails */}
        <AnimatePresence>
          {showThumbnails && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-8 left-0 right-0 z-50 flex justify-center"
            >
              <div className="relative flex items-center max-w-[900px] mx-auto px-10">
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-0 z-10 bg-black/30 hover:bg-black/50 text-white border-none backdrop-blur-sm rounded-lg"
                  onClick={() => scrollThumbnails('left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div 
                  ref={thumbnailsRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-4 bg-black/30 backdrop-blur-sm rounded-lg"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {tour.scenes.map(scene => (
                    <button
                      key={scene.id}
                      onClick={() => setCurrentSceneId(scene.id)}
                      className={`relative flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden transition-all duration-200 
                        ${scene.id === currentSceneId ? 'ring-2 ring-white scale-105' : 'ring-1 ring-white/50 hover:ring-white/80'}`}
                    >
                      {scene.type === 'video' ? (
                        <video
                          src={scene.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          onMouseOver={(e) => e.currentTarget.play()}
                          onMouseOut={(e) => {
                            e.currentTarget.pause()
                            e.currentTarget.currentTime = 0
                          }}
                        />
                      ) : (
                        <img
                          src={scene.imageUrl}
                          alt={scene.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 z-10 bg-black/30 hover:bg-black/50 text-white border-none backdrop-blur-sm rounded-lg"
                  onClick={() => scrollThumbnails('right')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}