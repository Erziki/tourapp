// lib/aws/s3-utils.ts
import { 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command, 
  DeleteObjectCommand,
  HeadObjectCommand,
  S3ServiceException 
} from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "./s3-config";
import type { TourData } from "@/components/VirtualTourEditor";
import { validateTour } from "@/utils/validation";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry logic
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a user-specific key prefix for S3 storage
 */
export const getUserPrefix = (userId: string): string => {
  return `users/${userId}/tours/`;
};

/**
 * Uploads a tour to S3 with retry logic
 */
export const uploadTourToS3 = async (
  userId: string, 
  tour: TourData
): Promise<void> => {
  let retries = 0;
  let lastError: any = null;

  // Validate tour data before upload
  if (!tour.id) {
    throw new Error("Tour ID is missing");
  }

  if (!Array.isArray(tour.scenes)) {
    throw new Error("Tour scenes must be an array");
  }

  // Log the tour data for debugging
  console.log(`Uploading tour with ID: ${tour.id}, Scenes count: ${tour.scenes.length}`);
  
  // Add validation to ensure each scene has required properties
  tour.scenes.forEach((scene, index) => {
    if (!scene.id && scene.id !== 0) {
      console.error(`Scene at index ${index} is missing an ID`);
    }
    if (!scene.name) {
      console.error(`Scene at index ${index} is missing a name`);
    }
    if (!scene.type) {
      console.error(`Scene at index ${index} is missing a type`);
    }
  });

  // Make a deep copy of the tour to ensure we don't modify the original
  const tourToUpload = JSON.parse(JSON.stringify(tour));

  while (retries < MAX_RETRIES) {
    try {
      const key = `${getUserPrefix(userId)}${tour.id}.json`;
      
      // Log the exact data being uploaded
      console.log(`Tour data being uploaded: ${tourToUpload.scenes.length} scenes`);
      
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(tourToUpload),
        ContentType: "application/json",
        // Add metadata for better organization
        Metadata: {
          "user-id": userId,
          "tour-name": tour.name,
          "created-at": tour.createdAt,
          "updated-at": tour.updatedAt,
          "is-draft": tour.isDraft.toString(),
          "scenes-count": tour.scenes.length.toString()
        }
      });

      await s3Client.send(command);
      console.log(`Successfully uploaded tour: ${tour.id} for user: ${userId} with ${tour.scenes.length} scenes`);
      
      // Verify the upload by immediately retrieving the tour
      try {
        const verifiedTour = await getTourFromS3(userId, tour.id);
        if (verifiedTour) {
          console.log(`Verified tour: ${verifiedTour.id}, Scenes count: ${verifiedTour.scenes.length}`);
          if (verifiedTour.scenes.length !== tour.scenes.length) {
            console.error(`Scene count mismatch! Original: ${tour.scenes.length}, Stored: ${verifiedTour.scenes.length}`);
          }
        } else {
          console.error(`Could not verify uploaded tour: ${tour.id}`);
        }
      } catch (verifyError) {
        console.error(`Error verifying uploaded tour: ${tour.id}`, verifyError);
      }
      
      return;
    } catch (error) {
      lastError = error;
      console.error(`Error uploading tour (attempt ${retries + 1}):`, error);
      
      // Check if error is retriable
      if (error instanceof S3ServiceException) {
        const statusCode = error.$metadata?.httpStatusCode;
        
        // Don't retry client errors except for throttling (429)
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          break;
        }
      }
      
      retries++;
      if (retries < MAX_RETRIES) {
        // Exponential backoff
        await sleep(RETRY_DELAY * Math.pow(2, retries - 1));
      }
    }
  }
  
  // If we got here, all retries failed
  throw lastError || new Error("Failed to upload tour after multiple attempts");
};

/**
 * Retrieves a single tour from S3 with improved error handling and parsing
 */
export const getTourFromS3 = async (
  userId: string, 
  tourId: string
): Promise<TourData | null> => {
  let retries = 0;
  let lastError: any = null;

  while (retries < MAX_RETRIES) {
    try {
      const key = `${getUserPrefix(userId)}${tourId}.json`;
      console.log(`Retrieving tour with key: ${key}`);
      
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key
      });

      const response = await s3Client.send(command);
      if (!response.Body) {
        console.log(`No body found for tour: ${tourId}`);
        return null;
      }

      const stream = response.Body as any;
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const rawData = buffer.toString();
      
      try {
        const tourData = JSON.parse(rawData);
        
        // Validate the parsed tour data
        if (!tourData.id) {
          console.error(`Parsed tour is missing ID: ${rawData.substring(0, 100)}...`);
          throw new Error("Invalid tour data: missing ID");
        }
        
        // Validate scenes array
        if (!Array.isArray(tourData.scenes)) {
          console.error(`Parsed tour has invalid scenes: ${typeof tourData.scenes}`);
          // Fix missing scenes by providing an empty array
          tourData.scenes = [];
        }
        
        console.log(`Successfully retrieved tour: ${tourId} with ${tourData.scenes.length} scenes`);
        
        // Validate the tour to ensure consistent data structure
        const validatedTour = validateTour(tourData);
        
        return validatedTour;
      } catch (parseError) {
        console.error(`Error parsing tour data: ${parseError}`);
        console.error(`Raw data: ${rawData.substring(0, 200)}...`);
        throw new Error(`Failed to parse tour data: ${parseError.message}`);
      }
    } catch (error: any) {
      // If the object doesn't exist, return null instead of retrying
      if (error.name === "NoSuchKey") {
        console.log(`Tour not found: ${tourId}`);
        return null;
      }
      
      lastError = error;
      console.error(`Error getting tour ${tourId} (attempt ${retries + 1}):`, error);
      
      // Check if error is retriable
      if (error instanceof S3ServiceException) {
        const statusCode = error.$metadata?.httpStatusCode;
        
        // Don't retry client errors except for throttling (429)
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          break;
        }
      }
      
      retries++;
      if (retries < MAX_RETRIES) {
        await sleep(RETRY_DELAY * Math.pow(2, retries - 1));
      }
    }
  }
  
  // If we got here, all retries failed
  throw lastError || new Error("Failed to retrieve tour after multiple attempts");
};

