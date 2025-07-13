"use client"

import { useState, useCallback } from 'react'
import { Navigation, Loader2 } from 'lucide-react'

interface LocateMeButtonProps {
  onLocationFound: (latitude: number, longitude: number) => void
  onError?: (error: GeolocationPositionError) => void
}

export default function LocateMeButton({ onLocationFound, onError }: LocateMeButtonProps) {
  const [isLocating, setIsLocating] = useState(false)

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      const error: GeolocationPositionError = {
        code: 2,
        message: 'Geolocation is not supported by this browser.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }
      onError?.(error)
      return
    }

    setIsLocating(true)

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false)
        onLocationFound(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        setIsLocating(false)
        onError?.(error)
      },
      options
    )
  }, [onLocationFound, onError])

  return (
    <button
      onClick={handleLocateMe}
      disabled={isLocating}
      className={`
        fixed bottom-6 right-6 z-50
        w-12 h-12
        bg-primary text-primary-foreground
        rounded-full
        shadow-lg shadow-black/10
        flex items-center justify-center
        transition-all duration-200 ease-out
        hover:scale-105 hover:shadow-xl hover:shadow-black/15
        active:scale-95
        disabled:opacity-70 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        border border-border/20
      `}
      aria-label={isLocating ? 'Finding your location...' : 'Find my location'}
    >
      {isLocating ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Navigation className="w-5 h-5" />
      )}
    </button>
  )
}