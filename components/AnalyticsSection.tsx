// components/AnalyticsSection.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTours } from "@/contexts/ToursContext"
import { useAuth } from "@/contexts/AuthContext"
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, RefreshCw, BarChart3, PieChart as PieChartIcon, Activity, Globe2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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

// Color palette for charts (professionally chosen colors)
const CHART_COLORS = [
  '#4361EE', '#3F8EFC', '#4CC9F0', '#4895EF', '#560BAD', 
  '#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'
];

// Business-friendly domain name mapping
const getDomainDisplayName = (domain: string) => {
  if (domain === 'direct') return 'Direct Access';
  return domain;
};

export default function AnalyticsSection() {
  const { tours } = useTours()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<Record<string, TourAnalytics>>({})
  const [selectedTourId, setSelectedTourId] = useState<string | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCharts, setIsLoadingCharts] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // State for individual section loading
  const [loadingState, setLoadingState] = useState({
    summary: true,
    dailyVisits: true,
    referrers: true,
    geography: true,
    devices: true
  });

  // Cache analytics data with a timestamp
  const [analyticsCache, setAnalyticsCache] = useState<{
    data: Record<string, TourAnalytics>,
    timestamp: number
  } | null>(null);

  // Load core analytics data with staggered loading for better UX
  useEffect(() => {
    if (user?.attributes.sub) {
      // Check if we have cached data less than 5 minutes old
      if (analyticsCache && (Date.now() - analyticsCache.timestamp < 5 * 60 * 1000)) {
        setAnalytics(analyticsCache.data);
        setIsLoading(false);
        setLastUpdated(new Date(analyticsCache.timestamp));
        return;
      }
      
      // Otherwise load fresh data
      loadSummaryData();
    }
  }, [user]);

  // Load summary analytics data first for faster initial display
  const loadSummaryData = async () => {
    setIsLoading(true);
    setLoadingState(prev => ({ ...prev, summary: true }));
    
    try {
      const userId = user?.attributes.sub;
      if (!userId) {
        console.error("User ID not available");
        setIsLoading(false);
        return;
      }
      
      // First load summary data (fast)
      const response = await fetch(`/api/analytics?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error loading analytics: ${response.statusText}`);
      }
      
      const userAnalytics = await response.json();
      setAnalytics(userAnalytics);
      
      // Cache the data with timestamp
      setAnalyticsCache({
        data: userAnalytics,
        timestamp: Date.now()
      });
      
      setLastUpdated(new Date());
      setLoadingState(prev => ({ ...prev, summary: false }));
      setIsLoading(false);
      
      // Then load detailed chart data
      await loadDetailedChartData();
    } catch (error) {
      console.error("Error loading analytics:", error);
      setIsLoading(false);
      setLoadingState(prev => ({ ...prev, summary: false }));
    }
  };

  // Load detailed chart data after summary is displayed
  const loadDetailedChartData = async () => {
    setIsLoadingCharts(true);
    
    // Simulate loading chart data with staggered completion
    // In a real implementation, these would be separate API calls for each chart type
    setTimeout(() => setLoadingState(prev => ({ ...prev, dailyVisits: false })), 300);
    setTimeout(() => setLoadingState(prev => ({ ...prev, referrers: false })), 600);
    setTimeout(() => setLoadingState(prev => ({ ...prev, geography: false })), 900);
    setTimeout(() => setLoadingState(prev => ({ ...prev, devices: false })), 1200);
    
    // When all charts are loaded, set overall chart loading to false
    setTimeout(() => setIsLoadingCharts(false), 1200);
  };

  // Manual refresh with visual feedback
  const refreshAnalytics = async () => {
    setLoadingState({
      summary: true,
      dailyVisits: true,
      referrers: true,
      geography: true,
      devices: true
    });
    
    await loadSummaryData();
  };

  // Calculate total visits across all tours
  const totalVisits = useMemo(() => 
    Object.values(analytics).reduce((sum, tourAnalytics) => 
      sum + tourAnalytics.totalVisits, 0
    ), [analytics]
  );

  // Calculate total unique visitors (approximate)
  const totalUniqueVisitors = useMemo(() => 
    Object.values(analytics).reduce((sum, tourAnalytics) => 
      sum + tourAnalytics.uniqueVisitors, 0
    ), [analytics]
  );

  // Get all unique countries and their total visits
  const countryData = useMemo(() => {
    const allCountries = Object.values(analytics).reduce((countries, tourAnalytics) => {
      Object.entries(tourAnalytics.visitsPerCountry).forEach(([country, count]) => {
        countries[country] = (countries[country] || 0) + count;
      });
      return countries;
    }, {} as Record<string, number>);
    
    return Object.entries(allCountries)
      .map(([country, value]) => ({ name: country, value }))
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

  // Get all unique devices and their total usage
  const deviceData = useMemo(() => {
    const allDevices = Object.values(analytics).reduce((devices, tourAnalytics) => {
      Object.entries(tourAnalytics.devicesUsed).forEach(([device, count]) => {
        devices[device] = (devices[device] || 0) + count;
      });
      return devices;
    }, {} as Record<string, number>);
    
    return Object.entries(allDevices)
      .map(([device, value]) => ({ 
        name: device === 'desktop' ? 'Desktop' : 
              device === 'mobile' ? 'Mobile' : 
              device === 'tablet' ? 'Tablet' : device,
        value 
      }))
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

  // Get all domain data with business-friendly labels
  const domainData = useMemo(() => {
    const allDomains = Object.values(analytics).reduce((domains, tourAnalytics) => {
      Object.entries(tourAnalytics.embedsPerDomain || {}).forEach(([domain, count]) => {
        domains[domain] = (domains[domain] || 0) + count;
      });
      return domains;
    }, {} as Record<string, number>);
    
    return Object.entries(allDomains)
      .map(([domain, value]) => ({ 
        name: getDomainDisplayName(domain),
        value 
      }))
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

  // Get daily visits data
  const visitsData = useMemo(() => {
    const dailyData: Record<string, number> = {};
    
    // Filter for selected tour or all tours
    const analyticsList = selectedTourId === 'all' 
      ? Object.values(analytics)
      : analytics[selectedTourId] ? [analytics[selectedTourId]] : [];
    
    analyticsList.forEach(tourAnalytics => {
      Object.entries(tourAnalytics.visitsPerDay).forEach(([date, count]) => {
        dailyData[date] = (dailyData[date] || 0) + count;
      });
    });
    
    return Object.entries(dailyData)
      .map(([date, visits]) => ({ 
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        visits 
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analytics, selectedTourId]);

  // Check if any tours have embed data
  const hasEmbedData = useMemo(() => 
    Object.values(analytics).some(tourAnalytics => tourAnalytics.embedsActive),
    [analytics]
  );

  // If loading, show a better loading state with skeletons
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="text-gray-500">Loading analytics...</span>
          </div>
        </div>
        
        {/* Skeleton summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Skeleton chart */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no embed data yet
  if (!hasEmbedData || totalVisits === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <Button onClick={refreshAnalytics} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <ExternalLink className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Analytics Data Yet</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mb-6">
            Your tours haven't been viewed in any embedded locations yet. Use the embed code feature to share your tours on external websites to start collecting analytics data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
            <Card className="bg-gray-50 dark:bg-gray-850">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2 text-sm">How to Share Your Tours</h3>
                <p className="text-xs text-gray-500">Use the Embed button on any published tour to get the code snippet, then add it to your website.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 dark:bg-gray-850">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2 text-sm">Track Performance</h3>
                <p className="text-xs text-gray-500">Once embedded, you'll see detailed visitor statistics, traffic sources, and distribution reach.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500">
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
          </div>
          <Select value={selectedTourId} onValueChange={setSelectedTourId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select tour" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tours</SelectItem>
              {tours.map(tour => (
                <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={refreshAnalytics} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            disabled={loadingState.summary}
          >
            {loadingState.summary ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Tour Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loadingState.summary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                selectedTourId === 'all' ? totalVisits : analytics[selectedTourId]?.totalVisits || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Unique Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loadingState.summary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                selectedTourId === 'all' ? totalUniqueVisitors : analytics[selectedTourId]?.uniqueVisitors || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Distribution Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loadingState.summary ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                selectedTourId === 'all' 
                  ? Object.keys(domainData).length 
                  : analytics[selectedTourId]?.embedsPerDomain 
                    ? Object.keys(analytics[selectedTourId].embedsPerDomain).length 
                    : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList className="bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
          <TabsTrigger value="visits" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
            <Activity className="h-4 w-4 mr-2" />
            Audience Trends
          </TabsTrigger>
          <TabsTrigger value="referrers" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Traffic Sources
          </TabsTrigger>
          <TabsTrigger value="geography" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
            <Globe2 className="h-4 w-4 mr-2" />
            Geographic Reach
          </TabsTrigger>
          <TabsTrigger value="devices" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Visitor Devices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="p-4 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="h-[400px]">
            {loadingState.dailyVisits ? (
              <div className="h-full w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : visitsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No daily data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visitsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="#4361EE" 
                    strokeWidth={3}
                    name="Daily Impressions"
                    dot={{ fill: '#4361EE', r: 4 }}
                    activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="referrers" className="p-4 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="h-[400px]">
            {loadingState.referrers ? (
              <div className="h-full w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : domainData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No traffic source data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name="Impressions" 
                    fill="#4361EE"
                    radius={[4, 4, 0, 0]}
                  >
                    {domainData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="geography" className="p-4 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="h-[400px]">
            {loadingState.geography ? (
              <div className="h-full w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : countryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No geographic data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={160}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {countryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name, props) => [`${value} impressions`, props.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="devices" className="p-4 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="h-[400px]">
            {loadingState.devices ? (
              <div className="h-full w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : deviceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No device data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Visitors" fill="#4361EE" radius={[4, 4, 0, 0]}>
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Additional insights section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Analytics Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Traffic Summary
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {totalVisits > 0 
                  ? `Your tours have received ${totalVisits} impressions from ${totalUniqueVisitors} unique visitors across ${Object.keys(domainData).length} channels.`
                  : 'Start sharing your tours to begin gathering traffic insights.'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <h3 className="font-medium text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                <Globe2 className="h-4 w-4 mr-2" />
                Distribution Reach
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                {countryData.length > 0
                  ? `Your tours have reached visitors in ${countryData.length} ${countryData.length === 1 ? 'country' : 'countries'}, primarily from ${countryData[0]?.name || 'various locations'}.`
                  : 'Share your tours more widely to expand your global reach.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}