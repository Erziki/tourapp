// lib/aws/s3-media-utils.ts
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "./s3-config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Progress tracking function type
 */
type ProgressCallback = (progress: number) => void;

/**
 * Creates a media file key for S3 storage
 */
export const getMediaPrefix = (userId: string): string => {
  return `users/${userId}/media/`;
};

/**
 * Gets content type based on file extension
 */
const getContentTypeFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const contentTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    
    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'mov': 'video/quicktime',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    
    // PDFs
    'pdf': 'application/pdf',
    
    // Defaults
    'bin': 'application/octet-stream'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
};

/**
 * Uploads a media file (image/video) to S3 and returns the URL
 * This version does not use ACLs which may be disabled on some buckets
 * Supports progress tracking and abort signal
 */
export const uploadMediaToS3 = async (
  userId: string,
  file: File,
  type: 'image' | 'video' | 'audio' | 'pdf',
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<string> => {
  try {
    // If there's an abort signal and it's already aborted, throw
    if (abortSignal?.aborted) {
      throw new DOMException('Upload aborted by user', 'AbortError');
    }
    
    // Generate a unique filename with timestamp
    const timestamp = new Date().getTime();
    const extension = file.name.split('.').pop() || 
      (type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'pdf');
    const filename = `${timestamp}-${Math.random().toString(36).substring(2, 10)}.${extension}`;
    
    // Determine subdirectory based on file type
    const subdir = `${type}s`; // images, videos, audios, pdfs
    
    const key = `${getMediaPrefix(userId)}${subdir}/${filename}`;
    
    // Read file as ArrayBuffer for upload
    const fileReader = new FileReader();
    
    // Create a promise to handle the FileReader async operation
    const readFilePromise = new Promise<ArrayBuffer>((resolve, reject) => {
      fileReader.onload = () => {
        if (fileReader.result instanceof ArrayBuffer) {
          resolve(fileReader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      fileReader.onerror = () => {
        reject(fileReader.error || new Error('Unknown error reading file'));
      };
      
      // Handle progress updates if callback provided
      if (onProgress) {
        fileReader.onprogress = (event) => {
          if (event.lengthComputable) {
            // Reading progress (0-50% of overall progress)
            const progress = (event.loaded / event.total) * 50;
            onProgress(progress);
          }
        };
      }
      
      // Start reading the file
      fileReader.readAsArrayBuffer(file);
    });
    
    // Set up abort handling
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        fileReader.abort();
      });
    }
    
    // Await the file reading
    const arrayBuffer = await readFilePromise;
    
    // Signal 50% progress after file is read
    if (onProgress) {
      onProgress(50);
    }
    
    const contentType = file.type || getContentTypeFromFileName(file.name);
    
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: contentType,
      // Add cache control for better performance
      CacheControl: 'max-age=3600',
      // Additional metadata for organization
      Metadata: {
        'user-id': userId,
        'original-filename': file.name,
        'file-type': type,
        ...(type === 'video' ? {
          'is-360-video': 'true'
        } : {})
      }
    };

    const command = new PutObjectCommand(uploadParams);
    
    // Send the command with abort signal if provided
    await s3Client.send(command, abortSignal ? { abortSignal } : undefined);
    
    // Signal 100% progress when upload is complete
    if (onProgress) {
      onProgress(100);
    }
    
    // Return the URL to the uploaded file
    return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error uploading media to S3:", error);
    throw error;
  }
};

/**
 * Generates a signed URL for reading an object in the bucket
 */
export const getSignedMediaUrl = async (
  userId: string,
  mediaPath: string,
  expiresIn: number = 43200 // 12 hours by default
): Promise<string> => {
  try {
    // Extract the key from the full S3 URL if it's provided
    let key = mediaPath;
    if (mediaPath.includes('s3.amazonaws.com')) {
      // Handle both URL formats (with or without protocol)
      if (mediaPath.includes('https://') || mediaPath.includes('http://')) {
        // Extract the path after the bucket name
        const urlParts = mediaPath.split(`${S3_BUCKET_NAME}.s3.amazonaws.com/`);
        if (urlParts.length > 1) {
          key = urlParts[1];
        } else {
          console.warn("Could not parse S3 URL correctly:", mediaPath);
        }
      } else if (mediaPath.startsWith(`${S3_BUCKET_NAME}.s3.amazonaws.com/`)) {
        key = mediaPath.substring(`${S3_BUCKET_NAME}.s3.amazonaws.com/`.length);
      }
    }

    console.log("Getting signed URL for key:", key);

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    // Generate a signed URL with the specified expiration
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    console.log("Generated signed URL:", signedUrl);
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    // Return the original URL if we can't generate a signed one
    return mediaPath;
  }
};

/**
 * Helper to determine if a URL is from our S3 bucket
 */
export const isS3Url = (url: string): boolean => {
  return url.includes(`${S3_BUCKET_NAME}.s3.amazonaws.com`);
};

/**
 * Upload base64 image data to S3
 * Supports progress tracking
 */
export const uploadBase64ImageToS3 = async (
  userId: string,
  base64Data: string,
  fileName: string = "thumbnail.jpg",
  onProgress?: ProgressCallback
): Promise<string> => {
  try {
    // Signal start of processing
    if (onProgress) {
      onProgress(10);
    }
    
    // Convert base64 to buffer
    const base64Image = base64Data.split(';base64,').pop();
    if (!base64Image) {
      throw new Error("Invalid base64 data");
    }
    const buffer = Buffer.from(base64Image, 'base64');
    
    if (onProgress) {
      onProgress(30); // Signal base64 processing is complete
    }
    
    // Determine MIME type from the base64 prefix
    let contentType = 'image/jpeg';
    if (base64Data.includes('image/png')) {
      contentType = 'image/png';
    } else if (base64Data.includes('image/gif')) {
      contentType = 'image/gif';
    }
    
    const timestamp = new Date().getTime();
    const key = `${getMediaPrefix(userId)}images/${timestamp}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Add cache control for better performance
      CacheControl: 'max-age=3600',
      // Add metadata for better organization
      Metadata: {
        'user-id': userId,
        'file-type': 'image',
        'is-thumbnail': 'true'
      }
    });

    if (onProgress) {
      onProgress(60); // Signal upload is starting
    }
    
    await s3Client.send(command);
    
    if (onProgress) {
      onProgress(100); // Signal upload is complete
    }
    
    return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error uploading base64 image to S3:", error);
    throw error;
  }
};