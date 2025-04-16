"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImageUploaderProps {
  onUpload: (url: string) => void
}

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optimizeImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > 20 * 1024 * 1024) {
        reject(new Error("Image size should be less than 20MB"))
        return
      }

      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.src = e.target?.result as string
      }

      img.onload = () => {
        const MAX_WIDTH = 4096
        const MAX_HEIGHT = 2048

        let width = img.width
        let height = img.height

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width)
          width = MAX_WIDTH
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height)
          height = MAX_HEIGHT
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)

        const optimizedDataUrl = canvas.toDataURL("image/webp", 0.85)

        canvas.width = 0
        canvas.height = 0
        img.src = ""

        resolve(optimizedDataUrl)
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }

      reader.readAsDataURL(file)
    })
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file")
        return
      }

      setLoading(true)
      setError(null)

      try {
        const optimizedDataUrl = await optimizeImage(file)
        onUpload(optimizedDataUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process image")
      } finally {
        setLoading(false)
      }
    },
    [onUpload, optimizeImage],
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
    [handleFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

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
        {loading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing panorama image...</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-lg text-center">Drag and drop a panorama image here, or</p>
            <Button onClick={() => document.getElementById("fileInput")?.click()}>Select File</Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Recommended: equirectangular panorama images up to 4096x2048 pixels (max 20MB)
            </p>
          </>
        )}
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={loading}
        />
      </div>
      {error && (
        <Alert variant="destructive" className="mt-4 max-w-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
