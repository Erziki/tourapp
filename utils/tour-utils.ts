// utils/tour-utils.ts
import { ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { S3_BUCKET_NAME } from '@/lib/aws/s3-config';
import { createAuthenticatedS3Client } from '@/lib/auth/cognito-identity-utils';

/**
 * Find the user ID that owns a specific tour
 * @param tourId The ID of the tour
 * @returns The user ID that owns the tour, or null if not found
 */
export async function findUserIdForTour(tourId: string): Promise<string | null> {
  try {
    // Get an authenticated S3 client
    const s3Client = await createAuthenticatedS3Client();
    
    // List all user directories
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: 'users/',
      Delimiter: '/'
    });

    const response = await s3Client.send(listCommand);
    
    // CommonPrefixes will include all user directories
    if (!response.CommonPrefixes || response.CommonPrefixes.length === 0) {
      return null;
    }

    // For each user, check if they have the tour
    for (const prefix of response.CommonPrefixes) {
      if (!prefix.Prefix) continue;
      
      // Extract the user ID from the prefix (users/USER_ID/)
      const userId = prefix.Prefix.split('/')[1];
      if (!userId) continue;

      // Check if this user has the tour
      const tourKey = `users/${userId}/tours/${tourId}.json`;
      
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: tourKey
        });
        
        await s3Client.send(headCommand);
        
        // If we get here, the tour exists for this user
        return userId;
      } catch (err) {
        // Tour not found for this user, continue checking others
        continue;
      }
    }

    // If we checked all users and didn't find the tour
    return null;
  } catch (error) {
    console.error('Error finding user for tour:', error);
    return null;
  }
}