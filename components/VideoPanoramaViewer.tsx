// components/VideoPanoramaViewer.tsx
import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type { HotspotData, SceneData } from "../app/(protected)/editor/page"
import Hotspot from "./Hotspot"
import ErrorBoundary from "./ErrorBoundary"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { getSignedMediaUrl } from "@/lib/aws/s3-media-utils"

interface VideoPanoramaProps {
  videoUrl: string
  hotspots: HotspotData[]
  onAddHotspot: (position: { x: number; y: number; z: number }) => void
  onUpdateHotspot: (id: number, data: Partial<HotspotData>) => void
  onDeleteHotspot: (id: number) => void
  isEditing: boolean
  scenes: SceneData[]
  currentSceneId: number | null
  onSceneChange: (id: number) => void
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  onLoadingStateChange?: (loading: boolean) => void
  onError?: (error: string) => void
  setSelectedHotspotId?: (id: number | null) => void
  setOpenQuickActionHotspotId?: (id: number | null) => void
}

function VideoPanorama({
  videoUrl,
  hotspots,
  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
  isEditing,
  scenes,
  currentSceneId,
  onSceneChange,
  isMuted,
  setIsMuted,
  onLoadingStateChange,
  onError,
  setSelectedHotspotId,
  setOpenQuickActionHotspotId,
}: VideoPanoramaProps) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const textureRef = useRef<THREE.VideoTexture | null>(null)
  const [movingHotspotId, setMovingHotspotId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actualVideoUrl, setActualVideoUrl] = useState<string>("")
  const { scene, camera } = useThree()
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // New raycaster for drag operations
  const dragRaycaster = useMemo(() => new THREE.Raycaster(), [])
  
  // Last known pointer position in normalized device coordinates (NDC)
  const lastPointerPos = useRef<{ x: number; y: number } | null>(null)

  // Notify parent component about loading state changes
  useEffect(() => {
    onLoadingStateChange?.(isLoading)
  }, [isLoading, onLoadingStateChange])

  // Notify parent component about errors
  useEffect(() => {
    if (error) {
      onError?.(error)
    }
  }, [error, onError])

  // Cleanup function for resources
  const cleanupResources = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
        
        // Remove from DOM if it was added
        if (document.body.contains(videoRef.current)) {
          document.body.removeChild(videoRef.current);
        }
      } catch (err) {
        console.error("Error cleaning up video element:", err);
      }
      videoRef.current = null;
    }
    
    if (textureRef.current) {
      textureRef.current.dispose();
      textureRef.current = null;
    }
    
    if (materialRef.current) {
      if (materialRef.current.map) {
        materialRef.current.map.dispose();
      }
      materialRef.current.dispose();
      materialRef.current = null;
    }
  }, []);

  // Debug function
  const logDebugInfo = useCallback(() => {
    console.log("Video element:", videoRef.current);
    if (videoRef.current) {
      console.log("- readyState:", videoRef.current.readyState);
      console.log("- error:", videoRef.current.error);
      console.log("- paused:", videoRef.current.paused);
      console.log("- currentTime:", videoRef.current.currentTime);
      console.log("- src:", videoRef.current.src);
      console.log("- networkState:", videoRef.current.networkState);
    }
    console.log("Texture:", textureRef.current);
    console.log("Material:", materialRef.current);
    console.log("Sphere:", sphereRef.current);
  }, []);

  // Get signed URL for S3 videos
  useEffect(() => {
    const getStreamableUrl = async () => {
      if (!videoUrl) {
        setError("No video URL provided");
        setIsLoading(false);
        return;
      }
      
      console.log("Original video URL:", videoUrl);
      setIsLoading(true);
      
      try {
        if (videoUrl.includes('s3.amazonaws.com')) {
          // Extract user ID from URL
          const userIdMatch = videoUrl.match(/users\/([^\/]+)\/media/);
          const userId = userIdMatch ? userIdMatch[1] : 'unknown';
          
          // Get signed URL for S3 media
          const signedUrl = await getSignedMediaUrl(userId, videoUrl);
          console.log("Generated signed URL:", signedUrl);
          setActualVideoUrl(signedUrl);
        } else {
          setActualVideoUrl(videoUrl);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(`Failed to load video: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };
    
    getStreamableUrl();
    
    return () => {
      cleanupResources();
    };
  }, [videoUrl, cleanupResources]);

  // Create and setup video texture - MODIFIED TO REMOVE isMuted FROM DEPENDENCIES
  useEffect(() => {
    if (!actualVideoUrl) {
      return;
    }
    
    // Clean up previous resources
    cleanupResources();
    
    console.log("Setting up video with URL:", actualVideoUrl);
    setIsLoading(true);
    
    // Create new video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = isMuted;
    video.playsInline = true;
    video.preload = 'auto';
    video.autoplay = true;
    
    // Add to DOM for iOS compatibility but hide it
    document.body.appendChild(video);
    video.style.display = 'none';
    video.style.position = 'absolute';
    video.style.zIndex = '-1000';
    
    // Store reference
    videoRef.current = video;
    setVideoElement(video);
    
    // Setup event listeners
    const handleCanPlay = () => {
      console.log("Video can play, dimensions:", video.videoWidth, "x", video.videoHeight);
      
      try {
        if (!textureRef.current && video.videoWidth > 0) {
          // Create texture from video
          const texture = new THREE.VideoTexture(video);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.format = THREE.RGBAFormat;
          
          // Fix for the flipped text - flip the texture horizontally
          texture.repeat.set(-1, 1);  // Negative X value flips horizontally
          texture.offset.set(1, 0);   // Offset to compensate for the flip
          
          // Store reference
          textureRef.current = texture;
          
          // Create material with texture
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide, // Keep as BackSide for panorama viewing
          });
          
          // Store reference and apply to sphere
          materialRef.current = material;
          if (sphereRef.current) {
            sphereRef.current.material = material;
          }
          
          // Video is ready to be shown
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error setting up video texture:", err);
        setError(`Failed to setup video: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };
    
    const handleError = () => {
      console.error("Video error:", video.error);
      setError(`Video error: ${video.error?.message || "Unknown error"}`);
      setIsLoading(false);
    };
    
    const handleLoadedMetadata = () => {
      console.log("Video metadata loaded", {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
    };
    
    // Add event listeners
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    
    // Set source and try to load
    video.src = actualVideoUrl;
    video.load();
    
    // Try to play the video after a short delay
    const playTimeout = setTimeout(() => {
      // First try to play with audio (unmuted)
      video.play().catch(err => {
        console.warn("Autoplay with audio failed, trying muted:", err);
        
        // Continue with muted playback for now
        video.muted = true;
        setIsMuted(true);
        video.play().catch(muteErr => {
          console.error("Even muted autoplay failed:", muteErr);
          setError("Unable to autoplay video. Try refreshing or click the player to start.");
        });
      });
    }, 1000);
    
    // Log debug info after a short delay
    const debugTimer = setTimeout(() => {
      logDebugInfo();
    }, 3000);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(playTimeout);
      clearTimeout(debugTimer);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      cleanupResources();
    };
  // REMOVED isMuted FROM DEPENDENCIES to prevent recreation on mute toggle
  }, [actualVideoUrl, logDebugInfo, cleanupResources, setIsMuted]);

  // ADDED: New effect specifically for handling mute state changes
  useEffect(() => {
    if (videoRef.current) {
      // Store current time and playing state before changing mute
      const currentTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;
      
      // Update mute state
      videoRef.current.muted = isMuted;
      console.log("Video mute state updated:", isMuted);
      
      // Preserve playback position and state
      if (wasPlaying) {
        videoRef.current.currentTime = currentTime;
        if (videoRef.current.paused) {
          videoRef.current.play().catch(err => {
            console.warn("Error playing video after mute toggle:", err);
          });
        }
      }
    }
  }, [isMuted]);

  // Update texture on each frame to sync with video
  useFrame(({ gl }) => {
    if (textureRef.current && videoRef.current?.readyState >= 2) {
      textureRef.current.needsUpdate = true;
    }
    
    // Continue only if we're in editing mode and have a moving hotspot
    if (isEditing && movingHotspotId !== null && lastPointerPos.current && sphereRef.current) {
      // Set up raycaster from camera through mouse position
      dragRaycaster.setFromCamera(lastPointerPos.current, camera);
      
      // Find intersection with the panorama sphere
      const intersects = dragRaycaster.intersectObject(sphereRef.current);
      
      if (intersects.length > 0) {
        // Get first intersection point
        const intersection = intersects[0];
        
        // Normalize the point to sphere radius
        const point = intersection.point.clone().normalize().multiplyScalar(490);
        
        // Update hotspot position
        onUpdateHotspot(movingHotspotId, { 
          position: { 
            x: point.x, 
            y: point.y, 
            z: point.z 
          } 
        });
      }
    }
  });

  // Handle click for hotspots
  const handleClick = useCallback(
    (event: THREE.Intersection) => {
      if (isEditing && sphereRef.current && !isDragging) {
        const point = event.point.clone().normalize().multiplyScalar(490);
        if (movingHotspotId !== null) {
          // Finish the move operation
          onUpdateHotspot(movingHotspotId, { position: point });
          setMovingHotspotId(null);
        } else {
          // Add a new hotspot
          onAddHotspot({
            x: point.x,
            y: point.y,
            z: point.z,
          });
        }
      }
    },
    [isEditing, movingHotspotId, onAddHotspot, onUpdateHotspot, isDragging],
  );

  // Set up global pointer event handlers for dragging
  useEffect(() => {
    if (!isEditing || movingHotspotId === null) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (movingHotspotId !== null) {
        // Get canvas element and its dimensions
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        
        // Calculate normalized device coordinates (-1 to +1)
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Store last pointer position
        lastPointerPos.current = { x, y };
        
        // Set isDragging true if pointer has moved
        if (!isDragging) {
          setIsDragging(true);
          
          // Dispatch custom event to disable controls
          window.dispatchEvent(new CustomEvent('hotspot-drag-start'));
        }
      }
    };
    
    const handlePointerUp = () => {
      if (movingHotspotId !== null && isDragging) {
        setIsDragging(false);
        
        // Dispatch custom event to re-enable controls
        window.dispatchEvent(new CustomEvent('hotspot-drag-end'));
      }
    };
    
    // Add event listeners to document to catch events outside the canvas
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isEditing, movingHotspotId, isDragging]);

  // Handle selectHotspot function if provided
  const handleSelectHotspot = useCallback(
    (id: number) => {
      if (setSelectedHotspotId) {
        setSelectedHotspotId(id);
      }
    },
    [setSelectedHotspotId],
  );

  // Handle enabling audio after user interaction with the sphere
  // Modified to focus only on hotspot interactions, not audio
  const handleSphereClick = useCallback((e: THREE.Event) => {
    // Only handle sphere click for editing hotspots, not for audio toggling
    if (isEditing || isDragging || movingHotspotId !== null) {
      return;
    }
    
    // Audio handling is now managed by the toggle button only
  }, [isEditing, isDragging, movingHotspotId]);

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
        />
      )),
    [
      hotspots, 
      isEditing, 
      onUpdateHotspot, 
      onDeleteHotspot, 
      handleSelectHotspot,
      movingHotspotId, 
      scenes, 
      currentSceneId, 
      onSceneChange,
      setOpenQuickActionHotspotId
    ],
  );

  // Show error state
  if (error) {
    return (
      <mesh>
        <sphereGeometry args={[500, 64, 32]} />
        <meshBasicMaterial color="#222" side={THREE.BackSide} />
        <group position={[0, 0, -250]}>
          <mesh scale={20}>
            <planeGeometry args={[5, 1]} />
            <meshBasicMaterial 
              color="#ff3333" 
              transparent 
              opacity={0.8} 
              side={THREE.DoubleSide} 
            />
          </mesh>
        </group>
      </mesh>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <mesh>
        <sphereGeometry args={[500, 64, 32]} />
        <meshBasicMaterial color="#333" side={THREE.BackSide} />
        <group position={[0, 0, -250]}>
          <mesh scale={10} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      </mesh>
    );
  }

  return (
    <>
      <mesh 
        ref={sphereRef} 
        onClick={(e) => {
          // Only handle hotspot interactions
          if (e.intersections && e.intersections.length > 0) {
            handleClick(e.intersections[0]);
          }
        }}
      >
        <sphereGeometry args={[500, 64, 32]} />
        {/* Material is set programmatically when video is ready */}
        {sphereRef.current && materialRef.current && (
          <primitive object={materialRef.current} attach="material" />
        )}
        {memoizedHotspots}
      </mesh>
    </>
  );
}

