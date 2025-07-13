"use client"

import { useEffect, useRef, useState } from 'react'
import { Loader, BarChart3, TrendingUp, PieChart } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CategoryData {
  [key: string]: number
}

interface CategoryChartProps {
  categoryData: CategoryData
  isLoading?: boolean
}

interface AnalyticsData {
  totalReports: number
  mostCommonCategory: string
  trendData: Array<{
    date: string
    count: number
  }>
}

declare global {
  interface Window {
    google: any
    googleChartsLoaded: boolean
  }
}

export default function CategoryChart({ categoryData, isLoading = false }: CategoryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const trendChartRef = useRef<HTMLDivElement>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const [isGoogleChartsLoaded, setIsGoogleChartsLoaded] = useState(false)
  const [useOfflineMode, setUseOfflineMode] = useState(false)
  const [currentView, setCurrentView] = useState<'pie' | 'bar' | 'trend'>('pie')
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalReports: 0,
    mostCommonCategory: 'None',
    trendData: []
  })

  // Calculate analytics data
  useEffect(() => {
    const total = Object.values(categoryData).reduce((sum, count) => sum + count, 0)
    const mostCommon = Object.entries(categoryData).reduce(
      (max, [category, count]) => count > max.count ? { category, count } : max,
      { category: 'None', count: 0 }
    )

    // Generate mock trend data for the last 7 days
    const trendData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * total / 3) + Math.floor(total / 7)
      }
    })

    setAnalytics({
      totalReports: total,
      mostCommonCategory: mostCommon.category,
      trendData
    })
  }, [categoryData])

  useEffect(() => {
    const loadGoogleCharts = () => {
      // Check if we're online
      if (!navigator.onLine) {
        setUseOfflineMode(true)
        return
      }

      if (window.google && window.google.charts) {
        if (!window.googleChartsLoaded) {
          window.google.charts.load('current', { packages: ['corechart', 'bar'] })
          window.google.charts.setOnLoadCallback(() => {
            window.googleChartsLoaded = true
            setIsGoogleChartsLoaded(true)
            setUseOfflineMode(false)
          })
        } else {
          setIsGoogleChartsLoaded(true)
          setUseOfflineMode(false)
        }
        return
      }

      const script = document.createElement('script')
      script.src = 'https://www.gstatic.com/charts/loader.js'
      script.onload = () => {
        window.google.charts.load('current', { packages: ['corechart', 'bar'] })
        window.google.charts.setOnLoadCallback(() => {
          window.googleChartsLoaded = true
          setIsGoogleChartsLoaded(true)
          setUseOfflineMode(false)
        })
      }
      script.onerror = () => {
        setChartError('Failed to load Google Charts. Using offline mode.')
        setUseOfflineMode(true)
      }
      document.head.appendChild(script)
    }

    loadGoogleCharts()

    // Listen for online/offline events
    const handleOnline = () => {
      setUseOfflineMode(false)
      loadGoogleCharts()
    }
    const handleOffline = () => {
      setUseOfflineMode(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const renderGoogleChart = () => {
    if (!isGoogleChartsLoaded || !chartRef.current || isLoading) return

    try {
      setChartError(null)
      
      const hasData = Object.keys(categoryData).length > 0 && 
                      Object.values(categoryData).some(value => value > 0)
      
      if (currentView === 'pie') {
        const chartData = [['Category', 'Count']]
        
        if (!hasData) {
          chartData.push(['No Data', 1])
        } else {
          Object.entries(categoryData).forEach(([category, count]) => {
            if (count > 0) {
              chartData.push([category, count])
            }
          })
        }

        const data = window.google.visualization.arrayToDataTable(chartData)
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

        const options = {
          pieHole: 0.6,
          width: 280,
          height: 280,
          chartArea: { left: 20, top: 20, width: '80%', height: '80%' },
          colors: hasData ? colors : ['#e2e8f0'],
          backgroundColor: 'transparent',
          legend: {
            position: 'bottom',
            alignment: 'center',
            textStyle: { color: 'var(--foreground)', fontSize: 11 }
          },
          pieSliceText: 'none'
        }

        const chart = new window.google.visualization.PieChart(chartRef.current)
        chart.draw(data, options)

      } else if (currentView === 'bar') {
        const chartData = [['Category', 'Count']]
        
        if (!hasData) {
          chartData.push(['No Data', 1])
        } else {
          Object.entries(categoryData).forEach(([category, count]) => {
            chartData.push([category, count])
          })
        }

        const data = window.google.visualization.arrayToDataTable(chartData)

        const options = {
          width: 280,
          height: 280,
          chartArea: { left: 80, top: 20, width: '70%', height: '70%' },
          colors: ['#3b82f6'],
          backgroundColor: 'transparent',
          hAxis: { textStyle: { color: 'var(--foreground)', fontSize: 11 } },
          vAxis: { textStyle: { color: 'var(--foreground)', fontSize: 11 } },
          legend: { position: 'none' }
        }

        const chart = new window.google.visualization.ColumnChart(chartRef.current)
        chart.draw(data, options)

      } else if (currentView === 'trend') {
        const chartData = [['Date', 'Reports']]
        analytics.trendData.forEach(item => {
          chartData.push([item.date, item.count])
        })

        const data = window.google.visualization.arrayToDataTable(chartData)

        const options = {
          width: 280,
          height: 280,
          chartArea: { left: 40, top: 20, width: '80%', height: '70%' },
          colors: ['#3b82f6'],
          backgroundColor: 'transparent',
          hAxis: { textStyle: { color: 'var(--foreground)', fontSize: 10 } },
          vAxis: { textStyle: { color: 'var(--foreground)', fontSize: 10 } },
          legend: { position: 'none' },
          curveType: 'function'
        }

        const chart = new window.google.visualization.LineChart(chartRef.current)
        chart.draw(data, options)
      }
    } catch (error) {
      console.error('Error rendering chart:', error)
      setChartError('Failed to render chart')
      setUseOfflineMode(true)
    }
  }

  useEffect(() => {
    if (!useOfflineMode) {
      renderGoogleChart()
    }
  }, [categoryData, isGoogleChartsLoaded, isLoading, currentView, analytics, useOfflineMode])

  // Fallback offline chart rendering using CSS and divs
  const renderOfflineChart = () => {
    const hasData = Object.keys(categoryData).length > 0 && 
                    Object.values(categoryData).some(value => value > 0)
    
    if (!hasData) {
      return (
        <div className="text-center text-muted-foreground py-12">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No data available</p>
        </div>
      )
    }

    const maxCount = Math.max(...Object.values(categoryData))
    const total = Object.values(categoryData).reduce((sum, count) => sum + count, 0)

    return (
      <div className="space-y-3">
        {Object.entries(categoryData).map(([category, count], index) => {
          if (count === 0) return null
          const percentage = total > 0 ? (count / total) * 100 : 0
          const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
          
          return (
            <div key={category} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium truncate">{category}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${barHeight}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {percentage.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const hasData = Object.keys(categoryData).length > 0 && 
                  Object.values(categoryData).some(value => value > 0)

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground font-[var(--font-display)]">
          Analytics Dashboard
        </h3>
        {useOfflineMode && (
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            Offline Mode
          </span>
        )}
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-primary">{analytics.totalReports}</div>
          <div className="text-xs text-muted-foreground">Total Reports</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs font-medium text-foreground truncate">
            {analytics.mostCommonCategory}
          </div>
          <div className="text-xs text-muted-foreground">Top Category</div>
        </div>
      </div>

      {/* Chart View Controls */}
      {!useOfflineMode && hasData && (
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={currentView === 'pie' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('pie')}
            className="flex-1 text-xs"
          >
            <PieChart className="h-3 w-3 mr-1" />
            Pie
          </Button>
          <Button
            variant={currentView === 'bar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('bar')}
            className="flex-1 text-xs"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Bar
          </Button>
          <Button
            variant={currentView === 'trend' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('trend')}
            className="flex-1 text-xs"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Trend
          </Button>
        </div>
      )}
      
      <div className="flex items-center justify-center min-h-[280px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Loading analytics...</span>
          </div>
        ) : useOfflineMode ? (
          <div className="w-full">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Charts unavailable - showing offline view
              </p>
            </div>
            {renderOfflineChart()}
          </div>
        ) : chartError ? (
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{chartError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setUseOfflineMode(true)}
            >
              Switch to Offline Mode
            </Button>
          </div>
        ) : !hasData ? (
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No reports submitted yet</p>
          </div>
        ) : (
          <div ref={chartRef} className="w-full flex justify-center" />
        )}
      </div>
    </div>
  )
}