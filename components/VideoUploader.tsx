"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useS3TourUpload } from "@/hooks/useS3TourUpload"

interface VideoUploaderProps {
  onUpload: (url: string) => void
}

export default function VideoUploader({ onUpload }: VideoUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    uploadTourVideo, 
    uploadProgress, 
    isUploading, 
    uploadError 
  } = useS3TourUpload()

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setError("Please upload a video file")
        return
      }

      if (file.size > 100 * 1024 * 1024) {
        setError("Video size should be less than 100MB")
        return
      }

      setError(null)

      try {
        // Upload to S3 rather than creating a temporary URL
        const url = await uploadTourVideo(file)
        
        if (url) {
          onUpload(url)
        } else {
          throw new Error("Failed to upload video")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process video")
      }
    },
    [onUpload, uploadTourVideo]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  // Use uploadError from the hook if available
  const displayError = uploadError || error

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div
        className={`w-full max-w-2xl aspect-video flex flex-col items-center justify-center border-4 border-dashed rounded-lg p-8 transition-colors ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-4 w-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Uploading 360° video...</p>
            <Progress value={uploadProgress} className="w-full h-2" />
            <p className="text-sm text-gray-500">{Math.round(uploadProgress)}%</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-lg text-center">Drag and drop a 360° video here, or</p>
            <Button onClick={() => document.getElementById("videoInput")?.click()}>Select File</Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Supported formats: MP4, WebM (max 100MB)
            </p>
          </>
        )}
        <input
          id="videoInput"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />
      </div>
      {displayError && (
        <Alert variant="destructive" className="mt-4 max-w-2xl">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}