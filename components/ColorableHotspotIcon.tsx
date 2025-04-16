// components/ColorableHotspotIcon.tsx
import React from 'react'
import Image from 'next/image'

interface ColorableHotspotIconProps {
  iconType: string
  color?: string
  size?: number
  className?: string
}

export default function ColorableHotspotIcon({
  iconType,
  color = '#000000',
  size = 24,
  className = '',
}: ColorableHotspotIconProps) {
  // Source for the icon
  const iconSrc = `/icons/${iconType.toLowerCase()}.png`
  
  // Convert hex color to RGB for CSS filter
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  
  // Create CSS filter
  const cssFilter = `brightness(0) saturate(100%) invert(1) sepia(1) saturate(0) hue-rotate(0deg) brightness(${(r + g + b) / 3}) sepia(100%) saturate(10000%) hue-rotate(${Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI)}deg)`;

  return (
    <div 
      className={`relative ${className}`} 
      style={{ 
        width: size, 
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Image
        src={iconSrc}
        alt={iconType}
        width={size}
        height={size}
        style={{ 
          filter: cssFilter,
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  )
}