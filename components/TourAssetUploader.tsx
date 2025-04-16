// components/TourAssetUploader.tsx
"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Image, FileVideo, FileAudio, FilePlus, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useS3TourUpload } from "@/hooks/useS3TourUpload"
import { toast } from "sonner"

interface TourAssetUploaderProps {
  onAssetUploaded: (url: string, type: 'image' | 'video' | 'audio' | 'pdf') => void
  acceptedTypes?: Array<'image' | 'video' | 'audio' | 'pdf'>
  buttonText?: string
}

export default function TourAssetUploader({
  onAssetUploaded,
  acceptedTypes = ['image', 'video', 'audio', 'pdf'],
  buttonText = "Upload Asset"
}: TourAssetUploaderProps) {
  const { 
    uploadTourImage, 
    uploadTourVideo, 
    uploadTourAudio, 
    uploadTourPDF, 
    uploadProgress,
    isUploading 
  } = useS3TourUpload()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'pdf' | null>(null)

  const getAcceptString = () => {
    const acceptMap = {
      image: 'image/*',
      video: 'video/*',
      audio: 'audio/*',
      pdf: 'application/pdf'
    }
    
    return acceptedTypes.map(type => acceptMap[type]).join(',')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Determine file type
    let type: 'image' | 'video' | 'audio' | 'pdf'
    if (file.type.startsWith('image/')) {
      type = 'image'
    } else if (file.type.startsWith('video/')) {
      type = 'video'
    } else if (file.type.startsWith('audio/')) {
      type = 'audio'
    } else if (file.type === 'application/pdf') {
      type = 'pdf'
    } else {
      toast.error('Unsupported file type')
      return
    }
    
    setFileType(type)
    
    let url: string | null = null
    
    // Upload based on file type
    switch (type) {
      case 'image':
        url = await uploadTourImage(file)
        break
      case 'video':
        url = await uploadTourVideo(file)
        break
      case 'audio':
        url = await uploadTourAudio(file)
        break
      case 'pdf':
        url = await uploadTourPDF(file)
        break
    }
    
    if (url) {
      onAssetUploaded(url, type)
      toast.success(`${type} uploaded successfully`)
    }
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    setFileType(null)
  }

  const getTypeIcon = () => {
    switch (fileType) {
      case 'image':
        return <Image className="mr-2 h-4 w-4" />
      case 'video':
        return <FileVideo className="mr-2 h-4 w-4" />
      case 'audio':
        return <FileAudio className="mr-2 h-4 w-4" />
      case 'pdf':
        return <FilePlus className="mr-2 h-4 w-4" />
      default:
        return <Upload className="mr-2 h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={getAcceptString()}
        className="hidden"
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        variant="outline"
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            {getTypeIcon()}
            {buttonText}
          </>
        )}
      </Button>
      
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-gray-500 text-center">
            {uploadProgress.toFixed(0)}% uploaded
          </p>
        </div>
      )}
    </div>
  )
}