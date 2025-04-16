// app/api/analytics/[tourId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchTourEmbedAnalytics } from '@/utils/analytics-utils';
import { findUserIdForTour } from '@/utils/tour-utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { tourId: string } }
) {
  const tourId = params.tourId;
  console.log(`⏳ Fetching analytics for tour: ${tourId}`);
  
  if (!tourId) {
    console.error("❌ No tour ID provided");
    return NextResponse.json({ error: 'Tour ID is required' }, { status: 400 });
  }

  try {
    // Find the user that owns this tour
    const userId = await findUserIdForTour(tourId);
    
    if (!userId) {
      console.error(`❌ Cannot find owner for tour: ${tourId}`);
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }
    
    console.log(`🔍 Found owner ${userId} for tour ${tourId}`);
    
    // Fetch analytics using the user-specific path
    const analytics = await fetchTourEmbedAnalytics(tourId, userId);
    
    console.log(`✅ Analytics processed successfully for tour: ${tourId}`);
    console.log(`📊 Total visits: ${analytics.totalVisits}, Unique visitors: ${analytics.uniqueVisitors}`);
    
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}