"use client"

import { useState, useEffect } from "react"
import { Brain, Loader, AlertTriangle, Zap, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ClassificationResult {
  category: string
  confidence: number
  reasoning: string
  isOfflineFallback?: boolean
}

export default function AIAssistant() {
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [useOfflineFallback, setUseOfflineFallback] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Enhanced offline classification with better heuristics
  const offlineClassification = (text: string): ClassificationResult => {
    const normalizedText = text.toLowerCase().trim()
    
    // Safety-related keywords
    if (normalizedText.match(/\b(danger|unsafe|hazard|risk|emergency|urgent|critical|accident|injury|fire|violence|threat)\b/)) {
      return {
        category: "Safety Issue",
        confidence: 0.92,
        reasoning: "Detected safety-related keywords and risk indicators in the text.",
        isOfflineFallback: true
      }
    }
    
    // Infrastructure keywords
    if (normalizedText.match(/\b(pothole|road|bridge|water|pipe|sewer|light|electricity|power|construction|building|repair|maintenance)\b/)) {
      return {
        category: "Infrastructure",
        confidence: 0.88,
        reasoning: "Identified infrastructure and maintenance-related terminology.",
        isOfflineFallback: true
      }
    }
    
    // Environmental keywords
    if (normalizedText.match(/\b(pollution|noise|air|water|waste|garbage|trash|environment|green|tree|park|clean)\b/)) {
      return {
        category: "Environmental",
        confidence: 0.85,
        reasoning: "Found environmental and sustainability-related terms.",
        isOfflineFallback: true
      }
    }
    
    // Traffic keywords
    if (normalizedText.match(/\b(traffic|car|vehicle|parking|signal|jam|congestion|speed|driving|transport)\b/)) {
      return {
        category: "Traffic",
        confidence: 0.87,
        reasoning: "Detected transportation and traffic-related content.",
        isOfflineFallback: true
      }
    }

    // Urgency indicators
    if (normalizedText.match(/\b(urgent|asap|immediately|now|quick|fast|emergency)\b/) || normalizedText.includes('!')) {
      return {
        category: "High Priority",
        confidence: 0.83,
        reasoning: "Identified urgency indicators suggesting high priority classification.",
        isOfflineFallback: true
      }
    }

    // Question indicators
    if (normalizedText.includes('?') || normalizedText.match(/\b(what|when|where|why|how|question|help|support)\b/)) {
      return {
        category: "Support Request",
        confidence: 0.80,
        reasoning: "Text appears to be a question or support request based on structure and keywords.",
        isOfflineFallback: true
      }
    }

    // Positive feedback indicators
    if (normalizedText.match(/\b(thank|thanks|great|excellent|good|awesome|wonderful|appreciate|love|perfect)\b/)) {
      return {
        category: "Positive Feedback",
        confidence: 0.86,
        reasoning: "Detected positive sentiment and appreciation expressions.",
        isOfflineFallback: true
      }
    }

    // Problem/issue indicators
    if (normalizedText.match(/\b(problem|issue|error|bug|broken|not working|failed|wrong|trouble)\b/)) {
      return {
        category: "Issue Report",
        confidence: 0.84,
        reasoning: "Identified problem reporting language and error indicators.",
        isOfflineFallback: true
      }
    }

    // Suggestion/improvement indicators
    if (normalizedText.match(/\b(suggest|improve|feature|enhancement|better|could|should|would|idea)\b/)) {
      return {
        category: "Feature Request",
        confidence: 0.78,
        reasoning: "Found suggestion and improvement-oriented language patterns.",
        isOfflineFallback: true
      }
    }

    // Default fallback
    return {
      category: "Other",
      confidence: 0.60,
      reasoning: "Unable to determine specific category. Content may require manual review.",
      isOfflineFallback: true
    }
  }

  const handleClassify = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to classify")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // If offline or fallback mode is enabled, use offline classification
      if (!isOnline || useOfflineFallback) {
        // Simulate processing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800))
        const offlineResult = offlineClassification(inputText)
        setResult(offlineResult)
        setIsLoading(false)
        return
      }

      // Attempt online AI classification
      const mockClassification = await new Promise<ClassificationResult>((resolve, reject) => {
        setTimeout(() => {
          // Simulate API failure 30% of the time for demonstration
          if (Math.random() < 0.3) {
            reject(new Error("AI service temporarily unavailable"))
            return
          }

          // Enhanced mock classification with more sophisticated logic
          const text = inputText.toLowerCase()
          let category = "Other"
          let confidence = 0.8
          let reasoning = ""

          if (text.includes("urgent") || text.includes("emergency") || text.includes("critical")) {
            category = "High Priority"
            confidence = 0.95
            reasoning = "High priority indicators detected with strong confidence based on urgency keywords."
          } else if (text.includes("safety") || text.includes("danger") || text.includes("risk")) {
            category = "Safety Issue"
            confidence = 0.93
            reasoning = "Safety-related content identified through risk assessment keywords."
          } else if (text.includes("road") || text.includes("traffic") || text.includes("transport")) {
            category = "Traffic"
            confidence = 0.90
            reasoning = "Transportation and traffic-related content detected."
          } else if (text.includes("environment") || text.includes("pollution") || text.includes("waste")) {
            category = "Environmental"
            confidence = 0.89
            reasoning = "Environmental concerns identified in the text content."
          } else if (text.includes("infrastructure") || text.includes("repair") || text.includes("maintenance")) {
            category = "Infrastructure"
            confidence = 0.87
            reasoning = "Infrastructure and maintenance-related terminology found."
          } else if (text.includes("question") || text.includes("help") || text.includes("?")) {
            category = "Support Request"
            confidence = 0.85
            reasoning = "Support request identified based on question patterns and help-seeking language."
          } else if (text.includes("thank") || text.includes("great") || text.includes("excellent")) {
            category = "Positive Feedback"
            confidence = 0.88
            reasoning = "Positive sentiment analysis indicates appreciation or satisfaction."
          } else if (text.includes("issue") || text.includes("problem") || text.includes("error")) {
            category = "Issue Report"
            confidence = 0.86
            reasoning = "Problem reporting detected through issue identification keywords."
          } else if (text.includes("suggestion") || text.includes("improve") || text.includes("feature")) {
            category = "Feature Request"
            confidence = 0.82
            reasoning = "Enhancement suggestions identified through improvement-oriented language."
          }

          resolve({
            category,
            confidence,
            reasoning
          })
        }, 1500)
      })

      setResult(mockClassification)
    } catch (err) {
      console.error("AI classification failed:", err)
      
      // Automatically fallback to offline classification
      setError("AI service unavailable. Using offline classification...")
      
      setTimeout(async () => {
        setError(null)
        const fallbackResult = offlineClassification(inputText)
        setResult(fallbackResult)
        setIsLoading(false)
      }, 1000)
      
      return
    }
    
    setIsLoading(false)
  }

  const toggleFallbackMode = () => {
    setUseOfflineFallback(!useOfflineFallback)
    setResult(null)
    setError(null)
  }

  return (
    <Card className="bg-card border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between font-[var(--font-display)] text-card-foreground">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Assistant
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && <WifiOff className="h-4 w-4 text-orange-500" />}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFallbackMode}
              className="text-xs"
            >
              {useOfflineFallback ? <Zap className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOnline && (
          <Alert className="bg-orange-50 border-orange-200">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-sm font-[var(--font-body)] text-orange-800">
              <strong>Offline Mode:</strong> Using local classification algorithms. Connect to internet for enhanced AI analysis.
            </AlertDescription>
          </Alert>
        )}

        {useOfflineFallback && isOnline && (
          <Alert className="bg-blue-50 border-blue-200">
            <Zap className="h-4 w-4" />
            <AlertDescription className="text-sm font-[var(--font-body)] text-blue-800">
              <strong>Fallback Mode:</strong> Using offline classification for faster results. Toggle to enable full AI processing.
            </AlertDescription>
          </Alert>
        )}

        {!useOfflineFallback && isOnline && (
          <Alert className="bg-warning/10 border-warning/20">
            <AlertDescription className="text-sm font-[var(--font-body)] text-foreground">
              <strong>AI Mode:</strong> Enhanced classification using advanced language models. Fallback available if needed.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-3">
          <Textarea
            placeholder="Enter text to classify (e.g., safety issue, infrastructure problem, environmental concern...)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[120px] resize-none bg-background border-input font-[var(--font-body)]"
          />
          
          <Button 
            onClick={handleClassify}
            disabled={isLoading || !inputText.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-[var(--font-display)] font-medium"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                {useOfflineFallback || !isOnline ? 'Processing locally...' : 'Analyzing with AI...'}
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                {useOfflineFallback || !isOnline ? 'Classify Offline' : 'Classify with AI'}
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert className="bg-destructive/10 border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-destructive font-[var(--font-body)]">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-[var(--font-display)] font-medium text-foreground">
                Classification Result
              </h4>
              {result.isOfflineFallback && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                  Offline
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-[var(--font-body)] text-muted-foreground">Category</p>
                <p className="font-[var(--font-display)] font-medium text-foreground">{result.category}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-[var(--font-body)] text-muted-foreground">Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background rounded-full h-2">
                    <div 
                      className="bg-success h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-[var(--font-body)] font-medium text-foreground">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-[var(--font-body)] text-muted-foreground">Reasoning</p>
              <p className="text-sm font-[var(--font-body)] text-foreground leading-relaxed">{result.reasoning}</p>
            </div>

            {result.isOfflineFallback && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <strong>Note:</strong> This classification was performed using offline algorithms. 
                Connect to internet or disable fallback mode for enhanced AI analysis.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}