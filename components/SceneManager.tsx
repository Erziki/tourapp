"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SceneData } from "../app/(protected)/editor/page"
import ImageUploader from "./ImageUploader"
import VideoUploader from "./VideoUploader"
import { Pencil, X, Check, GripVertical, Video, Image as ImageIcon } from "lucide-react"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import Image from "next/image"

interface SceneManagerProps {
  scenes: SceneData[]
  currentSceneId: number | null
  onAddScene: (name: string, type: 'image' | 'video', url: string) => void
  onUpdateScene: (id: number, data: Partial<SceneData>) => void
  onDeleteScene: (id: number) => void
  onSelectScene: (id: number) => void
  onReorderScenes: (scenes: SceneData[]) => void
}

export default function SceneManager({
  scenes,
  currentSceneId,
  onAddScene,
  onUpdateScene,
  onDeleteScene,
  onSelectScene,
  onReorderScenes,
}: SceneManagerProps) {
  const [newSceneName, setNewSceneName] = useState("")
  const [newSceneType, setNewSceneType] = useState<'image' | 'video'>('image')
  const [showUploader, setShowUploader] = useState(false)
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null)
  const [editingSceneName, setEditingSceneName] = useState("")
  const [editingSceneType, setEditingSceneType] = useState<'image' | 'video'>('image')

  const handleAddScene = () => {
    if (newSceneName.trim()) {
      setShowUploader(true)
    }
  }

  const handleFileUpload = (url: string) => {
    onAddScene(newSceneName.trim(), newSceneType, url)
    setNewSceneName("")
    setNewSceneType('image')
    setShowUploader(false)
  }

  const startEditing = (scene: SceneData) => {
    setEditingSceneId(scene.id)
    setEditingSceneName(scene.name)
    setEditingSceneType(scene.type)
  }

  const cancelEditing = () => {
    setEditingSceneId(null)
    setEditingSceneName("")
    setEditingSceneType('image')
  }

  const saveEditing = (scene: SceneData) => {
    if (editingSceneName.trim() !== scene.name || editingSceneType !== scene.type) {
      onUpdateScene(scene.id, { 
        name: editingSceneName.trim(),
        type: editingSceneType
      })
    }
    setEditingSceneId(null)
    setEditingSceneName("")
    setEditingSceneType('image')
  }

  const handleEditType = (scene: SceneData, type: 'image' | 'video') => {
    if (type !== scene.type) {
      onUpdateScene(scene.id, { type })
    }
  }

  const getThumbnailUrl = (scene: SceneData) => {
    if (scene.type === 'video') {
      return scene.videoUrl ? scene.videoUrl : '/placeholder.svg'
    }
    return scene.imageUrl || '/placeholder.svg'
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Scenes</h2>
      <Reorder.Group axis="y" values={scenes} onReorder={onReorderScenes} className="space-y-2">
        <AnimatePresence>
          {scenes.map((scene) => (
            <Reorder.Item key={scene.id} value={scene}>
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 ${
                  currentSceneId === scene.id ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
                }`}
                style={{ height: "120px" }}
              >
                {/* Scene Preview */}
                <div className="relative w-full h-full bg-gray-200 dark:bg-gray-700">
                  {scene.type === 'video' ? (
                    <video 
                      src={scene.videoUrl} 
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      onMouseOver={(e) => e.currentTarget.play()}
                      onMouseOut={(e) => {
                        e.currentTarget.pause()
                        e.currentTarget.currentTime = 0
                      }}
                    />
                  ) : (
                    <Image 
                      src={getThumbnailUrl(scene)} 
                      alt={scene.name} 
                      layout="fill" 
                      objectFit="cover"
                      priority
                    />
                  )}
                </div>

                {/* Type Indicator */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                  {scene.type === 'video' ? (
                    <Video className="h-4 w-4 text-white" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-white" />
                  )}
                </div>

                {/* Scene Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                  <div className="flex items-center justify-between">
                    {/* Drag Handle */}
                    <div {...(scene as any).drag} className="cursor-move">
                      <GripVertical className="h-4 w-4 text-white" />
                    </div>

                    {/* Scene Name */}
                    {editingSceneId === scene.id ? (
                      <div className="flex-grow flex items-center gap-2 mx-2">
                        <Input
                          type="text"
                          value={editingSceneName}
                          onChange={(e) => setEditingSceneName(e.target.value)}
                          className="h-6 text-sm bg-transparent text-white border-gray-500"
                        />
                        <Select 
                          value={editingSceneType} 
                          onValueChange={(value: 'image' | 'video') => setEditingSceneType(value)}
                        >
                          <SelectTrigger className="h-6 text-sm bg-transparent text-white border-gray-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectItem value="image" className="text-gray-900 dark:text-white">Image</SelectItem>
                            <SelectItem value="video" className="text-gray-900 dark:text-white">Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => onSelectScene(scene.id)}
                        className="flex-grow h-6 text-sm text-white hover:text-white hover:bg-transparent"
                      >
                        {scene.name}
                      </Button>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center">
                      {editingSceneId === scene.id ? (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6" 
                            onClick={() => {
                              saveEditing(scene)
                              handleEditType(scene, editingSceneType)
                            }}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}>
                            <X className="h-3 w-3 text-white" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6" 
                            onClick={() => {
                              startEditing(scene)
                              setEditingSceneType(scene.type)
                            }}
                          >
                            <Pencil className="h-3 w-3 text-white" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => onDeleteScene(scene.id)}
                          >
                            <X className="h-3 w-3 text-white" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add New Scene Form */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="text"
            placeholder="New scene name"
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
          <Select 
            value={newSceneType} 
            onValueChange={(value: 'image' | 'video') => setNewSceneType(value)}
          >
            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectItem value="image" className="text-gray-900 dark:text-white">Image</SelectItem>
              <SelectItem value="video" className="text-gray-900 dark:text-white">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleAddScene} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add Scene
        </Button>
      </div>

      {/* File Uploader */}
      {showUploader && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Upload {newSceneType === 'video' ? '360° Video' : '360° Image'}
          </h3>
          {newSceneType === 'video' ? (
            <VideoUploader onUpload={handleFileUpload} />
          ) : (
            <ImageUploader onUpload={handleFileUpload} />
          )}
        </div>
      )}
    </div>
  )
}