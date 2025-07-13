"use client"

import { useState, useCallback } from 'react'
import CivicMap from '@/components/civic-map'
import LocateMeButton from '@/components/locate-me-button'
import ReportForm from '@/components/report-form'
import AIAssistant from '@/components/ai-assistant'
import CategoryChart from '@/components/category-chart'

interface Report {
  id: string
  location: string
  coordinates?: { lat: number; lon: number }
  description: string
  category: string
  image?: File
  timestamp: Date
}

interface NewReport {
  location: string
  coordinates?: { lat: number; lon: number }
  description: string
  category: string
  image?: File
}

export default function Home() {
  const [reports, setReports] = useState<Report[]>([])
  const [newReports, setNewReports] = useState<NewReport[]>([])
  const [categoryData, setCategoryData] = useState<{ [key: string]: number }>({
    'Safety Issue': 0,
    'Infrastructure': 0,
    'Environmental': 0,
    'Traffic': 0,
    'Other': 0
  })

  const handleLocationFound = useCallback((latitude: number, longitude: number) => {
    // This would typically update the map center or populate location in the form
    console.log('Location found:', { latitude, longitude })
  }, [])

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    let message = 'Unable to get your location.'
    switch (error.code) {
      case 1:
        message = 'Location access denied. Please enable location services.'
        break
      case 2:
        message = 'Location unavailable. Please try again.'
        break
      case 3:
        message = 'Location request timed out. Please try again.'
        break
    }
    console.error('Location error:', message)
  }, [])

  const handleReportSubmit = useCallback((reportData: NewReport) => {
    const newReport: Report = {
      id: Date.now().toString(),
      ...reportData,
      timestamp: new Date()
    }

    // Add to reports list for the sidebar
    setReports(prev => [...prev, newReport])
    
    // Add to new reports for the map
    setNewReports(prev => [...prev, reportData])
    
    // Update category data
    setCategoryData(prev => ({
      ...prev,
      [reportData.category]: (prev[reportData.category] || 0) + 1
    }))

    console.log('New report submitted:', newReport)
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Left Panel - Forms and AI Assistant */}
        <div className="w-80 bg-muted/20 border-r border-border overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground font-[var(--font-display)] mb-2">
                SurakshaMap
              </h1>
              <p className="text-sm text-muted-foreground font-[var(--font-body)]">
                Community Safety Reporting Platform
              </p>
            </div>

            {/* Report Form */}
            <ReportForm onSubmit={handleReportSubmit} />

            {/* AI Assistant */}
            <AIAssistant />
          </div>
        </div>

        {/* Main Content - Map */}
        <div className="flex-1 relative">
          <CivicMap 
            className="w-full h-full" 
            height="100vh"
            newReports={newReports}
            onMarkerClick={(marker) => console.log('Marker clicked:', marker)}
          />
          
          {/* Locate Me Button */}
          <LocateMeButton
            onLocationFound={handleLocationFound}
            onError={handleLocationError}
          />
        </div>

        {/* Right Panel - Category Chart */}
        <div className="w-80 bg-muted/20 border-l border-border overflow-y-auto">
          <div className="p-6">
            <CategoryChart 
              categoryData={categoryData}
              isLoading={false}
            />
            
            {/* Recent Reports */}
            <div className="mt-6 bg-card rounded-lg border border-border p-4">
              <h3 className="text-lg font-medium text-foreground mb-3 font-[var(--font-display)]">
                Recent Reports
              </h3>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-[var(--font-body)]">
                    No reports submitted yet
                  </p>
                ) : (
                  reports.slice(-3).reverse().map(report => (
                    <div key={report.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-primary font-[var(--font-display)]">
                          {report.category}
                        </span>
                        <span className="text-xs text-muted-foreground font-[var(--font-body)]">
                          {report.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-[var(--font-body)] mb-1">
                        {report.description.length > 50 
                          ? `${report.description.substring(0, 50)}...` 
                          : report.description}
                      </p>
                      <p className="text-xs text-muted-foreground font-[var(--font-body)]">
                        📍 {report.location.length > 40 
                          ? `${report.location.substring(0, 40)}...` 
                          : report.location}
                      </p>
                      {/* Show priority and status for new reports */}
                      <div className="mt-2 flex gap-2">
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                          Medium Priority
                        </span>
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                          Open
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}