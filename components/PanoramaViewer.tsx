"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type { HotspotData, SceneData } from "../app/editor/page"
import Hotspot from "./Hotspot"
import ErrorBoundary from "./ErrorBoundary"
import { useOptimizedTexture } from "./TextureLoader"

interface PanoramaViewerProps {
  imageUrl: string
  hotspots: HotspotData[]
  onAddHotspot: (position: { x: number; y: number; z: number }) => void
  onUpdateHotspot: (id: number, data: Partial<HotspotData>) => void
  onDeleteHotspot: (id: number) => void
  onSelectHotspot?: (id: number) => void
  isEditing: boolean
  scenes: SceneData[]
  currentSceneId: number | null
  onSceneChange: (id: number) => void
  onLoadingStateChange?: (loading: boolean) => void
  onError?: (error: string) => void
  setSelectedHotspotId?: (id: number | null) => void
  setOpenQuickActionHotspotId?: (id: number | null) => void
}

function Panorama({
  imageUrl,
  hotspots,
  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
  onSelectHotspot,
  isEditing,
  scenes,
  currentSceneId,
  onSceneChange,
  onLoadingStateChange,
  onError,
  setSelectedHotspotId,
  setOpenQuickActionHotspotId,
}: PanoramaViewerProps) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const [movingHotspotId, setMovingHotspotId] = useState<number | null>(null)
  const { texture, error, loading } = useOptimizedTexture(imageUrl)
  const { gl, camera, scene, raycaster, mouse } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  
  // New raycaster for drag operations
  const dragRaycaster = useMemo(() => new THREE.Raycaster(), [])
  
  // Last known pointer position in normalized device coordinates (NDC)
  const lastPointerPos = useRef<{ x: number; y: number } | null>(null)

  // Notify parent component about loading state changes
  useEffect(() => {
    onLoadingStateChange?.(loading)
  }, [loading, onLoadingStateChange])

  // Notify parent component about errors
  useEffect(() => {
    if (error) {
      onError?.(error)
    }
  }, [error, onError])

  // Clean up resources when component unmounts
  useEffect(() => {
    if (sphereRef.current) {
      const geometry = sphereRef.current.geometry
      const material = sphereRef.current.material as THREE.Material

      return () => {
        geometry.dispose()
        material.dispose()
      }
    }
  }, [])

  // Handle regular click for adding hotspots
  const handleClick = useCallback(
    (event: THREE.Intersection) => {
      // If we're dragging, don't handle the click (this prevents conflicting with drag operations)
      if (isDragging) {
        // Reset dragging state to avoid stuck animation
        setIsDragging(false)
        
        // Dispatch end event to ensure controls are re-enabled and animation stops
        window.dispatchEvent(new CustomEvent('hotspot-drag-end'))
        window.isDraggingAnyHotspot = false
        return
      }
      
      // If we're clicking on the panorama background, close any open editors
      if (setSelectedHotspotId) {
        setSelectedHotspotId(null)
      }
      
      if (setOpenQuickActionHotspotId) {
        setOpenQuickActionHotspotId(null)
      }
      
      if (isEditing && sphereRef.current) {
        // Normalize the point to sphere radius for consistent positioning
        const point = event.point.clone().normalize().multiplyScalar(490)
        
        if (movingHotspotId !== null) {
          // If we have a moving hotspot, update its position
          onUpdateHotspot(movingHotspotId, { position: point })
          setMovingHotspotId(null)
          
          // Ensure drag state is reset
          setIsDragging(false)
          window.isDraggingAnyHotspot = false
          window.dispatchEvent(new CustomEvent('hotspot-drag-end'))
        } else {
          // Add a new hotspot
          onAddHotspot({
            x: point.x,
            y: point.y,
            z: point.z,
          })
        }
      }
    },
    [isEditing, movingHotspotId, onAddHotspot, onUpdateHotspot, isDragging, setSelectedHotspotId, setOpenQuickActionHotspotId],
  )

  // Set up global pointer event handlers for dragging
  useEffect(() => {
    if (!isEditing || movingHotspotId === null) return
    
    const handlePointerMove = (e: PointerEvent) => {
      if (movingHotspotId !== null) {
        // Get the canvas element
        const canvas = gl.domElement
        const rect = canvas.getBoundingClientRect()
        
        // Check if pointer is within canvas boundaries
        const isWithinCanvas = (
          e.clientX >= rect.left && 
          e.clientX <= rect.right && 
          e.clientY >= rect.top && 
          e.clientY <= rect.bottom
        )
        
        // Only process if within boundaries
        if (isWithinCanvas) {
          // Calculate normalized device coordinates (-1 to +1)
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
          const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
          
          // Store last pointer position
          lastPointerPos.current = { x, y }
          
          // Make sure dragging state is set properly
          if (!isDragging) {
            setIsDragging(true)
            
            // Dispatch custom event for the drag indicator
            window.dispatchEvent(new CustomEvent('hotspot-drag-start'))
          }
        }
      }
    }
    
    const handlePointerUp = () => {
      if (movingHotspotId !== null && isDragging) {
        // Clean up dragging state
        setIsDragging(false)
        setMovingHotspotId(null)
        
        // Reset global flag
        window.isDraggingAnyHotspot = false
        
        // Dispatch end event
        window.dispatchEvent(new CustomEvent('hotspot-drag-end'))
      }
    }
    
    // Add event listeners
    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    document.addEventListener('pointerup', handlePointerUp, { passive: false })
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      
      // Make sure dragging state is cleaned up
      window.isDraggingAnyHotspot = false
      window.dispatchEvent(new CustomEvent('hotspot-drag-end'))
    }
  }, [isEditing, movingHotspotId, isDragging, gl])

  // Use frame to update hotspot position during dragging
  useFrame(() => {
    // Continue only if we're in editing mode, have a moving hotspot, and have pointer position
    if (isEditing && movingHotspotId !== null && lastPointerPos.current && sphereRef.current) {
      // Set up raycaster from camera through mouse position
      dragRaycaster.setFromCamera(lastPointerPos.current, camera)
      
      // Find intersection with the panorama sphere
      const intersects = dragRaycaster.intersectObject(sphereRef.current)
      
      if (intersects.length > 0) {
        // Get first intersection point
        const intersection = intersects[0]
        
        // Normalize the point to sphere radius
        const point = intersection.point.clone().normalize().multiplyScalar(490)
        
        // Update hotspot position
        onUpdateHotspot(movingHotspotId, { 
          position: { 
            x: point.x, 
            y: point.y, 
            z: point.z 
          } 
        })
      }
    }
  })

  // Handle hotspot selection
  const handleSelectHotspot = useCallback(
    (id: number) => {
      if (onSelectHotspot) {
        onSelectHotspot(id);
      }
    },
    [onSelectHotspot]
  );

  // Memoized hotspots to prevent unnecessary re-renders
  const memoizedHotspots = useMemo(
    () =>
      hotspots.map((hotspot) => (
        <Hotspot
          key={hotspot.id}
          hotspot={hotspot}
          isEditing={isEditing}
          onUpdate={onUpdateHotspot}
          onDelete={onDeleteHotspot}
          onSelect={handleSelectHotspot}
          isMoving={movingHotspotId === hotspot.id}
          setMovingHotspotId={setMovingHotspotId}
          scenes={scenes}
          currentSceneId={currentSceneId}
          onSceneChange={onSceneChange}
          openQuickActionHotspotId={setOpenQuickActionHotspotId ? movingHotspotId : null}
          setOpenQuickActionHotspotId={setOpenQuickActionHotspotId}
          setParentIsDragging={setIsDragging}
        />
      )),
    [
      hotspots, 
      isEditing, 
      onUpdateHotspot, 
      onDeleteHotspot, 
      handleSelectHotspot,
      movingHotspotId, 
      setMovingHotspotId,
      scenes, 
      currentSceneId, 
      onSceneChange,
      setOpenQuickActionHotspotId,
      setIsDragging
    ],
  )

  if (error) {
    return (
      <mesh>
        <sphereGeometry args={[500, 32, 16]} />
        <meshBasicMaterial color="#444" side={THREE.BackSide} />
      </mesh>
    )
  }

  if (!texture) {
    return null
  }

  return (
    <>
      <mesh ref={sphereRef} onClick={(e) => handleClick(e.intersections[0])}>
        <sphereGeometry args={[500, 32, 16]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} />
        {memoizedHotspots}
      </mesh>
    </>
  )
}

export default function PanoramaViewer(props: PanoramaViewerProps) {
  const [controlsEnabled, setControlsEnabled] = useState(true)
  
  // Disable controls during hotspot dragging
  useEffect(() => {
    const handleDragStart = () => setControlsEnabled(false)
    const handleDragEnd = () => setControlsEnabled(true)
    
    window.addEventListener('hotspot-drag-start', handleDragStart)
    window.addEventListener('hotspot-drag-end', handleDragEnd)
    
    return () => {
      window.removeEventListener('hotspot-drag-start', handleDragStart)
      window.removeEventListener('hotspot-drag-end', handleDragEnd)
      
      // Make sure dragging state is cleaned up when component unmounts
      window.isDraggingAnyHotspot = false
    }
  }, [])

  return (
    <ErrorBoundary>
      <Canvas
        camera={{ position: [0, 0, 0.1] }}
        gl={{
          powerPreference: "high-performance",
          antialias: false,
          alpha: false,
          preserveDrawingBuffer: false,
        }}
        style={{ width: "100%", height: "100%" }}
        performance={{ min: 0.5 }}
      >
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          rotateSpeed={0.5}
          enabled={controlsEnabled}
        />
        <Panorama {...props} />
      </Canvas>
    </ErrorBoundary>
  )
}