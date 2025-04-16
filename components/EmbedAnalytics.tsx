"use client"

import { useAnalytics } from "@/contexts/AnalyticsContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { ExternalLink } from "lucide-react"

interface EmbedAnalyticsProps {
  tourId: string
}

export default function EmbedAnalytics({ tourId }: EmbedAnalyticsProps) {
  const { getTourAnalytics } = useAnalytics()
  const analytics = getTourAnalytics(tourId)

  // If no embed data yet
  if (!analytics || !analytics.embedVisits || analytics.embedVisits === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Embed Analytics</CardTitle>
          <CardDescription>
            Track where your tour is embedded
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <ExternalLink className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Embeds Yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Share your tour's embed code to allow visitors to view it on external websites.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format domain data for chart
  const domainData = Object.entries(analytics.embedsPerDomain || {})
    .map(([domain, count]) => ({
      domain: domain === 'direct' ? 'Direct Access' : domain,
      visits: count,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5) // Get top 5 domains

  // Chart colors
  const colors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)'
  ]

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Embed Analytics</CardTitle>
        <CardDescription>
          Where your tour is embedded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Embed Views</div>
            <div className="text-2xl font-bold">{analytics.embedVisits}</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Embed Websites</div>
            <div className="text-2xl font-bold">{Object.keys(analytics.embedsPerDomain || {}).length}</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Top Referring Domains</h3>
          <div className="h-64">
            {domainData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={domainData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="domain" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="visits" fill="var(--chart-1)" name="Visits" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No domain data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}