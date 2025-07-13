"use client"

import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, AlertTriangle, Download, WifiOff, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Define interfaces for type safety
interface IncidentMarker {
  id: string
  lat: number
  lng: number
  title: string
  description: string
  type: 'accident' | 'infrastructure' | 'safety' | 'environment' | 'traffic' | 'other'
  priority: 'low' | 'medium' | 'high'
  date: string
  status: 'open' | 'in-progress' | 'resolved'
}

interface NewReport {
  location: string
  coordinates?: { lat: number; lon: number }
  description: string
  category: string
  image?: File
}

interface CivicMapProps {
  className?: string
  onMarkerClick?: (marker: IncidentMarker) => void
  height?: string
  newReports?: NewReport[]
}

interface OfflineMapData {
  center: [number, number]
  zoom: number
  markers: IncidentMarker[]
  lastUpdated: string
}

// Sample data for demonstration
const sampleMarkers: IncidentMarker[] = [
  {
    id: '1',
    lat: 10.8505,
    lng: 76.2711,
    title: 'Road Pothole',
    description: 'Large pothole causing traffic disruption on NH47',
    type: 'infrastructure',
    priority: 'high',
    date: '2024-01-10',
    status: 'open'
  },
  {
    id: '2',
    lat: 9.9312,
    lng: 76.2673,
    title: 'Street Light Outage',
    description: 'Multiple street lights not working in residential area',
    type: 'infrastructure',
    priority: 'medium',
    date: '2024-01-08',
    status: 'in-progress'
  },
  {
    id: '3',
    lat: 11.2588,
    lng: 75.7804,
    title: 'Water Logging',
    description: 'Heavy water logging after recent rains',
    type: 'environment',
    priority: 'high',
    date: '2024-01-05',
    status: 'open'
  },
  {
    id: '4',
    lat: 8.8932,
    lng: 76.6141,
    title: 'Traffic Signal Issue',
    description: 'Traffic signal malfunctioning during peak hours',
    type: 'safety',
    priority: 'high',
    date: '2024-01-12',
    status: 'resolved'
  },
  {
    id: '5',
    lat: 10.5276,
    lng: 76.2144,
    title: 'Waste Accumulation',
    description: 'Garbage not collected for over a week',
    type: 'environment',
    priority: 'medium',
    date: '2024-01-07',
    status: 'open'
  }
]