export default function VideoPanoramaViewer(props: Omit<VideoPanoramaProps, 'isMuted' | 'setIsMuted'>) {
  // Changed default from true to false
  const [isMuted, setIsMuted] = useState(false);
  const [controlsEnabled, setControlsEnabled] = useState(true);

  // UPDATED: Improved handleToggleMute to directly manipulate video element
  const handleToggleMute = useCallback((e) => {
    e.stopPropagation(); // Prevent event bubbling
    
    // Direct DOM manipulation for immediate effect without re-renders
    const videoElement = document.querySelector('video');
    if (videoElement) {
      // Store current position and state
      const currentTime = videoElement.currentTime;
      const wasPlaying = !videoElement.paused;
      
      // Toggle mute directly on the element
      videoElement.muted = !videoElement.muted;
      
      // Update state to match actual video element state
      setIsMuted(videoElement.muted);
      
      // Ensure video continues from same position
      if (wasPlaying) {
        videoElement.currentTime = currentTime;
        if (videoElement.paused) {
          videoElement.play().catch(err => console.warn("Error resuming video:", err));
        }
      }
    } else {
      // Fallback to state-based approach if video element not found
      setIsMuted(prev => !prev);
    }
  }, []);

  // Disable controls during hotspot dragging
  useEffect(() => {
    const handleDragStart = () => setControlsEnabled(false);
    const handleDragEnd = () => setControlsEnabled(true);
    
    window.addEventListener('hotspot-drag-start', handleDragStart);
    window.addEventListener('hotspot-drag-end', handleDragEnd);
    
    return () => {
      window.removeEventListener('hotspot-drag-start', handleDragStart);
      window.removeEventListener('hotspot-drag-end', handleDragEnd);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="relative w-full h-full">
        <Canvas
          camera={{ position: [0, 0, 0.1], fov: 75 }}
          gl={{
            powerPreference: "high-performance",
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
          }}
          style={{ width: "100%", height: "100%" }}
          linear
        >
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            rotateSpeed={0.5}
            enableDamping
            dampingFactor={0.1}
            enabled={controlsEnabled}
          />
          <VideoPanorama {...props} isMuted={isMuted} setIsMuted={setIsMuted} />
        </Canvas>
        
        {/* Video Controls - Only mute/unmute button */}
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            variant="outline"
            size="icon"
            className="bg-black/30 hover:bg-black/50 text-white border-none backdrop-blur-sm rounded-lg"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
}