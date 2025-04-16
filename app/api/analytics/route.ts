// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchUserToursEmbedAnalytics } from '@/utils/analytics-utils';

export async function GET(req: NextRequest) {
  try {
    // Get the user ID from the query parameter
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Fetch analytics for all tours owned by this user
    const analytics = await fetchUserToursEmbedAnalytics(userId);
    
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching all analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}