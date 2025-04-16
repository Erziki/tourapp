// components/AnalyticsDashboard.tsx
"use client"

import { useMemo, useEffect, useState } from 'react'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { useAuth } from '@/contexts/AuthContext'
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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ExternalLink, RefreshCw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AnalyticsDashboardProps {
  tourId: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AnalyticsDashboard({ tourId }: AnalyticsDashboardProps) {
  const { getTourAnalytics, refreshAnalytics } = useAnalytics()
  const { user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const analytics = getTourAnalytics(tourId)

  // Load analytics data when component mounts
  useEffect(() => {
    if (isAuthenticated && user?.attributes.sub) {
      const loadData = async () => {
        setIsLoading(true)
        setError(null)
        
        try {
          await refreshAnalytics(tourId)
          console.log(`Analytics data refreshed for tour: ${tourId}`)
        } catch (err) {
          console.error("Error refreshing analytics:", err)
          setError(err instanceof Error ? err.message : "Failed to load analytics")
        } finally {
          setIsLoading(false)
        }
      }
      
      loadData()
    }
  }, [tourId, refreshAnalytics, isAuthenticated, user])

  const handleRefresh = async () => {
    if (!isAuthenticated || !user?.attributes.sub) {
      setError("You must be logged in to view analytics")
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      await refreshAnalytics(tourId)
    } catch (err) {
      console.error("Error refreshing analytics:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh analytics")
    } finally {
      setIsLoading(false)
    }
  }

  const visitsData = useMemo(() => {
    if (!analytics) return []
    return Object.entries(analytics.visitsPerDay)
      .map(([date, count]) => ({
        date,
        visits: count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [analytics])

  const countryData = useMemo(() => {
    if (!analytics) return []
    return Object.entries(analytics.visitsPerCountry)
      .map(([country, count]) => ({
        name: country,
        value: count
      }))
      .sort((a, b) => b.value - a.value)
  }, [analytics])

  const deviceData = useMemo(() => {
    if (!analytics) return []
    return Object.entries(analytics.devicesUsed)
      .map(([device, count]) => ({
        name: device,
        value: count
      }))
      .sort((a, b) => b.value - a.value)
  }, [analytics])

  const referrerData = useMemo(() => {
    if (!analytics || !analytics.embedsPerDomain) return []
    return Object.entries(analytics.embedsPerDomain)
      .map(([domain, count]) => ({
        name: domain === 'direct' ? 'Direct Access' : domain,
        value: count
      }))
      .sort((a, b) => b.value - a.value)
  }, [analytics])

  // If not authenticated, show login message
  if (!isAuthenticated) {
    return (
      <Alert className="mb-4">
        <AlertDescription>You must be logged in to view analytics.</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
        <span>Loading analytics data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>Error loading analytics: {error}</AlertDescription>
      </Alert>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="mb-4">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mb-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Analytics
          </Button>
        </div>
        No analytics data found for this tour.
      </div>
    )
  }

  // If no embed visits yet
  if (analytics.totalVisits === 0 || !analytics.embedsActive) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Embed Analytics</h2>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <ExternalLink className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Embed Analytics Yet</h2>
          <p className="text-gray-500 max-w-lg mb-6">
            This tour hasn't been viewed in any embedded locations yet. Share your tour's embed code to start tracking views.
          </p>
          {showDebug && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs text-left w-full max-w-lg">
              <h3 className="font-bold mb-2">Debug Information:</h3>
              <pre>{JSON.stringify(analytics, null, 2)}</pre>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowDebug(!showDebug)} className="mt-4">
            <Info className="h-4 w-4 mr-2" />
            {showDebug ? "Hide Debug Info" : "Show Debug Info"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Embed Analytics</h2>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Embed Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalVisits}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Unique Viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.uniqueVisitors}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Embedding Websites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Object.keys(analytics.embedsPerDomain || {}).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrer Domains Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Referring Domains</CardTitle>
          <CardDescription>Sites where your tour is embedded</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={referrerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Visits" fill="#8884d8">
                {referrerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Visits Over Time Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Embed Visits Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visitsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="visits" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Daily Embed Visits"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visitors by Country */}
        <Card>
          <CardHeader>
            <CardTitle>Visitors by Country</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {countryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Device Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {showDebug && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Debug Information:</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowDebug(false)}>
              Hide
            </Button>
          </div>
          <pre className="overflow-auto max-h-64">{JSON.stringify(analytics, null, 2)}</pre>
        </div>
      )}
      
      {!showDebug && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowDebug(true)}>
            <Info className="h-4 w-4 mr-2" />
            Show Debug Info
          </Button>
        </div>
      )}
    </div>
  )
}