/**
 * Lists all tours for a user from S3 with retry logic
 */
export const listUserToursFromS3 = async (
  userId: string
): Promise<TourData[]> => {
  let retries = 0;
  let lastError: any = null;

  while (retries < MAX_RETRIES) {
    try {
      const prefix = getUserPrefix(userId);
      const command = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix
      });

      const response = await s3Client.send(command);
      if (!response.Contents || response.Contents.length === 0) {
        return [];
      }

      const tours: TourData[] = [];
      
      // Use Promise.all with error handling for each tour
      const results = await Promise.allSettled(
        response.Contents.map(async (item) => {
          if (item.Key) {
            const tourId = item.Key.split('/').pop()?.replace('.json', '');
            if (tourId) {
              try {
                const tour = await getTourFromS3(userId, tourId);
                return tour;
              } catch (err) {
                console.error(`Error loading tour ${tourId}:`, err);
                return null;
              }
            }
          }
          return null;
        })
      );
      
      // Filter out failed loads and nulls
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          tours.push(result.value);
        }
      });

      return tours;
    } catch (error) {
      lastError = error;
      console.error(`Error listing tours (attempt ${retries + 1}):`, error);
      
      // Check if error is retriable
      if (error instanceof S3ServiceException) {
        const statusCode = error.$metadata?.httpStatusCode;
        
        // Don't retry client errors except for throttling (429)
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          break;
        }
      }
      
      retries++;
      if (retries < MAX_RETRIES) {
        await sleep(RETRY_DELAY * Math.pow(2, retries - 1));
      }
    }
  }
  
  // If we got here, all retries failed
  throw lastError || new Error("Failed to list tours after multiple attempts");
};

/**
 * Checks if a tour exists in S3
 */
export const tourExistsInS3 = async (
  userId: string, 
  tourId: string
): Promise<boolean> => {
  const key = `${getUserPrefix(userId)}${tourId}.json`;
  
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });
    
    await s3Client.send(command);
    return true; // Object exists
  } catch (error: any) {
    // If the error is NoSuchKey, the object doesn't exist
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    
    // For any other error, we should throw
    console.error(`Error checking if tour exists: ${tourId}`, error);
    throw error;
  }
};

/**
 * Deletes a tour from S3 with retry logic and verification
 */
export const deleteTourFromS3 = async (
  userId: string, 
  tourId: string
): Promise<void> => {
  let retries = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const key = `${getUserPrefix(userId)}${tourId}.json`;
  console.log(`Attempting to delete tour with key: ${key}`);

  while (retries < MAX_RETRIES) {
    try {
      // Create and execute delete command
      const deleteCommand = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key
      });

      await s3Client.send(deleteCommand);
      console.log(`Delete command executed for tour: ${tourId}`);
      
      // Verify the deletion by checking if the object still exists
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: key
        });
        
        // This will throw a NoSuchKey error if the object was successfully deleted
        await s3Client.send(headCommand);
        
        // If we get here, the object still exists which means deletion failed
        console.error(`Deletion verification failed for tour: ${tourId}. Object still exists after deletion attempt`);
        
        // Retry the deletion
        retries++;
        if (retries < MAX_RETRIES) {
          console.log(`Retrying deletion (attempt ${retries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        } else {
          throw new Error(`Failed to delete tour after ${MAX_RETRIES} attempts`);
        }
      } catch (verifyError: any) {
        // If we get NoSuchKey error, the deletion was successful
        if (verifyError.name === 'NoSuchKey' || verifyError.$metadata?.httpStatusCode === 404) {
          console.log(`Successfully deleted tour: ${tourId}`);
          return;
        } else {
          // Another error occurred during verification
          console.error(`Error verifying deletion for tour: ${tourId}`, verifyError);
          throw verifyError;
        }
      }
    } catch (error: any) {
      // Handle NoSuchKey error as success - the object didn't exist to begin with
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        console.log(`Tour ${tourId} did not exist or was already deleted`);
        return;
      }
      
      console.error(`Error deleting tour ${tourId} (attempt ${retries + 1})`, error);
      
      // Don't retry client errors except for throttling (429)
      if (error instanceof S3ServiceException) {
        const statusCode = error.$metadata?.httpStatusCode;
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          throw error; // Don't retry client errors
        }
      }
      
      retries++;
      if (retries < MAX_RETRIES) {
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retries - 1);
        console.log(`Retrying deletion in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed to delete tour after ${MAX_RETRIES} attempts: ${error.message}`);
      }
    }
  }
  
  // If we got here after all retries, throw an error
  throw new Error(`Failed to delete tour ${tourId} after multiple attempts`);
};