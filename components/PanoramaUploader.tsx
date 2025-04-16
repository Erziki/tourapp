// components/PanoramaUploader.tsx
"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, Image360, FileVideo360 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useS3TourUpload } from "@/hooks/useS3TourUpload"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"

interface PanoramaUploaderProps {
  onPanoramaUploaded: (url: string, type: 'image' | 'video') => void
}

export default function PanoramaUploader({
  onPanoramaUploaded
}: PanoramaUploaderProps) {
  const { uploadTourImage, uploadTourVideo, uploadProgress, isUploading } = useS3TourUpload()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadType, setUploadType] = useState<'image' | 'video' | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Show preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setUploadType('image')
    
    // Upload to S3
    const url = await uploadTourImage(file)
    
    // Clean up preview URL
    URL.revokeObjectURL(objectUrl)
    
    if (url) {
      onPanoramaUploaded(url, 'image')
      toast.success('Panorama image uploaded successfully')
    }
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
    
    setPreviewUrl(null)
    setUploadType(null)
  }

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Show loading state
    setUploadType('video')
    
    // Upload to S3
    const url = await uploadTourVideo(file)
    
    if (url) {
      onPanoramaUploaded(url, 'video')
      toast.success('360° video uploaded successfully')
    }
    
    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
    
    setUploadType(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <Button
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="w-full"
          >
            {isUploading && uploadType === 'image' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Image360 className="mr-2 h-4 w-4" />
                Upload 360° Image
              </>
            )}
          </Button>
        </div>
        
        <div>
          <input
            type="file"
            ref={videoInputRef}
            onChange={handleVideoChange}
            accept="video/*"
            className="hidden"
          />
          <Button
            onClick={() => videoInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="w-full"
          >
            {isUploading && uploadType === 'video' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileVideo360 className="mr-2 h-4 w-4" />
                Upload 360° Video
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-gray-500 text-center">
            {uploadProgress.toFixed(0)}% uploaded
          </p>
        </div>
      )}
      
      {previewUrl && (
        <Card>
          <CardContent className="p-2">
            <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Panorama preview" 
                className="w-full h-full object-cover"
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      <p className="text-xs text-gray-500">
        <strong>Note:</strong> For 360° panoramas, use equirectangular images for best results. Maximum file size for images is 20MB and videos is 100MB.
      </p>
    </div>
  )
}