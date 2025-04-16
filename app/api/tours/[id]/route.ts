import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '@/lib/aws/s3-config';
import type { TourData } from '@/components/VirtualTourEditor';
import { findUserIdForTour } from '@/utils/tour-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const isEmbed = request.nextUrl.searchParams.get('embed') === 'true';

    if (!tourId) {
      return NextResponse.json(
        { error: 'Tour ID is required' },
        { status: 400 }
      );
    }

    // Find which user owns this tour
    const userId = await findUserIdForTour(tourId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    // For embeds, check if the tour is a draft
    if (isEmbed) {
      const isDraft = await isTourDraft(userId, tourId);
      if (isDraft) {
        return NextResponse.json(
          { error: 'This tour is not published and cannot be embedded' },
          { status: 403 }
        );
      }
    }

    // Get the tour data from S3
    const key = `users/${userId}/tours/${tourId}.json`;
    
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json(
        { error: 'Tour data not found' },
        { status: 404 }
      );
    }

    // Parse the tour data
    const streamReader = response.Body.transformToWebStream();
    const reader = streamReader.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks);
    const tourData: TourData = JSON.parse(buffer.toString());

    // Update embed analytics metadata log
    if (isEmbed) {
      console.log(`Tour ${tourId} was embedded - owner: ${userId}`);
    }

    // Create a response with the tour data
    const nextResponse = NextResponse.json(tourData);
    
    // Add the owner ID to the response headers for embed visits
    // This will be used by the embed page to attribute analytics correctly
    if (isEmbed) {
      nextResponse.headers.set('X-Tour-Owner-Id', userId);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Error fetching tour:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tour' },
      { status: 500 }
    );
  }
}

// Helper to check if a tour is a draft
async function isTourDraft(userId: string, tourId: string): Promise<boolean> {
  try {
    const key = `users/${userId}/tours/${tourId}.json`;
    
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return true; // Assume it's a draft if we can't read it
    }
    
    // Read the tour data
    const streamReader = response.Body.transformToWebStream();
    const reader = streamReader.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks);
    const tourData: TourData = JSON.parse(buffer.toString());
    
    // Check if it's a draft
    return tourData.isDraft === true;
  } catch (error) {
    console.error('Error checking if tour is draft:', error);
    return true; // Assume it's a draft if we can't check
  }
}