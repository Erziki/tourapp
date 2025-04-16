// app/api/analytics/visit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '@/lib/aws/s3-config';
import { findUserIdForTour } from '@/utils/tour-utils';

interface VisitData {
  tourId: string;
  timestamp: string;
  country: string;
  city: string;
  device: string;
  isEmbed: boolean;
  referrer?: string;
  visitorId?: string;
  ownerId?: string; // Optional: if the frontend knows the owner ID
}

export async function POST(req: NextRequest) {
  console.log("➡️ /api/analytics/visit API called");
  
  try {
    // Parse request body
    let visit: VisitData;
    try {
      visit = await req.json();
      console.log("📊 Received visit data:", {
        tourId: visit.tourId,
        timestamp: visit.timestamp,
        country: visit.country,
        device: visit.device,
        isEmbed: visit.isEmbed,
        visitorId: visit.visitorId?.substring(0, 4) + '...'
      });
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    // Only process and store analytics for embed visits
    if (!visit.isEmbed) {
      console.log("⚠️ Ignoring non-embed visit");
      return NextResponse.json({ message: 'Only embed visits are tracked' }, { status: 200 });
    }
    
    // Validate required fields
    if (!visit.tourId || !visit.timestamp || !visit.country || !visit.device) {
      console.error("❌ Missing required fields:", {
        hasTourId: !!visit.tourId,
        hasTimestamp: !!visit.timestamp,
        hasCountry: !!visit.country,
        hasDevice: !!visit.device
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the tour owner ID if not provided
    let ownerId = visit.ownerId;
    if (!ownerId) {
      console.log("🔍 Looking up owner ID for tour:", visit.tourId);
      ownerId = await findUserIdForTour(visit.tourId);
      
      if (!ownerId) {
        console.error("❌ Could not find owner for tour:", visit.tourId);
        return NextResponse.json({ error: 'Tour owner not found' }, { status: 404 });
      }
      
      console.log("✅ Found tour owner:", ownerId);
    }

    // Create a unique key for this visit
    const visitorId = visit.visitorId || 'unknown';
    const visitDate = new Date(visit.timestamp).toISOString().split('T')[0];
    
    // Use a user-specific path structure
    const visitKey = `users/${ownerId}/analytics/tours/${visit.tourId}/visits/${Date.now()}-${visitorId}.json`;
    console.log("🗂️ Using S3 storage key:", visitKey);
    
    // Add indexing metadata to facilitate future querying
    const metadata = {
      'tour-id': visit.tourId,
      'user-id': ownerId,
      'visit-date': visitDate,
      'country': visit.country,
      'device': visit.device,
      'is-embed': 'true',
      'referrer': visit.referrer || 'direct',
      'visitor-id': visitorId
    };

    console.log("💾 Storing visit data in S3...");
    
    try {
      // Upload the visit data to S3
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: visitKey,
        Body: JSON.stringify({...visit, ownerId}), // Include owner ID in stored data
        ContentType: 'application/json',
        Metadata: metadata
      });

      await s3Client.send(command);
      console.log("✅ Successfully stored visit data in S3");
    } catch (s3Error) {
      console.error("❌ S3 storage error:", s3Error);
      throw s3Error;
    }
    
    // Return success response
    console.log("✅ Visit recorded successfully");
    return NextResponse.json({ message: 'Visit recorded successfully' }, { status: 200 });
  } catch (error) {
    console.error("❌ Unexpected error in analytics API:", error);
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 });
  }
}