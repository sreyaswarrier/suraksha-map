"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, MapPin, AlertCircle, Loader2, ImagePlus, Check } from 'lucide-react'

interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

interface ReportFormProps {
  onSubmit?: (data: {
    location: string
    coordinates?: { lat: number; lon: number }
    description: string
    category: string
    image?: File
  }) => void
}

export default function ReportForm({ onSubmit }: ReportFormProps) {
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Function to find the best matching location within Kerala
  const findBestLocationInKerala = useCallback(async (query: string): Promise<{ lat: number; lon: number; name: string } | null> => {
    if (query.length < 2) return null

    try {
      // Search with Kerala bias
      const searchQueries = [
        `${query}, Kerala, India`,
        `${query} Kerala`,
        `${query}, India`
      ]

      for (const searchQuery of searchQueries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&addressdetails=1&bounded=1&viewbox=74.8,12.5,77.5,8.2`
        )
        
        if (!response.ok) continue
        
        const data: LocationResult[] = await response.json()
        
        // Filter results for Kerala and find the best match
        const keralaResults = data.filter(result => {
          const displayName = result.display_name.toLowerCase()
          return displayName.includes('kerala') || 
                 displayName.includes('kochi') || 
                 displayName.includes('thiruvananthapuram') ||
                 displayName.includes('kozhikode') ||
                 displayName.includes('kollam') ||
                 displayName.includes('thrissur') ||
                 displayName.includes('palakkad') ||
                 displayName.includes('malappuram') ||
                 displayName.includes('kannur') ||
                 displayName.includes('kasaragod') ||
                 displayName.includes('pathanamthitta') ||
                 displayName.includes('alappuzha') ||
                 displayName.includes('kottayam') ||
                 displayName.includes('idukki') ||
                 displayName.includes('ernakulam') ||
                 displayName.includes('wayanad')
        })

        if (keralaResults.length > 0) {
          const best = keralaResults[0]
          const lat = parseFloat(best.lat)
          const lon = parseFloat(best.lon)
          
          // Verify coordinates are within Kerala bounds roughly
          if (lat >= 8.2 && lat <= 12.5 && lon >= 74.8 && lon <= 77.5) {
            return {
              lat,
              lon,
              name: best.display_name
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }, [])

  const handleLocationInput = (value: string) => {
    setLocation(value)
    setGeocodedLocation(null)
    setErrors(prev => ({ ...prev, location: '' }))
  }

  const handleImageUpload = (file: File) => {
    setErrors(prev => ({ ...prev, image: '' }))

    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be smaller than 10MB' }))
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please upload an image file' }))
      return
    }

    setImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) {
      handleImageUpload(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!location.trim()) {
      newErrors.location = 'Location is required'
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required'
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }

    if (!category) {
      newErrors.category = 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      // Auto-geocode the location if not already done
      let coordinates = geocodedLocation ? { lat: geocodedLocation.lat, lon: geocodedLocation.lon } : null
      let finalLocationName = geocodedLocation?.name || location.trim()

      if (!geocodedLocation && location.trim()) {
        setErrors(prev => ({ ...prev, submit: 'Finding location coordinates...' }))
        
        const foundLocation = await findBestLocationInKerala(location.trim())
        if (foundLocation) {
          coordinates = { lat: foundLocation.lat, lon: foundLocation.lon }
          finalLocationName = foundLocation.name
          setGeocodedLocation(foundLocation)
        } else {
          setErrors(prev => ({ 
            ...prev, 
            location: `Could not find "${location.trim()}" in Kerala. Please check the spelling or try a nearby landmark.`
          }))
          setIsSubmitting(false)
          return
        }
      }

      if (!coordinates) {
        setErrors(prev => ({ 
          ...prev, 
          location: 'Unable to determine location coordinates. Please try a different location name.' 
        }))
        setIsSubmitting(false)
        return
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const formData = {
        location: finalLocationName,
        coordinates,
        description: description.trim(),
        category,
        image: image || undefined
      }

      onSubmit?.(formData)
      
      // Reset form
      setLocation('')
      setDescription('')
      setCategory('')
      setImage(null)
      setImagePreview(null)
      setGeocodedLocation(null)
      setErrors({})
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, submit: 'Failed to submit report. Please try again.' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-card rounded-lg shadow-sm border border-border p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-medium font-[var(--font-display)] text-card-foreground">
          Submit Report
        </h2>
        <p className="text-sm text-muted-foreground font-[var(--font-body)]">
          Report an issue in your community
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Location Field */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium font-[var(--font-display)] text-card-foreground">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={location}
              onChange={(e) => handleLocationInput(e.target.value)}
              placeholder="Enter any location in Kerala..."
              className={`pl-10 font-[var(--font-body)] ${errors.location ? 'border-destructive' : ''}`}
            />
          </div>
          
          {errors.location && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.location}
            </div>
          )}
          
          {geocodedLocation && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <Check className="h-3 w-3" />
              Will be pinned at: {geocodedLocation.name}
            </div>
          )}
        </div>

        {/* Category Field */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium font-[var(--font-display)] text-card-foreground">
            Category
          </Label>
          <Select value={category} onValueChange={(value) => {
            setCategory(value)
            setErrors(prev => ({ ...prev, category: '' }))
          }}>
            <SelectTrigger className={`font-[var(--font-body)] ${errors.category ? 'border-destructive' : ''}`}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="safety">Safety Issue</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="environmental">Environmental</SelectItem>
              <SelectItem value="traffic">Traffic</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.category && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.category}
            </div>
          )}
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium font-[var(--font-display)] text-card-foreground">
            Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setErrors(prev => ({ ...prev, description: '' }))
            }}
            placeholder="Describe the issue in detail..."
            rows={4}
            className={`resize-none font-[var(--font-body)] ${errors.description ? 'border-destructive' : ''}`}
          />
          {errors.description && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </div>
          )}
        </div>

        {/* Image Upload Field */}
        <div className="space-y-2">
          <Label className="text-sm font-medium font-[var(--font-display)] text-card-foreground">
            Upload Image (Optional)
          </Label>
          
          {!imagePreview ? (
            <div
              className="relative border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
                className="sr-only"
              />
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium font-[var(--font-display)] text-card-foreground">
                    Drop an image here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground font-[var(--font-body)]">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="w-full h-32 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {errors.image && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.image}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium font-[var(--font-display)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Submit Report
            </>
          )}
        </Button>

        {errors.submit && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  )
}