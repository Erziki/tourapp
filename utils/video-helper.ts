// utils/video-helper.ts

/**
 * Checks if a URL is likely an S3 URL
 */
export function isS3VideoUrl(url: string): boolean {
    return url.includes('amazonaws.com') || url.includes('s3.') || url.includes('/media/videos/');
  }
  
  /**
   * Handles errors for video elements
   */
  export function setupVideoErrorHandling(videoElement: HTMLVideoElement, onError: (message: string) => void) {
    videoElement.addEventListener('error', (e) => {
      console.error('Video error:', videoElement.error);
      
      let errorMessage = 'An error occurred loading the video';
      
      if (videoElement.error) {
        switch (videoElement.error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMessage = 'Video playback aborted';
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage = 'Network error occurred while loading the video';
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = 'Error decoding the video';
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage = 'Video format not supported';
            break;
          default:
            errorMessage = `Error loading video: ${videoElement.error.message}`;
        }
      }
      
      onError(errorMessage);
    });
  }
  
  /**
   * Creates a CORS-friendly URL for video sources
   * Handles both local object URLs and S3 URLs
   */
  export function createCorsFriendlyVideoUrl(sourceUrl: string): string {
    // If it's an Object URL (starts with blob:) just return it
    if (sourceUrl.startsWith('blob:')) {
      return sourceUrl;
    }
    
    // If it's an S3 URL, add CORS parameter if needed
    if (isS3VideoUrl(sourceUrl)) {
      const url = new URL(sourceUrl);
      
      // Add any required parameters for S3 access
      // e.g., url.searchParams.append('response-content-disposition', 'inline');
      
      return url.toString();
    }
    
    // For all other URLs, just return as is
    return sourceUrl;
  }
  
  /**
   * Preloads video metadata to check if it's valid
   */
  export function preloadVideoMetadata(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      
      const handleSuccess = () => {
        tempVideo.removeEventListener('loadedmetadata', handleSuccess);
        tempVideo.removeEventListener('error', handleError);
        resolve(true);
      };
      
      const handleError = () => {
        tempVideo.removeEventListener('loadedmetadata', handleSuccess);
        tempVideo.removeEventListener('error', handleError);
        resolve(false);
      };
      
      tempVideo.addEventListener('loadedmetadata', handleSuccess);
      tempVideo.addEventListener('error', handleError);
      
      tempVideo.src = url;
    });
  }