// utils/blob-utils.ts

/**
 * Converts a Blob to a Base64 string for storage
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Converts a Base64 string back to a Blob
   */
  export function base64ToBlob(base64: string, mimeType = 'audio/webm'): Blob {
    try {
      // Extract the data part from the data URL
      const parts = base64.split(',');
      if (parts.length !== 2) {
        throw new Error('Invalid Base64 format');
      }
      
      // Get the MIME type from the data URL if available
      if (parts[0].includes('data:') && parts[0].includes(';base64')) {
        const extractedMimeType = parts[0].replace('data:', '').replace(';base64', '');
        if (extractedMimeType) {
          mimeType = extractedMimeType;
        }
      }
      
      const byteString = atob(parts[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      return new Blob([ab], { type: mimeType });
    } catch (error) {
      console.error('Error converting Base64 to Blob:', error);
      // Return an empty Blob as fallback
      return new Blob([], { type: mimeType });
    }
  }
  
  /**
   * Checks if a value is a Base64-encoded string
   */
  export function isBase64String(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.startsWith('data:audio') || value.startsWith('data:application/octet-stream');
  }
  
  /**
   * Safely creates an object URL from a Blob or Base64 string
   */
  export function createSafeObjectURL(value: Blob | string | null | undefined): string | null {
    if (!value) return null;
    
    try {
      // If it's already a Blob, create URL directly
      if (value instanceof Blob) {
        return URL.createObjectURL(value);
      }
      
      // If it's a Base64 string, convert to Blob first
      if (isBase64String(value)) {
        const blob = base64ToBlob(value);
        return URL.createObjectURL(blob);
      }
      
      // Unknown format
      console.error('Invalid value for createSafeObjectURL:', value);
      return null;
    } catch (error) {
      console.error('Error creating object URL:', error);
      return null;
    }
  }