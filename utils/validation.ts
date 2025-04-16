// utils/validation.ts
import type { SceneData, HotspotData, TourData } from "@/components/VirtualTourEditor";

/**
 * Validates and normalizes a hotspot to ensure it has all required properties
 */
export const validateHotspot = (hotspot: Partial<HotspotData>): HotspotData => {
  if (!hotspot) {
    throw new Error("Hotspot data is null or undefined");
  }
  
  // Ensure ID exists
  if (!hotspot.id && hotspot.id !== 0) {
    throw new Error("Hotspot ID is required");
  }
  
  // Return a normalized hotspot with all required properties
  return {
    id: hotspot.id,
    name: hotspot.name || `Hotspot ${hotspot.id}`,
    position: hotspot.position || { x: 0, y: 0, z: 0 },
    type: hotspot.type || "text",
    content: hotspot.content,
    imageUrl: hotspot.imageUrl,
    videoUrl: hotspot.videoUrl,
    audioUrl: hotspot.audioUrl,
    audioTitle: hotspot.audioTitle,
    pdfUrl: hotspot.pdfUrl,
    pdfTitle: hotspot.pdfTitle,
    targetSceneId: hotspot.targetSceneId,
    icon: hotspot.icon || "Info",
    style: hotspot.style || {
      color: "#FF0000",
      size: 24,
    },
    ttsText: hotspot.ttsText,
    ttsLanguage: hotspot.ttsLanguage,
    ttsVoiceGender: hotspot.ttsVoiceGender,
    voiceRecording: hotspot.voiceRecording
  };
};

/**
 * Validates and normalizes a scene to ensure it has all required properties
 */
export const validateScene = (scene: Partial<SceneData>): SceneData => {
  if (!scene) {
    throw new Error("Scene data is null or undefined");
  }
  
  // Ensure ID exists
  if (!scene.id && scene.id !== 0) {
    throw new Error("Scene ID is required");
  }
  
  // Default scene type based on provided URLs
  const sceneType = scene.videoUrl ? 'video' : 'image';
  
  // Validate hotspots if they exist
  const validatedHotspots = Array.isArray(scene.hotspots) 
    ? scene.hotspots.map(hotspot => validateHotspot(hotspot))
    : [];
  
  // Return a normalized scene with all required properties
  return {
    id: scene.id,
    name: scene.name || `Scene ${scene.id}`,
    type: scene.type || sceneType,
    imageUrl: scene.type === 'video' ? undefined : (scene.imageUrl || undefined),
    videoUrl: scene.type === 'image' ? undefined : (scene.videoUrl || undefined),
    hotspots: validatedHotspots,
    order: scene.order !== undefined ? scene.order : 0
  };
};

/**
 * Validates a tour object to ensure it has all required properties
 */
export const validateTour = (tour: Partial<TourData>): TourData => {
  if (!tour) {
    throw new Error("Tour data is null or undefined");
  }
  
  if (!tour.id) {
    throw new Error("Tour ID is required");
  }
  
  // Ensure scenes array is valid
  const scenes = Array.isArray(tour.scenes) 
    ? tour.scenes.map(scene => validateScene(scene))
    : [];
  
  // Return a normalized tour with all required properties
  return {
    id: tour.id,
    name: tour.name || "Untitled Tour",
    description: tour.description || "",
    scenes: scenes,
    createdAt: tour.createdAt || new Date().toISOString(),
    updatedAt: tour.updatedAt || new Date().toISOString(),
    isDraft: tour.isDraft !== undefined ? tour.isDraft : true,
    thumbnail: tour.thumbnail,
    type: tour.type || (scenes[0]?.type || 'image')
  };
};