const CivicMap: React.FC<CivicMapProps> = ({ 
  className = '', 
  onMarkerClick,
  height = '600px',
  newReports = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [useOfflineMode, setUseOfflineMode] = useState(false)
  const [offlineData, setOfflineData] = useState<OfflineMapData | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<IncidentMarker | null>(null)
  const [allMarkers, setAllMarkers] = useState<IncidentMarker[]>([...sampleMarkers])

  // Store for offline maps
  const OFFLINE_MAP_KEY = 'surakshamap_offline_data'

  const convertReportToMarker = (report: NewReport, index: number): IncidentMarker => {
    const categoryTypeMap: { [key: string]: IncidentMarker['type'] } = {
      'Safety Issue': 'safety',
      'Infrastructure': 'infrastructure',
      'Environmental': 'environment',
      'Traffic': 'traffic',
      'Other': 'other'
    }

    // Generate a unique ID
    const reportId = `report_${Date.now()}_${index}`
    
    // Use the exact coordinates from geocoding, no fallbacks
    if (!report.coordinates) {
      console.error('Report submitted without valid coordinates:', report)
      return null as any // This will be filtered out
    }

    const lat = report.coordinates.lat
    const lng = report.coordinates.lon

    return {
      id: reportId,
      lat,
      lng,
      title: `New Report: ${report.category}`,
      description: report.description,
      type: categoryTypeMap[report.category] || 'other',
      priority: 'medium', // Default medium priority as requested
      date: new Date().toISOString().split('T')[0],
      status: 'open'
    }
  }

  // Convert new reports to markers and update allMarkers
  useEffect(() => {
    if (newReports && newReports.length > 0) {
      const newMarkers = newReports
        .map((report, index) => convertReportToMarker(report, index))
        .filter(marker => marker !== null) // Filter out reports without coordinates
      setAllMarkers(prev => [...sampleMarkers, ...newMarkers])
    } else {
      setAllMarkers([...sampleMarkers])
    }
  }, [newReports])

  // Ensure we're on the client side before initializing map
  useEffect(() => {
    setIsClient(true)
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load offline data if available
    loadOfflineData()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadOfflineData = () => {
    try {
      const storedData = localStorage.getItem(OFFLINE_MAP_KEY)
      if (storedData) {
        const data: OfflineMapData = JSON.parse(storedData)
        setOfflineData(data)
      }
    } catch (error) {
      console.error('Failed to load offline data:', error)
    }
  }

  const saveOfflineData = (data: OfflineMapData) => {
    try {
      localStorage.setItem(OFFLINE_MAP_KEY, JSON.stringify(data))
      setOfflineData(data)
    } catch (error) {
      console.error('Failed to save offline data:', error)
    }
  }

  const downloadForOffline = () => {
    const mapCenter = mapInstanceRef.current 
      ? mapInstanceRef.current.getCenter() 
      : { lat: 10.8505, lng: 76.2711 }
    const mapZoom = mapInstanceRef.current 
      ? mapInstanceRef.current.getZoom() 
      : 7

    const offlineMapData: OfflineMapData = {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: mapZoom,
      markers: allMarkers,
      lastUpdated: new Date().toISOString()
    }

    saveOfflineData(offlineMapData)
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#3b82f6'
    }
  }

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-700'
      case 'in-progress': return 'bg-yellow-100 text-yellow-700'
      case 'open': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const createCustomIcon = (priority: string) => {
    if (typeof window === 'undefined') return null
    
    const L = (window as any).L
    if (!L) return null

    const color = getPriorityColor(priority)
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
          "></div>
          <div style="
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid ${color};
          "></div>
        </div>
      `,
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      popupAnchor: [0, -32]
    })
  }

  const renderOfflineMap = () => {
    const markersToDisplay = offlineData?.markers || allMarkers

    if (!offlineData && allMarkers.length === 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-center p-6">
          <WifiOff className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Offline Map Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No offline map data available. Connect to internet to download map data for offline use.
          </p>
        </div>
      )
    }

    return (
      <div className="w-full h-full bg-muted rounded-lg overflow-hidden">
        {/* Offline Map Header */}
        <div className="bg-orange-100 border-b border-orange-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-800">Offline Map View</span>
            </div>
            <span className="text-xs text-orange-600">
              Last updated: {offlineData ? new Date(offlineData.lastUpdated).toLocaleDateString() : 'Live data'}
            </span>
          </div>
        </div>

        {/* Static Map Grid */}
        <div className="relative p-6 h-full">
          <div className="absolute inset-6 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
            {/* Grid overlay to simulate map tiles */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`row-${i}`} className="flex">
                  {Array.from({ length: 16 }).map((_, j) => (
                    <div 
                      key={`col-${j}`} 
                      className="w-8 h-8 border border-gray-300"
                      style={{ 
                        backgroundColor: (i + j) % 2 === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)'
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Markers positioned on the offline map */}
            {markersToDisplay.map((marker, index) => {
              // Calculate relative position based on actual lat/lng coordinates
              const mapBounds = {
                north: 12.0, south: 8.0,  // Kerala approximate bounds
                east: 78.0, west: 74.0
              }
              
              const xPercent = ((marker.lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 100
              const yPercent = ((mapBounds.north - marker.lat) / (mapBounds.north - mapBounds.south)) * 100
              
              // Clamp to reasonable bounds within the map area
              const xPos = Math.max(5, Math.min(95, xPercent))
              const yPos = Math.max(5, Math.min(95, yPercent))

              return (
                <div
                  key={marker.id}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  onClick={() => setSelectedMarker(marker)}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: getPriorityColor(marker.priority) }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div
                    className="absolute w-0 h-0 top-full left-1/2 transform -translate-x-1/2"
                    style={{
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `6px solid ${getPriorityColor(marker.priority)}`
                    }}
                  />
                </div>
              )
            })}

            {/* Center indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </div>
          </div>

          {/* Static info overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
              <div className="text-sm text-gray-600 mb-2">
                Mode: <span className="font-medium text-orange-600">Offline Static View</span>
              </div>
              <div className="text-xs text-gray-500">
                Map center: {offlineData ? `${offlineData.center[0].toFixed(4)}, ${offlineData.center[1].toFixed(4)}` : '10.8505, 76.2711'} | 
                Zoom: {offlineData?.zoom || 7} | 
                Markers: {markersToDisplay.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Update markers when allMarkers changes
  const updateMapMarkers = () => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return

    const L = (window as any).L
    if (!L) return

    // Clear existing markers
    markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker))
    markersRef.current = []

    // Add all markers (sample + new reports)
    allMarkers.forEach(incident => {
      const customIcon = createCustomIcon(incident.priority)
      if (!customIcon) return

      const marker = L.marker([incident.lat, incident.lng], {
        icon: customIcon
      }).addTo(mapInstanceRef.current)

      // Create popup content
      const popupContent = `
        <div style="font-family: Inter, sans-serif; min-width: 280px; max-width: 320px;">
          <div style="
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 12px 16px;
            margin: -10px -10px 12px -10px;
            border-radius: 8px 8px 0 0;
          ">
            <h3 style="
              font-family: 'Google Sans', sans-serif;
              font-weight: 600;
              font-size: 16px;
              margin: 0;
              line-height: 1.3;
            ">${incident.title}</h3>
          </div>
          
          <div style="padding: 0 4px;">
            <p style="
              color: #475569;
              font-size: 14px;
              line-height: 1.5;
              margin: 0 0 12px 0;
            ">${incident.description}</p>
            
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
              <span style="
                background-color: ${getPriorityColor(incident.priority)};
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
              ">${incident.priority} Priority</span>
              <span style="
                background-color: ${incident.status === 'resolved' ? '#dcfce7' : incident.status === 'in-progress' ? '#fef3c7' : '#fecaca'};
                color: ${incident.status === 'resolved' ? '#166534' : incident.status === 'in-progress' ? '#92400e' : '#991b1b'};
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                text-transform: capitalize;
              ">${incident.status.replace('-', ' ')}</span>
            </div>
            
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 8px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #64748b;
            ">
              <span style="text-transform: capitalize;">${incident.type}</span>
              <span>${new Date(incident.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 340,
        className: 'custom-popup'
      })

      // Handle marker click
      marker.on('click', () => {
        mapInstanceRef.current.setView([incident.lat, incident.lng], 14, {
          animate: true,
          duration: 0.5
        })
        if (onMarkerClick) {
          onMarkerClick(incident)
        }
      })

      markersRef.current.push(marker)
    })
  }

  const initializeMap = async () => {
    if (typeof window === 'undefined' || !mapRef.current) return

    // If offline, show offline map
    if (!isOnline || useOfflineMode) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setMapError(null)

      // Dynamically import Leaflet
      const L = await import('leaflet')
      
      // Set up Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Store Leaflet on window for custom icon creation
      ;(window as any).L = L

      // Wait a bit for CSS to load
      await new Promise(resolve => setTimeout(resolve, 100))

      const initialCenter = offlineData ? offlineData.center : [10.8505, 76.2711] as [number, number]
      const initialZoom = offlineData ? offlineData.zoom : 7

      // Initialize the map
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        center: initialCenter,
        zoom: initialZoom,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      })

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)

      mapInstanceRef.current = map
      setIsLoading(false)

      // Add markers after map is initialized
      updateMapMarkers()

      // Auto-save offline data when online
      if (isOnline) {
        const currentMapData: OfflineMapData = {
          center: [map.getCenter().lat, map.getCenter().lng],
          zoom: map.getZoom(),
          markers: allMarkers,
          lastUpdated: new Date().toISOString()
        }
        saveOfflineData(currentMapData)
      }

    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('Failed to load map. Switching to offline mode...')
      setTimeout(() => {
        setUseOfflineMode(true)
        setMapError(null)
        setIsLoading(false)
      }, 2000)
    }
  }

  useEffect(() => {
    if (isClient) {
      initializeMap()
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isClient, isOnline, useOfflineMode])

  // Update markers when allMarkers changes
  useEffect(() => {
    if (mapInstanceRef.current && !useOfflineMode && isOnline) {
      updateMapMarkers()
      
      // If there are new reports, center the map on the most recent one
      if (newReports && newReports.length > 0) {
        const latestReport = newReports[newReports.length - 1]
        if (latestReport.coordinates) {
          mapInstanceRef.current.setView(
            [latestReport.coordinates.lat, latestReport.coordinates.lon], 
            14, 
            { animate: true, duration: 1.0 }
          )
        }
      }
    }
  }, [allMarkers, newReports])

  if (!isClient) {
    return (
      <div 
        className={`bg-card rounded-lg shadow-md overflow-hidden ${className}`}
        style={{ height }}
      >
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </div>
    )
  }

  if (mapError && !useOfflineMode) {
    return (
      <div 
        className={`bg-card rounded-lg shadow-md overflow-hidden ${className}`}
        style={{ height }}
      >
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-center p-6">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Map Loading Error</h3>
            <p className="text-sm text-muted-foreground mb-4">{mapError}</p>
            <div className="space-y-2">
              <button
                onClick={initializeMap}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium mr-2"
              >
                Retry
              </button>
              <button
                onClick={() => setUseOfflineMode(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                Use Offline Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-lg shadow-md overflow-hidden relative ${className}`}>
      {/* Online/Offline Controls */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        {isOnline && mapInstanceRef.current && !useOfflineMode && (
          <Button
            size="sm"
            variant="secondary"
            onClick={downloadForOffline}
            className="bg-white/90 backdrop-blur-sm shadow-md"
          >
            <Download className="h-4 w-4 mr-1" />
            Save Offline
          </Button>
        )}
        
        {offlineData && (
          <Button
            size="sm"
            variant={useOfflineMode ? "default" : "outline"}
            onClick={() => setUseOfflineMode(!useOfflineMode)}
            className="bg-white/90 backdrop-blur-sm shadow-md"
          >
            {useOfflineMode ? (
              <>
                <WifiOff className="h-4 w-4 mr-1" />
                Offline
              </>
            ) : (
              <>
                <Map className="h-4 w-4 mr-1" />
                Online
              </>
            )}
          </Button>
        )}
      </div>

      {isLoading && !useOfflineMode && (
        <div 
          className="absolute inset-0 bg-card/80 backdrop-blur-sm z-40 flex items-center justify-center"
          style={{ height }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">
              {!isOnline ? 'Loading offline map...' : 'Loading interactive map...'}
            </p>
          </div>
        </div>
      )}
      
      {(!isOnline || useOfflineMode) ? (
        <div style={{ height }}>
          {renderOfflineMap()}
        </div>
      ) : (
        <div 
          ref={mapRef} 
          className="w-full relative z-10"
          style={{ height }}
        />
      )}
      
      {/* Map legend */}
      {(!useOfflineMode || !offlineData) && (
        <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm p-3 rounded-lg shadow-md z-30 max-w-48">
          <h4 className="font-medium text-sm mb-2 text-foreground">Priority Levels</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span className="text-foreground">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span className="text-foreground">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-foreground">Low Priority</span>
            </div>
          </div>
        </div>
      )}

      {/* Offline Marker Details Panel */}
      {selectedMarker && useOfflineMode && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-80 z-40">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">{selectedMarker.title}</h3>
            <button
              onClick={() => setSelectedMarker(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">{selectedMarker.description}</p>
          <div className="flex gap-2 text-xs">
            <span className={`px-2 py-1 rounded ${getStatusBadgeColor(selectedMarker.status)}`}>
              {selectedMarker.status.replace('-', ' ')}
            </span>
            <span className="text-gray-500">
              {new Date(selectedMarker.date).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Add custom CSS for popup styling */}
      <style jsx>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        .custom-popup .leaflet-popup-content {
          margin: 10px;
        }
        .custom-popup .leaflet-popup-tip {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}

export default CivicMap