// Update DragIndicator.tsx:

import React, { useEffect, useState } from 'react';

interface DragIndicatorProps {
  isVisible: boolean;
  position: { x: number; y: number };
}

const DragIndicator: React.FC<DragIndicatorProps> = ({ isVisible, position }) => {
  const [isWithinPanorama, setIsWithinPanorama] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      // Check if current position is within panorama container
      const panoramaContainer = document.querySelector('.panorama-container');
      if (panoramaContainer) {
        const containerRect = panoramaContainer.getBoundingClientRect();
        const isWithin = (
          position.x >= containerRect.left && 
          position.x <= containerRect.right && 
          position.y >= containerRect.top && 
          position.y <= containerRect.bottom
        );
        setIsWithinPanorama(isWithin);
      } else {
        setIsWithinPanorama(false);
      }
    } else {
      setIsWithinPanorama(false);
    }
  }, [isVisible, position]);

  if (!isVisible || !isWithinPanorama) return null;

  return (
    <div 
      className="fixed z-50 pointer-events-none"
      style={{
        top: position.y - 12,
        left: position.x - 12,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-400 bg-opacity-20 animate-pulse"></div>
    </div>
  );
};

export default DragIndicator;