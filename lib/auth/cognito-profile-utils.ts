// lib/auth/cognito-profile-utils.ts
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { uploadBase64ImageToS3, isS3Url } from '@/lib/aws/s3-media-utils';
import { logDebug, logError } from '@/utils/debug';

/**
 * Updates a user's profile attributes in Cognito, including optional profile image
 * @param attributes User attributes to update
 * @param profileImage Optional base64 profile image to upload to S3
 * @returns Promise with the updated attributes
 */
export async function updateProfileWithImage(
  attributes: Record<string, string>,
  profileImage?: string | null
): Promise<Record<string, string>> {
  try {
    // Get current user attributes to get the user ID
    const currentAttributes = await fetchUserAttributes();
    const userId = currentAttributes.sub;
    
    if (!userId) {
      throw new Error('User ID not available');
    }
    
    // Final attributes to update
    const updatedAttributes = { ...attributes };
    
    // Handle profile image if provided
    if (profileImage && profileImage.startsWith('data:image')) {
      logDebug('Uploading profile image to S3...');
      
      try {
        // Upload to S3 with progress tracking
        const progressCallback = (progress: number) => {
          logDebug(`Profile image upload progress: ${progress}%`);
        };
        
        // Upload the image to S3
        const imageUrl = await uploadBase64ImageToS3(
          userId,
          profileImage,
          'profile-photo.jpg',
          progressCallback
        );
        
        // Add the image URL to the attributes
        updatedAttributes.profile_image = imageUrl;
        
        logDebug('Profile image uploaded successfully', { imageUrl });
      } catch (imgError) {
        logError('Error uploading profile image', imgError);
        // Continue with profile update even if image upload fails
      }
    } else if (profileImage === null) {
      // If explicitly set to null, remove the profile image
      updatedAttributes.profile_image = '';
    }
    
    // Update the user attributes in Cognito
    await updateUserAttributes({
      userAttributes: updatedAttributes
    });
    
    logDebug('Profile updated successfully', updatedAttributes);
    
    return updatedAttributes;
  } catch (error) {
    logError('Error updating profile', error);
    throw error;
  }
}

/**
 * Validates if a profile image is from our S3 bucket and is properly formatted
 * @param imageUrl The profile image URL to validate
 * @returns Boolean indicating if the image is valid
 */
export function isValidProfileImage(imageUrl?: string | null): boolean {
  if (!imageUrl) return false;
  
  // Check if it's a valid S3 URL or a valid data URL
  return isS3Url(imageUrl) || imageUrl.startsWith('data:image');
}

/**
 * Gets a user's profile display name based on their attributes
 * @param attributes User attributes from Cognito
 * @returns Formatted display name
 */
export function getProfileDisplayName(attributes: Record<string, string>): string {
  const firstName = attributes.given_name || '';
  const lastName = attributes.family_name || '';
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else if (attributes.email) {
    // Use email as fallback, but only show the part before @ for privacy
    return attributes.email.split('@')[0];
  } else {
    return 'User';
  }
}