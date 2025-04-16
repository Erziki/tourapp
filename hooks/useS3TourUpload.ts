// hooks/useS3TourUpload.ts
"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { uploadMediaToS3, uploadBase64ImageToS3 } from "@/lib/aws/s3-media-utils"
import { toast } from "sonner"

interface UseS3TourUploadReturn {
  uploadTourImage: (file: File) => Promise<string | null>
  uploadTourVideo: (file: File) => Promise<string | null>
  uploadTourAudio: (file: File) => Promise<string | null>
  uploadTourPDF: (file: File) => Promise<string | null>
  uploadTourThumbnail: (imageData: string) => Promise<string | null>
  uploadProgress: number
  isUploading: boolean
  uploadError: string | null
  cancelUpload: () => void
}

export function useS3TourUpload(): UseS3TourUploadReturn {
  const { user, isAuthenticated } = useAuth()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const getUserId = (): string => {
    if (!isAuthenticated || !user?.attributes.sub) {
      throw new Error("User not authenticated")
    }
    return user.attributes.sub
  }

  const cancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsUploading(false)
      setUploadProgress(0)
      toast.info("Upload canceled")
    }
  }, [abortController])

  const updateProgress = useCallback((progress: number) => {
    setUploadProgress(progress)
  }, [])

  const uploadFile = async (
    file: File, 
    type: 'image' | 'video' | 'audio' | 'pdf'
  ): Promise<string | null> => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    // Create new abort controller for this upload
    const controller = new AbortController()
    setAbortController(controller)

    try {
      // Check file size (limit to 100MB for videos, 20MB for images, 50MB for PDFs, 10MB for audio)
      const maxSizes = {
        image: 20 * 1024 * 1024,  // 20MB
        video: 100 * 1024 * 1024, // 100MB
        audio: 10 * 1024 * 1024,  // 10MB
        pdf: 50 * 1024 * 1024     // 50MB
      }

      if (file.size > maxSizes[type]) {
        throw new Error(`File is too large. Maximum size for ${type} is ${maxSizes[type] / (1024 * 1024)}MB`)
      }

      // Get user ID (will throw if not authenticated)
      const userId = getUserId()
      
      // Upload to S3 with progress tracking
      const url = await uploadMediaToS3(
        userId, 
        file, 
        type, 
        updateProgress, 
        controller.signal
      )

      setUploadProgress(100)
      
      // Show success toast with appropriate message
      toast.success(`${type === 'video' ? '360° video' : type} uploaded successfully`)
      
      return url
    } catch (error) {
      // Don't show error if it was canceled
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null
      }
      
      console.error(`Error uploading ${type}:`, error)
      const errorMessage = error instanceof Error ? error.message : `Failed to upload ${type}`;
      setUploadError(errorMessage)
      toast.error(`Upload failed: ${errorMessage}`)
      return null
    } finally {
      setIsUploading(false)
      setAbortController(null)
    }
  }

  const uploadTourImage = useCallback((file: File): Promise<string | null> => {
    return uploadFile(file, 'image')
  }, [uploadFile])

  const uploadTourVideo = useCallback((file: File): Promise<string | null> => {
    if (!file.type.includes('video')) {
      setUploadError('Invalid file type. Please upload a video file.');
      toast.error('Please upload a video file');
      return Promise.resolve(null);
    }
    
    // For video files, we need special handling to ensure they're 360° compatible
    return uploadFile(file, 'video')
  }, [uploadFile])

  const uploadTourAudio = useCallback((file: File): Promise<string | null> => {
    return uploadFile(file, 'audio')
  }, [uploadFile])

  const uploadTourPDF = useCallback((file: File): Promise<string | null> => {
    return uploadFile(file, 'pdf')
  }, [uploadFile])

  const uploadTourThumbnail = useCallback(async (imageData: string): Promise<string | null> => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      // Get user ID (will throw if not authenticated)
      const userId = getUserId()
      
      // Upload the base64 image
      const updateProgressHandler = (progress: number) => {
        setUploadProgress(progress)
      }
      
      const url = await uploadBase64ImageToS3(userId, imageData, undefined, updateProgressHandler)

      setUploadProgress(100)
      return url
    } catch (error) {
      console.error("Error uploading thumbnail:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to upload thumbnail")
      toast.error(`Thumbnail upload failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [])

  return {
    uploadTourImage,
    uploadTourVideo,
    uploadTourAudio,
    uploadTourPDF,
    uploadTourThumbnail,
    uploadProgress,
    isUploading,
    uploadError,
    cancelUpload
  }
}