// utils/analytics-utils.ts
import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3_BUCKET_NAME } from '@/lib/aws/s3-config';
import { createAuthenticatedS3Client } from '@/lib/auth/cognito-identity-utils';
import { findUserIdForTour } from './tour-utils';

interface VisitData {
  tourId: string;
  timestamp: string;
  country: string;
  city: string;
  device: string;
  isEmbed: boolean;
  referrer?: string;
  ownerId?: string;
}

interface TourAnalytics {
  tourId: string;
  totalVisits: number;
  uniqueVisitors: number;
  visitsPerCountry: Record<string, number>;
  visitsPerDay: Record<string, number>;
  devicesUsed: Record<string, number>;
  embedVisits: number;
  embedsPerDomain: Record<string, number>;
  embedsActive: boolean;
}

/**
 * Fetches all embed analytics for a specific tour from S3
 */
export async function fetchTourEmbedAnalytics(tourId: string, userId?: string): Promise<TourAnalytics> {
  try {
    // If userId is not provided, try to find it
    if (!userId) {
      userId = await findUserIdForTour(tourId);
      
      if (!userId) {
        console.error(`Cannot find user ID for tour: ${tourId}`);
        // Return empty analytics
        return {
          tourId,
          totalVisits: 0,
          uniqueVisitors: 0,
          visitsPerCountry: {},
          visitsPerDay: {},
          devicesUsed: {},
          embedVisits: 0,
          embedsPerDomain: {},
          embedsActive: false
        };
      }
    }
    
    // Get an authenticated S3 client
    const s3Client = await createAuthenticatedS3Client();
    
    // User-specific path
    const prefix = `users/${userId}/analytics/tours/${tourId}/visits/`;
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: prefix
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      // No visits found, return empty analytics
      return {
        tourId,
        totalVisits: 0,
        uniqueVisitors: 0,
        visitsPerCountry: {},
        visitsPerDay: {},
        devicesUsed: {},
        embedVisits: 0,
        embedsPerDomain: {},
        embedsActive: false
      };
    }

    // Collect all visits
    const visits: VisitData[] = [];
    
    // Process each visit file
    for (const item of response.Contents) {
      if (item.Key) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: item.Key
          });
          
          const visitObject = await s3Client.send(getCommand);
          
          if (visitObject.Body) {
            const bodyContents = await visitObject.Body.transformToString();
            const visit = JSON.parse(bodyContents) as VisitData;
            
            // Only include embed visits
            if (visit.isEmbed) {
              visits.push(visit);
            }
          }
        } catch (error) {
          console.error(`Error reading visit object ${item.Key}:`, error);
          // Continue with other visits
        }
      }
    }

    // Calculate analytics
    const analytics: TourAnalytics = {
      tourId,
      totalVisits: visits.length,
      uniqueVisitors: new Set(visits.map(v => v.country + v.city + v.device)).size, // Approximate unique visitors
      visitsPerCountry: {},
      visitsPerDay: {},
      devicesUsed: {},
      embedVisits: visits.length,
      embedsPerDomain: {},
      embedsActive: visits.length > 0
    };

    // Process visits to populate analytics fields
    visits.forEach(visit => {
      // Country count
      analytics.visitsPerCountry[visit.country] = (analytics.visitsPerCountry[visit.country] || 0) + 1;
      
      // Daily count
      const dateKey = new Date(visit.timestamp).toISOString().split('T')[0];
      analytics.visitsPerDay[dateKey] = (analytics.visitsPerDay[dateKey] || 0) + 1;
      
      // Device count
      analytics.devicesUsed[visit.device] = (analytics.devicesUsed[visit.device] || 0) + 1;
      
      // Referrer domain count
      const referrer = visit.referrer || 'direct';
      analytics.embedsPerDomain[referrer] = (analytics.embedsPerDomain[referrer] || 0) + 1;
    });

    return analytics;
  } catch (error) {
    console.error('Error fetching tour analytics:', error);
    // Return empty analytics on error
    return {
      tourId,
      totalVisits: 0,
      uniqueVisitors: 0,
      visitsPerCountry: {},
      visitsPerDay: {},
      devicesUsed: {},
      embedVisits: 0,
      embedsPerDomain: {},
      embedsActive: false
    };
  }
}

/**
 * Fetches analytics data for all tours owned by a specific user
 */
export async function fetchUserToursEmbedAnalytics(userId: string): Promise<Record<string, TourAnalytics>> {
  try {
    // Get an authenticated S3 client
    const s3Client = await createAuthenticatedS3Client();
    
    // List all tours in the user's directory
    const prefix = `users/${userId}/tours/`;
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: prefix
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return {};
    }

    // Extract tour IDs from filenames
    const tourIds = response.Contents
      .map(item => {
        const match = item.Key?.match(/users\/[^\/]+\/tours\/([^\/]+)\.json$/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    // Fetch analytics for each tour
    const analytics: Record<string, TourAnalytics> = {};
    
    await Promise.all(
      tourIds.map(async (tourId) => {
        try {
          const tourAnalytics = await fetchTourEmbedAnalytics(tourId, userId);
          if (tourAnalytics.tourId) {
            analytics[tourId] = tourAnalytics;
          }
        } catch (error) {
          console.error(`Error fetching analytics for tour ${tourId}:`, error);
        }
      })
    );

    return analytics;
  } catch (error) {
    console.error('Error fetching user tours analytics:', error);
    return {};
  }
}

/**
 * Fetches analytics data for all tours (admin function)
 */
export async function fetchAllToursEmbedAnalytics(): Promise<Record<string, TourAnalytics>> {
  try {
    // Get an authenticated S3 client
    const s3Client = await createAuthenticatedS3Client();
    
    // List all user directories
    const prefix = 'users/';
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/'
    });

    const response = await s3Client.send(command);
    
    if (!response.CommonPrefixes || response.CommonPrefixes.length === 0) {
      return {};
    }

    // Extract user IDs from directories
    const userIds = response.CommonPrefixes
      .map(prefix => prefix.Prefix?.split('/')[1])
      .filter(Boolean) as string[];

    // Fetch analytics for each user's tours
    const analytics: Record<string, TourAnalytics> = {};
    
    for (const userId of userIds) {
      try {
        const userAnalytics = await fetchUserToursEmbedAnalytics(userId);
        Object.assign(analytics, userAnalytics);
      } catch (error) {
        console.error(`Error fetching analytics for user ${userId}:`, error);
      }
    }

    return analytics;
  } catch (error) {
    console.error('Error fetching all tours analytics:', error);
    return {};
  }
}