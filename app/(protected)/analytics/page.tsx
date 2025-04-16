// app/analytics/page.tsx
"use client"

import { useState } from "react"
import { useTours } from "@/contexts/ToursContext"
import { useAnalytics } from "@/contexts/AnalyticsContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AnalyticsPage() {
  const { tours } = useTours()
  const { analytics } = useAnalytics()
  const [selectedTourId, setSelectedTourId] = useState<string | 'all'>('all')

  // Calculate total visits across all tours
  const totalVisits = Object.values(analytics).reduce((sum, tourAnalytics) => 
    sum + tourAnalytics.totalVisits, 0
  )

  // Get all unique countries and their total visits
  const allCountries = Object.values(analytics).reduce((countries, tourAnalytics) => {
    Object.entries(tourAnalytics.visitsPerCountry).forEach(([country, count]) => {
      countries[country] = (countries[country] || 0) + count
    })
    return countries
  }, {} as Record<string, number>)

  const countryData = Object.entries(allCountries).map(([country, value]) => ({
    name: country,
    value
  }))

  // Get all unique devices and their total usage
  const allDevices = Object.values(analytics).reduce((devices, tourAnalytics) => {
    Object.entries(tourAnalytics.devicesUsed).forEach(([device, count]) => {
      devices[device] = (devices[device] || 0) + count
    })
    return devices
  }, {} as Record<string, number>)

  const deviceData = Object.entries(allDevices).map(([device, value]) => ({
    name: device,
    value
  }))

  // Get daily visits data
  const getDailyVisits = () => {
    const dailyData: Record<string, number> = {}
    Object.values(analytics).forEach(tourAnalytics => {
      Object.entries(tourAnalytics.visitsPerDay).forEach(([date, count]) => {
        dailyData[date] = (dailyData[date] || 0) + count
      })
    })
    return Object.entries(dailyData)
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const visitsData = getDailyVisits()

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {selectedTourId === 'all' ? totalVisits : analytics[selectedTourId]?.totalVisits || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Tours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{tours.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Tours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {tours.filter(tour => !tour.isDraft).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visits">Visits Over Time</TabsTrigger>
          <TabsTrigger value="geography">Geographical Distribution</TabsTrigger>
          <TabsTrigger value="devices">Device Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="p-4 border rounded-lg">
          <div className="h-[400px]">
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
                  name="Daily Visits"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="p-4 border rounded-lg">
          <div className="h-[400px]">
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
                >
                  {countryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="p-4 border rounded-lg">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}