"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"

export function useOptimizedTexture(imageUrl: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textureRef = useRef<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin("anonymous")

    const onLoad = (loadedTexture: THREE.Texture) => {
      loadedTexture.encoding = THREE.sRGBEncoding
      loadedTexture.generateMipmaps = false
      loadedTexture.minFilter = THREE.LinearFilter
      loadedTexture.magFilter = THREE.LinearFilter
      loadedTexture.needsUpdate = true

      textureRef.current = loadedTexture
      setTexture(loadedTexture)
      setError(null)
    }

    const onError = (err: ErrorEvent) => {
      console.error("Error loading texture:", err)
      setError("Failed to load panorama texture")
      setTexture(null)
    }

    loader.load(imageUrl, onLoad, undefined, onError)

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose()
        textureRef.current = null
      }
      setTexture(null)
    }
  }, [imageUrl])

  return { texture, error }
}
