import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Html, useFrame } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Play, Pause, Edit, Move, Trash2, X } from "lucide-react"
import { type HotspotData, type SceneData } from "../app/(protected)/editor/page"
import { base64ToBlob, isBase64String, createSafeObjectURL } from "@/utils/blob-utils"
import { motion, AnimatePresence } from "framer-motion"
import { useSpring, animated } from "@react-spring/three"
import ColorableHotspotIcon from "./ColorableHotspotIcon" // Import our new component

// Add global interface for tracking hotspot drag state
declare global {
  interface Window {
    isDraggingAnyHotspot?: boolean;
  }
}

interface HotspotProps {
  hotspot: HotspotData
  isEditing: boolean
  onUpdate: (id: number, data: Partial<HotspotData>) => void
  onDelete: (id: number) => void
  onSelect?: (id: number) => void
  isMoving: boolean
  setMovingHotspotId: (id: number | null) => void
  scenes: SceneData[]
  currentSceneId: number | null
  onSceneChange: (id: number) => void
  openQuickActionHotspotId?: number | null
  setOpenQuickActionHotspotId?: (id: number | null) => void
  setParentIsDragging?: (isDragging: boolean) => void
}

function Hotspot({
  hotspot,
  isEditing,
  onUpdate,
  onDelete,
  onSelect,
  isMoving,
  setMovingHotspotId,
  scenes,
  currentSceneId,
  onSceneChange,
  openQuickActionHotspotId,
  setOpenQuickActionHotspotId,
  setParentIsDragging,
}: HotspotProps) {
  // State management
  const [isActive, setIsActive] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)

  // Refs
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const audioObjectUrlRef = useRef<string | null>(null)
  const groupRef = useRef<THREE.Group>(null)
  const dragTimerRef = useRef<number | null>(null)

  // Animation spring for smooth movement
  const { position } = useSpring({
    position: [hotspot.position.x, hotspot.position.y, hotspot.position.z],
    config: { tension: 120, friction: 14 },
    immediate: isDragging
  })

  // Cleanup function for object URLs
  const cleanupObjectUrls = useCallback(() => {
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
  }, []);

  // Event Handlers
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isEditing) {
        if (isMoving) {
          // If we're already in moving mode, stop it
          setMovingHotspotId(null)
          // Make sure to reset the global flag
          window.isDraggingAnyHotspot = false
        } else {
          // Toggle quick actions menu
          setShowQuickActions(!showQuickActions)
        }
      } else {
        if (hotspot.type === "scene" && hotspot.targetSceneId) {
          onSceneChange(hotspot.targetSceneId)
        } else {
          setIsActive(!isActive)
          setIsPlaying(false)
        }
      }
    },
    [isEditing, isActive, hotspot.type, hotspot.targetSceneId, onSceneChange, isMoving, setMovingHotspotId, showQuickActions],
  )

  const handleCloseContent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsActive(false)
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel()
      speechSynthesisRef.current = null
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause()
      voiceAudioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setIsPlayingVoice(false)
  }, [])

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // Select this hotspot when edit is clicked
      if (onSelect) {
        onSelect(hotspot.id)
      }
      // Close quick actions after selecting edit
      setShowQuickActions(false)
    },
    [hotspot.id, onSelect],
  )

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      
      // If we're already dragging a hotspot, don't start another one
      if (window.isDraggingAnyHotspot) return;

      // Set our flag
      window.isDraggingAnyHotspot = true;
      
      setMovingHotspotId(hotspot.id)
      // Close quick actions after starting move
      setShowQuickActions(false)
      setIsDragging(true)
      
      // Update global dragging state if prop is provided
      if (setParentIsDragging) {
        setParentIsDragging(true);
      }
      
      // Trigger a custom event to indicate drag start for parent components
      window.dispatchEvent(new CustomEvent('hotspot-drag-start'))
    },
    [hotspot.id, setMovingHotspotId, setParentIsDragging],
  )
  
  const handleDragStart = useCallback((e: PointerEvent) => {
    if (isMoving) {
      setDragStartPos({ x: e.clientX, y: e.clientY })
      setIsDragging(true)
      
      // Update global dragging state if prop is provided
      if (setParentIsDragging) {
        setParentIsDragging(true);
      }
      
      // Enable pointer capture to receive pointer events outside the HTML element
      const target = e.target as HTMLElement
      target.setPointerCapture(e.pointerId)
      
      // Dispatch custom event for the drag indicator
      window.isDraggingAnyHotspot = true
      window.dispatchEvent(new CustomEvent('hotspot-drag-start'))
    }
  }, [isMoving, setParentIsDragging]);
  
  const handleDragEnd = useCallback((e: PointerEvent) => {
    if (isMoving && dragStartPos) {
      setIsDragging(false)
      setDragStartPos(null)
      
      // Update global dragging state if prop is provided
      if (setParentIsDragging) {
        setParentIsDragging(false);
      }
      
      // Release pointer capture
      const target = e.target as HTMLElement
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId)
      }
      
      // Clear any stuck animation state by forcing dragStartPos to null
      setTimeout(() => {
        setDragStartPos(null)
        setIsDragging(false)
        
        // Reset global flag
        window.isDraggingAnyHotspot = false
        
        // Dispatch custom event for the drag indicator
        window.dispatchEvent(new CustomEvent('hotspot-drag-end'))
      }, 50)
    }
  }, [isMoving, dragStartPos, setParentIsDragging]);
  
  const handleDragMove = useCallback((e: PointerEvent) => {
    if (isMoving && isDragging && dragStartPos) {
      // Get the panorama container to constrain dragging within its bounds
      const panoramaContainer = document.querySelector('.panorama-container');
      if (!panoramaContainer) return;
      
      // Get container bounds
      const containerRect = panoramaContainer.getBoundingClientRect();
      
      // Ensure pointer is within the panorama container bounds
      const isWithinPanorama = (
        e.clientX >= containerRect.left && 
        e.clientX <= containerRect.right && 
        e.clientY >= containerRect.top && 
        e.clientY <= containerRect.bottom
      );
      
      // Only process drag if within panorama bounds
      if (isWithinPanorama) {
        // Calculate movement delta
        const deltaX = e.clientX - dragStartPos.x
        const deltaY = e.clientY - dragStartPos.y
        
        // Update drag start position for next move
        setDragStartPos({ x: e.clientX, y: e.clientY })
        
        // Convert screen movement to 3D space movement
        const moveSpeed = 0.01 // Reduced for more precise control
        
        // Calculate new position
        const newPos = {
          x: hotspot.position.x + deltaX * moveSpeed,
          y: hotspot.position.y - deltaY * moveSpeed, // Invert Y for natural drag direction
          z: hotspot.position.z
        }
        
        // Update position immediately without throttling for more responsive movement
        onUpdate(hotspot.id, { position: newPos })
      }
    }
  }, [isMoving, isDragging, dragStartPos, hotspot.id, hotspot.position, onUpdate]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete(hotspot.id)
      // Close quick actions after deletion
      setShowQuickActions(false)
    },
    [hotspot.id, onDelete],
  )

  const toggleAudio = useCallback(() => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying])

  const handleTTS = useCallback(() => {
    if (!hotspot.ttsText) return

    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel()
      speechSynthesisRef.current = null
      setIsPlaying(false)
    } else {
      const utterance = new SpeechSynthesisUtterance(hotspot.ttsText)
      utterance.lang = hotspot.ttsLanguage || "en-US"

      const voices = window.speechSynthesis.getVoices()
      const preferredGender = hotspot.ttsVoiceGender || "female"
      const voice = voices.find((v) => v.lang === utterance.lang && v.name.toLowerCase().includes(preferredGender))

      if (voice) {
        utterance.voice = voice
      } else {
        const languageVoice = voices.find((v) => v.lang === utterance.lang)
        if (languageVoice) {
          utterance.voice = languageVoice
        }
      }

      speechSynthesisRef.current = utterance

      utterance.onend = () => {
        speechSynthesisRef.current = null
        setIsPlaying(false)
      }

      window.speechSynthesis.speak(utterance)
      setIsPlaying(true)
    }
  }, [hotspot.ttsText, hotspot.ttsLanguage, hotspot.ttsVoiceGender])

  const handleVoicePlayback = useCallback(() => {
    if (!hotspot.voiceRecording) return;

    // If audio is already playing, pause it
    if (isPlayingVoice && voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      setIsPlayingVoice(false);
      return;
    }

    // Create new audio element if it doesn't exist
    if (!voiceAudioRef.current) {
      voiceAudioRef.current = new Audio();
      voiceAudioRef.current.onended = () => setIsPlayingVoice(false);
    }

    // Create object URL from the recording (Blob or Base64 string)
    if (!audioObjectUrlRef.current) {
      try {
        if (hotspot.voiceRecording instanceof Blob) {
          audioObjectUrlRef.current = URL.createObjectURL(hotspot.voiceRecording);
        } else if (typeof hotspot.voiceRecording === 'string' && isBase64String(hotspot.voiceRecording)) {
          const audioBlob = base64ToBlob(hotspot.voiceRecording);
          audioObjectUrlRef.current = URL.createObjectURL(audioBlob);
        } else {
          console.error('Invalid voice recording format:', hotspot.voiceRecording);
          return;
        }
      } catch (error) {
        console.error('Error creating audio URL:', error);
        return;
      }
    }

    // Set the audio source and play
    voiceAudioRef.current.src = audioObjectUrlRef.current;
    voiceAudioRef.current.play()
      .then(() => setIsPlayingVoice(true))
      .catch(err => console.error('Error playing audio:', err));
  }, [hotspot.voiceRecording, isPlayingVoice]);

  // Helper function for YouTube video ID extraction
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  // Set up event listeners for dragging
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => handleDragStart(e)
    const handlePointerUp = (e: PointerEvent) => handleDragEnd(e)
    const handlePointerMove = (e: PointerEvent) => handleDragMove(e)
    
    const element = document.getElementById(`hotspot-${hotspot.id}`)
    if (element && isMoving) {
      element.addEventListener('pointerdown', handlePointerDown, { passive: false })
      element.addEventListener('pointerup', handlePointerUp, { passive: false })
      element.addEventListener('pointermove', handlePointerMove, { passive: false })
      
      // Add visual feedback for draggable state
      element.style.cursor = 'move'
    }
    
    return () => {
      if (element) {
        element.removeEventListener('pointerdown', handlePointerDown)
        element.removeEventListener('pointerup', handlePointerUp)
        element.removeEventListener('pointermove', handlePointerMove)
        element.style.cursor = ''
      }
      
      // Clean up dragging state when unmounting
      if (setParentIsDragging && isDragging) {
        setParentIsDragging(false);
      }
      
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current)
        dragTimerRef.current = null
      }
      
      // Make sure the global flag is reset
      window.isDraggingAnyHotspot = false
    }
  }, [isMoving, handleDragStart, handleDragEnd, handleDragMove, hotspot.id, isDragging, setParentIsDragging]);

  // Effect to close quick actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showQuickActions) {
        const target = e.target as HTMLElement;
        const hotspotElement = document.getElementById(`hotspot-${hotspot.id}`);
        const quickActionsElement = document.getElementById(`quick-actions-${hotspot.id}`);
        
        if (hotspotElement && quickActionsElement && 
            !hotspotElement.contains(target) && 
            !quickActionsElement.contains(target)) {
          setShowQuickActions(false);
        }
      }
    }
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    }
  }, [showQuickActions, hotspot.id]);

  // Content renderer
  const renderHotspotContent = useCallback(() => {
    switch (hotspot.type) {
      case "text":
        return <p className="text-base text-black">{hotspot.content || "No content"}</p>
      
      case "image":
        return (
          hotspot.imageUrl && (
            <div className="relative w-full aspect-video">
              <img
                src={hotspot.imageUrl}
                alt="Hotspot"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )
        )
      
      case "video":
        const videoId = getYouTubeVideoId(hotspot.videoUrl || "")
        return (
          <div className="relative w-full aspect-video">
            {videoId ? (
              <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : hotspot.videoUrl ? (
              <video 
                className="w-full h-full rounded-lg"
                src={hotspot.videoUrl} 
                controls
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
                <p>No video available</p>
              </div>
            )}
          </div>
        )
      
      case "audio":
        return (
          hotspot.audioUrl && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold">{hotspot.audioTitle || "Audio Narration"}</h3>
              <Button onClick={toggleAudio} variant="outline" className="w-full">
                {isPlaying ? (
                  <><Pause className="h-4 w-4 mr-2" /> Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Play</>
                )}
              </Button>
              <audio 
                ref={audioElementRef}
                src={hotspot.audioUrl} 
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )
        )
      
      case "tts":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">Text-to-Speech</h3>
            <Button onClick={handleTTS} variant="outline" className="w-full">
              {isPlaying ? (
                <><Pause className="h-4 w-4 mr-2" /> Stop</>
              ) : (
                <><Play className="h-4 w-4 mr-2" /> Play</>
              )}
            </Button>
            <p className="text-base text-black">{hotspot.ttsText}</p>
          </div>
        )
      
      case "voice":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">Voice Recording</h3>
            <Button onClick={handleVoicePlayback} variant="outline" className="w-full">
              {isPlayingVoice ? (
                <><Pause className="h-4 w-4 mr-2" /> Pause</>
              ) : (
                <><Play className="h-4 w-4 mr-2" /> Play</>
              )}
            </Button>
          </div>
        )

      default:
        return null
    }
  }, [
    hotspot,
    isPlaying,
    toggleAudio,
    handleTTS,
    isPlayingVoice,
    handleVoicePlayback,
  ])

  // Style memoization
  const hotspotStyle = useMemo(
    () => ({
      cursor: isMoving ? "move" : "pointer",
      fontSize: `${hotspot.style?.size || 24}px`,
      opacity: isMoving ? 0.8 : 1,
      width: hotspot.style?.size || 24,
      height: hotspot.style?.size || 24,
      position: "relative",
      zIndex: isActive ? 1 : 0,
      transition: isMoving ? "none" : "transform 0.2s ease-out, opacity 0.2s ease-out",
      transform: isMoving ? "scale(1.2)" : "scale(1)",
      filter: isMoving ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))" : "none"
    }),
    [hotspot.style, isMoving, isActive]
  )

  // Effects
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices()
    }

    loadVoices()
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel()
      }
      // Clean up object URLs
      cleanupObjectUrls();
    }
  }, [cleanupObjectUrls]);

  // Effect for audio playback
  useEffect(() => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
          setIsPlaying(false);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Render
  return (
    <animated.group ref={groupRef} position={position}>
      <Html center>
        <div 
          id={`hotspot-${hotspot.id}`}
          onClick={handleClick}
          style={hotspotStyle}
          className={`relative ${isMoving ? 'animate-pulse' : ''}`}
          data-hotspot-id={hotspot.id}
        >
          {/* Use ColorableHotspotIcon instead of regular Image */}
          <ColorableHotspotIcon
            iconType={hotspot.type}
            color={hotspot.style?.color || "#000000"}
            size={hotspot.style?.size || 24}
            className={`w-full h-full ${isMoving ? 'animate-ping opacity-70' : ''}`}
          />
          
          {/* Visual indicator when moving */}
          {isMoving && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-50"></div>
          )}
        </div>

        <AnimatePresence>
          {showQuickActions && isEditing && (
            <motion.div 
              id={`quick-actions-${hotspot.id}`}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 bg-white p-2 rounded-lg shadow-lg flex gap-2 z-10" 
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="sm" variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleMove} className={isMoving ? "bg-blue-100 border-blue-500 text-blue-700" : ""}>
                <Move className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isActive && !isEditing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 bg-white p-4 rounded-lg shadow-lg z-20"
              style={{
                minWidth: "300px",
                maxWidth: "400px",
                transform: "translate(-50%, -50%)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={handleCloseContent}
              >
                <X className="h-4 w-4" />
              </button>
              {renderHotspotContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </Html>
    </animated.group>
  )
}

export default React.memo(Hotspot)