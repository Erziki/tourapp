// hooks/useProfileImage.ts
"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { uploadBase64ImageToS3 } from "@/lib/aws/s3-media-utils"
import { toast } from "sonner"

interface UseProfileImageReturn {
  uploadProfileImage: (imageData: string) => Promise<string | null>
  isUploading: boolean
  uploadProgress: number
  uploadError: string | null
  resetUploadState: () => void
}

export function useProfileImage(): UseProfileImageReturn {
  const { user, isAuthenticated } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const resetUploadState = useCallback(() => {
    setIsUploading(false)
    setUploadProgress(0)
    setUploadError(null)
  }, [])

  const uploadProfileImage = useCallback(async (imageData: string): Promise<string | null> => {
    // Reset state
    resetUploadState()
    setIsUploading(true)
    
    try {
      // Validate the image data
      if (!imageData.startsWith('data:image')) {
        throw new Error('Invalid image format. Please provide a valid image.')
      }
      
      // Check if user is authenticated
      if (!isAuthenticated || !user?.attributes.sub) {
        throw new Error('You must be logged in to upload a profile image')
      }
      
      const userId = user.attributes.sub
      
      // Track upload progress
      const handleProgress = (progress: number) => {
        setUploadProgress(progress)
      }
      
      // Upload to S3 with progress tracking
      const imageUrl = await uploadBase64ImageToS3(
        userId,
        imageData,
        'profile-photo.jpg',
        handleProgress
      )
      
      // Upload complete
      setUploadProgress(100)
      
      // Show success toast
      toast.success('Profile picture uploaded successfully')
      
      return imageUrl
    } catch (error) {
      console.error('Error uploading profile image:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile image'
      setUploadError(errorMessage)
      toast.error(`Upload failed: ${errorMessage}`)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [isAuthenticated, user, resetUploadState])

  return {
    uploadProfileImage,
    isUploading,
    uploadProgress,
    uploadError,
    resetUploadState
  }
}