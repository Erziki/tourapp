// components/HotspotEditor.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Info,
  Image as ImageIcon,
  FileText,
  Link,
  Link2,
  Mic,
  FileAudio,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Volume2,
  Trash2,
  Upload,
  AlertTriangle,
  Youtube,
  StopCircle,
  RefreshCw,
  Loader2
} from "lucide-react"
import { HotspotData, SceneData } from "./VirtualTourEditor"
import { Slider } from "@/components/ui/slider"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { useS3TourUpload } from "@/hooks/useS3TourUpload"
import { toast } from "sonner"
import ColorableHotspotIcon from "./ColorableHotspotIcon" // or adjust the path if needed

interface HotspotEditorProps {
  hotspot: HotspotData
  onUpdate: (data: Partial<HotspotData>) => void
  onDelete: () => void
  scenes: SceneData[]
}

export default function HotspotEditor({ hotspot, onUpdate, onDelete, scenes }: HotspotEditorProps) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState(hotspot.videoUrl || "")
  const [imageUrl, setImageUrl] = useState(hotspot.imageUrl || "")
  const [videoInputMethod, setVideoInputMethod] = useState<'upload' | 'url'>(hotspot.videoUrl?.includes('youtube') || hotspot.videoUrl?.includes('youtu.be') ? 'url' : 'upload')
  const [imageInputMethod, setImageInputMethod] = useState<'upload' | 'url'>(hotspot.imageUrl?.startsWith('http') ? 'url' : 'upload')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedColor, setSelectedColor] = useState(hotspot.style?.color || "#000000");
  
  // S3 upload hook
  const { 
    uploadTourImage, 
    uploadTourVideo, 
    uploadTourAudio, 
    uploadProgress: s3UploadProgress, 
    isUploading: isS3Uploading 
  } = useS3TourUpload()
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  
  // TTS preview states
  const [isTtsPlaying, setIsTtsPlaying] = useState(false)
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onUpdate({ style: { ...hotspot.style, color } });
  };
  
  // Track upload progress from S3 hook
  useEffect(() => {
    if (isS3Uploading) {
      setUploadProgress(s3UploadProgress)
      setIsUploading(true)
    } else if (s3UploadProgress === 100) {
      // Reset progress after upload completes
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 500)
    }
  }, [isS3Uploading, s3UploadProgress])

  // Pre-defined color options
  const colorOptions = [
    "#000000", // black
    "#FF0000", // Red
    "#FF9800", // Orange
    "#FFC107", // Amber
    "#FFEB3B", // Yellow
    "#8BC34A", // Light Green
    "#4CAF50", // Green
    "#009688", // Teal
    "#00BCD4", // Cyan
    "#03A9F4", // Light Blue
    "#2196F3", // Blue
    "#3F51B5", // Indigo
    "#673AB7", // Deep Purple
    "#9C27B0", // Purple
    "#E91E63"  // Pink
  ]

  // Initialize TTS audio element
  useEffect(() => {
    if (ttsAudioRef.current) return;
    
    ttsAudioRef.current = new Audio();
    ttsAudioRef.current.onended = () => {
      setIsTtsPlaying(false);
    };
    
    return () => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
    };
  }, []);

  // Create blob URL from voice recording if available
  useEffect(() => {
    if (hotspot.voiceRecording && !audioPreviewUrl) {
      const url = URL.createObjectURL(hotspot.voiceRecording);
      setAudioPreviewUrl(url);
      
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    }
  }, [hotspot.voiceRecording, audioPreviewUrl]);

  // Clean up recording resources when component unmounts
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
      }
    };
  }, [audioPreviewUrl, ttsAudioUrl]);

  // Function to handle different types of file uploads to S3
  const handleFileUpload = async (file: File, type: 'image' | 'video' | 'audio') => {
    setIsUploading(true)
    let url: string | null = null;
    
    try {
      if (type === 'image') {
        url = await uploadTourImage(file);
        if (url) {
          onUpdate({ imageUrl: url });
          setImageUrl(url);
          toast.success("Image uploaded successfully");
        }
      } else if (type === 'video') {
        url = await uploadTourVideo(file);
        if (url) {
          onUpdate({ videoUrl: url });
          setVideoUrl(url);
          toast.success("Video uploaded successfully");
        }
      } else if (type === 'audio') {
        url = await uploadTourAudio(file);
        if (url) {
          onUpdate({ audioUrl: url, audioTitle: file.name });
          toast.success("Audio uploaded successfully");
        }
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
    
    return url;
  };

  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await handleFileUpload(file, type);
  };

  const handleVideoUrlSubmit = () => {
    if (videoUrl.trim()) {
      onUpdate({ videoUrl: videoUrl.trim() });
    }
  };

  const handleImageUrlSubmit = () => {
    if (imageUrl.trim()) {
      onUpdate({ imageUrl: imageUrl.trim() });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // Create blob and save recording
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Clean up old preview URL if it exists
        if (audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
        }
        
        // Create new preview URL
        const url = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(url);
        
        // Update hotspot data
        onUpdate({ voiceRecording: audioBlob });
        
        // Stop all tracks on the stream
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setRecordingTime(0);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playTtsPreview = () => {
    if (!hotspot.ttsText) return;
    
    // This is a simplified approach - in production you would call a TTS API
    // Here we're using the browser's built-in speech synthesis
    if ('speechSynthesis' in window && hotspot.ttsText) {
      // Stop any previous playback
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(hotspot.ttsText);
      
      // Set language if specified
      if (hotspot.ttsLanguage) {
        utterance.lang = hotspot.ttsLanguage;
      }
      
      // Set voice gender if available
      if (hotspot.ttsVoiceGender) {
        const voices = window.speechSynthesis.getVoices();
        const voiceOptions = voices.filter(voice => 
          voice.lang.startsWith(hotspot.ttsLanguage || 'en') && 
          voice.name.toLowerCase().includes(hotspot.ttsVoiceGender === 'male' ? 'male' : 'female')
        );
        
        if (voiceOptions.length > 0) {
          utterance.voice = voiceOptions[0];
        }
      }
      
      // Play the speech
      setIsTtsPlaying(true);
      utterance.onend = () => setIsTtsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in your browser");
    }
  };

  const stopTtsPreview = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Pattern for YouTube URLs
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      // Return the embed URL
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    
    // If it's already an embed URL or doesn't match pattern, return as is
    return url;
  }

  const renderHotspotContent = () => {
    switch (hotspot.type) {
      case "text":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content">Text Content</Label>
              <Textarea
                id="text-content"
                value={hotspot.content || ""}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Enter text content for this hotspot..."
                className="min-h-[120px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )
        
      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label className="block mb-2">Image</Label>
              
              <div className="mb-4">
                <Tabs defaultValue={imageInputMethod} onValueChange={(value) => setImageInputMethod(value as 'upload' | 'url')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload Image</TabsTrigger>
                    <TabsTrigger value="url">Image URL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload">
                    {isUploading && (
                      <div className="mb-4">
                        <Label className="block mb-1 text-xs">Uploading...</Label>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                    
                    {hotspot.imageUrl && !hotspot.imageUrl.startsWith('http') ? (
                      <div className="relative border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                          <img src={hotspot.imageUrl} alt="Hotspot image" className="w-full h-full object-contain" />
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => {
                              onUpdate({ imageUrl: undefined })
                              setImageUrl("")
                            }}
                            className="text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                          <label className="text-xs cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleSingleFileUpload(e, 'image')}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>
                    ) : hotspot.imageUrl && hotspot.imageUrl.startsWith('http') && !hotspot.imageUrl.includes('youtube') ? (
                      <div className="relative border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                          <img src={hotspot.imageUrl} alt="Hotspot image" className="w-full h-full object-contain" />
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => {
                              onUpdate({ imageUrl: undefined })
                              setImageUrl("")
                            }}
                            className="text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                          <label className="text-xs cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleSingleFileUpload(e, 'image')}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center bg-white dark:bg-gray-700">
                        <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                          <Upload className="h-8 w-8 mb-2" />
                          <p className="mb-2">Upload an image</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                            PNG, JPG, GIF up to 10MB
                          </p>
                          <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white">
                            Select Image
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleSingleFileUpload(e, 'image')}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="url">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="image-url">Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="image-url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                          />
                          <Button onClick={handleImageUrlSubmit}>
                            Set URL
                          </Button>
                        </div>
                      </div>
                      
                      {hotspot.imageUrl && hotspot.imageUrl.startsWith('http') && (
                        <div className="relative border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                            <img src={hotspot.imageUrl} alt="Hotspot image" className="w-full h-full object-contain" />
                          </div>
                          <div className="mt-2">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => {
                                onUpdate({ imageUrl: undefined })
                                setImageUrl("")
                              }}
                              className="text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )
        
      case "video":
        return (
          <div className="space-y-4">
            <div>
              <Label className="block mb-2">Video</Label>
              
              <div className="mb-4">
                <Tabs defaultValue={videoInputMethod} onValueChange={(value) => setVideoInputMethod(value as 'upload' | 'url')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload Video</TabsTrigger>
                    <TabsTrigger value="url">YouTube URL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload">
                    {isUploading && (
                      <div className="mb-4">
                        <Label className="block mb-1 text-xs">Uploading to S3...</Label>
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">
                          Please wait while your video is being uploaded
                        </p>
                      </div>
                    )}
                    
                    {hotspot.videoUrl && !hotspot.videoUrl.includes('youtube') && !hotspot.videoUrl.includes('youtu.be') ? (
                      <div className="relative border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                          <video src={hotspot.videoUrl} controls className="w-full h-full" />
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => {
                              onUpdate({ videoUrl: undefined })
                              setVideoUrl("")
                            }}
                            className="text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                          <label className="text-xs cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept="video/*"
                              onChange={(e) => handleSingleFileUpload(e, 'video')}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center bg-white dark:bg-gray-700">
                        <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                          <Upload className="h-8 w-8 mb-2" />
                          <p className="mb-2">Upload a video</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                            MP4, WebM up to 100MB
                          </p>
                          <label className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                Select Video
                              </>
                            )}
                            <input
                              type="file"
                              className="hidden"
                              accept="video/*"
                              onChange={(e) => handleSingleFileUpload(e, 'video')}
                              disabled={isUploading}
                            />
                          </label>
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-3">
                            Videos will be uploaded to secure storage
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="url">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="video-url">YouTube URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="video-url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                          />
                          <Button onClick={handleVideoUrlSubmit}>
                            Set URL
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Paste a YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
                        </p>
                      </div>
                      
                      {hotspot.videoUrl && (hotspot.videoUrl.includes('youtube') || hotspot.videoUrl.includes('youtu.be')) && (
                        <div className="relative border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                            <iframe 
                              src={getYoutubeEmbedUrl(hotspot.videoUrl)} 
                              className="w-full h-full" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                          <div className="mt-2">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => {
                                onUpdate({ videoUrl: undefined })
                                setVideoUrl("")
                              }}
                              className="text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )
        
      case "audio":
        return (
          <div className="space-y-4">
            <div>
              <Label className="block mb-2">Upload Audio</Label>
              
              {isUploading && (
                <div className="mb-4">
                  <Label className="block mb-1 text-xs">Uploading to S3...</Label>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              {hotspot.audioUrl ? (
                <div className="relative border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-3 bg-gray-100 dark:bg-gray-800">
                      <Volume2 className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{hotspot.audioTitle || "Audio file"}</p>
                      <audio controls className="w-full mt-2">
                        <source src={hotspot.audioUrl} />
                      </audio>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => onUpdate({ audioUrl: undefined, audioTitle: undefined })}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                    <label className="text-xs cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                      Replace
                      <input
                        type="file"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => handleSingleFileUpload(e, 'audio')}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center bg-white dark:bg-gray-700">
                  <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                    <Upload className="h-8 w-8 mb-2" />
                    <p className="mb-2">Upload an audio file</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                      MP3, WAV up to 50MB
                    </p>
                    <label className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          Select Audio
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => handleSingleFileUpload(e, 'audio')}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
        
      case "scene":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="target-scene">Target Scene</Label>
              <Select
                value={hotspot.targetSceneId?.toString() || ""}
                onValueChange={(value) => onUpdate({ targetSceneId: parseInt(value) })}
              >
                <SelectTrigger id="target-scene" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select a scene" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {scenes
                    .filter((scene) => scene.id !== null)
                    .map((scene) => (
                      <SelectItem 
                        key={scene.id} 
                        value={scene.id.toString()}
                        className="text-gray-900 dark:text-white"
                      >
                        {scene.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      case "tts":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tts-text">Text to Speech</Label>
              <Textarea
                id="tts-text"
                value={hotspot.ttsText || ""}
                onChange={(e) => onUpdate({ ttsText: e.target.value })}
                placeholder="Enter text that will be spoken..."
                className="min-h-[120px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tts-language">Language</Label>
                <Select
                  value={hotspot.ttsLanguage || "en-US"}
                  onValueChange={(value) => onUpdate({ ttsLanguage: value })}
                >
                  <SelectTrigger id="tts-language" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="en-US" className="text-gray-900 dark:text-white">English (US)</SelectItem>
                    <SelectItem value="en-GB" className="text-gray-900 dark:text-white">English (UK)</SelectItem>
                    <SelectItem value="es-ES" className="text-gray-900 dark:text-white">Spanish</SelectItem>
                    <SelectItem value="fr-FR" className="text-gray-900 dark:text-white">French</SelectItem>
                    <SelectItem value="de-DE" className="text-gray-900 dark:text-white">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="tts-voice">Voice</Label>
                <Select
                  value={hotspot.ttsVoiceGender || "female"}
                  onValueChange={(value) => onUpdate({ ttsVoiceGender: value as "male" | "female" })}
                >
                  <SelectTrigger id="tts-voice" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="male" className="text-gray-900 dark:text-white">Male</SelectItem>
                    <SelectItem value="female" className="text-gray-900 dark:text-white">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="pt-2">
              {!isTtsPlaying ? (
                <Button 
                  onClick={playTtsPreview}
                  disabled={!hotspot.ttsText}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Preview Voice
                </Button>
              ) : (
                <Button 
                  onClick={stopTtsPreview}
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Playback
                </Button>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Text-to-speech is using your browser's built-in speech synthesis.
                Voice quality and options may vary between browsers.
              </p>
            </div>
          </div>
        )

      case "voice":
        return (
          <div className="space-y-4">
            <div>
              <Label className="block mb-2">Voice Recording</Label>
              
              {hotspot.voiceRecording || audioPreviewUrl ? (
                <div className="relative border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-3 bg-gray-100 dark:bg-gray-800">
                      <Mic className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Voice Recording</p>
                      <audio controls className="w-full mt-2">
                        <source src={audioPreviewUrl || ''} />
                      </audio>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        if (audioPreviewUrl) {
                          URL.revokeObjectURL(audioPreviewUrl);
                          setAudioPreviewUrl(null);
                        }
                        onUpdate({ voiceRecording: undefined });
                      }}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Recording
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startRecording()}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Record New
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center bg-white dark:bg-gray-700">
                  {isRecording ? (
                    <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                      <div className="animate-pulse bg-red-500 rounded-full p-3 mb-3">
                        <Mic className="h-6 w-6 text-white" />
                      </div>
                      <p className="mb-2">Recording in progress...</p>
                      <p className="text-lg font-mono mb-3">{formatRecordingTime(recordingTime)}</p>
                      <Progress value={recordingTime % 60 * (100/60)} className="w-48 mb-4" />
                      <Button 
                        onClick={stopRecording}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Stop Recording
                      </Button>
                    </div>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                      <Mic className="h-8 w-8 mb-2" />
                      <p className="mb-4">Record your voice message</p>
                      <Button 
                        onClick={startRecording}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                        Or upload a pre-recorded audio file
                      </p>
                      <label className="mt-2 cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Upload Audio
                        <input
                          type="file"
                          className="hidden"
                          accept="audio/*"
                          onChange={(e) => handleSingleFileUpload(e, 'audio')}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
        
      default:
        return (
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-gray-700 dark:text-gray-300">Unknown hotspot type</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select a valid type from the dropdown above</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Hotspot Basic Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="hotspot-name">Name</Label>
          <Input
            id="hotspot-name"
            value={hotspot.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Enter hotspot name"
            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
        </div>
        
        {/* Type selector */}
        <div className="space-y-1">
          <Label htmlFor="hotspot-type">Type</Label>
          <Select
            value={hotspot.type}
            onValueChange={(value) => {
              onUpdate({ 
                type: value as "text" | "image" | "video" | "audio" | "scene" | "tts" | "voice" 
              })
            }}
          >
            <SelectTrigger id="hotspot-type" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectItem value="text" className="text-gray-900 dark:text-white">Text</SelectItem>
              <SelectItem value="image" className="text-gray-900 dark:text-white">Image</SelectItem>
              <SelectItem value="video" className="text-gray-900 dark:text-white">Video</SelectItem>
              <SelectItem value="audio" className="text-gray-900 dark:text-white">Audio</SelectItem>
              <SelectItem value="scene" className="text-gray-900 dark:text-white">Scene Link</SelectItem>
              <SelectItem value="tts" className="text-gray-900 dark:text-white">Text to Speech</SelectItem>
              <SelectItem value="voice" className="text-gray-900 dark:text-white">Voice Recording</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Hotspot appearance */}
        <Accordion type="single" collapsible className="border border-gray-200 dark:border-gray-700 rounded-md">
        <AccordionItem value="appearance" className="border-none">
          <AccordionTrigger className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
            Appearance Settings
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-1">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="hotspot-color" className="block">Icon Color</Label>
                  
                  {/* Preview of the icon with the selected color */}
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">Preview:</span>
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
                      <ColorableHotspotIcon 
                        iconType={hotspot.type} 
                        color={selectedColor}
                        size={28}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-full aspect-square rounded-full border ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="hotspot-size" className="mb-2 block">
                  Size: {hotspot.style?.size || 24}px
                </Label>
                <Slider
                  id="hotspot-size"
                  defaultValue={[hotspot.style?.size || 24]}
                  min={12}
                  max={48}
                  step={2}
                  onValueChange={(value) => onUpdate({ style: { ...hotspot.style, size: value[0] } })}
                  className="py-4"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      </div>
      
      {/* Type-specific content editor */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Content Settings</h3>
        {renderHotspotContent()}
      </div>
      
      {/* Hotspot actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between">
        {!showDeleteConfirmation ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirmation(true)}
            className="text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Hotspot
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Confirm delete?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="text-white"
            >
              Yes, Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirmation(false)}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}