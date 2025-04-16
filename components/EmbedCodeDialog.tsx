"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Code, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface EmbedCodeDialogProps {
  tourId: string
  tourName: string
}

export default function EmbedCodeDialog({ tourId, tourName }: EmbedCodeDialogProps) {
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'responsive'>('responsive')
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLPreElement>(null)

  // Define dimensions for each size
  const dimensions = {
    small: { width: 500, height: 300 },
    medium: { width: 700, height: 400 },
    large: { width: 900, height: 500 },
    responsive: { width: '100%', height: 500 }
  }

  // Base URL for embed - use environment variable if available
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vuetour.com'

  // Generate the embed code based on selected size
  const generateEmbedCode = () => {
    const { width, height } = dimensions[size]
    return `<iframe 
  src="${baseUrl}/embed/${tourId}" 
  width="${width}" 
  height="${height}" 
  style="border: none; max-width: 100%;" 
  allow="fullscreen; accelerometer; gyroscope; magnetometer" 
  title="${tourName} - 360° Virtual Tour"
></iframe>`
  }

  const handleCopy = () => {
    const code = generateEmbedCode()
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopied(true)
        toast.success("Embed code copied to clipboard")
        
        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopied(false)
        }, 2000)
      })
      .catch(err => {
        console.error("Failed to copy: ", err)
        toast.error("Failed to copy embed code")
      })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Code className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Embed this Virtual Tour</DialogTitle>
          <DialogDescription>
            Add this tour to your website by copying and pasting the code below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-20">Size:</span>
            <Select value={size} onValueChange={(value: any) => setSize(value)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (500×300)</SelectItem>
                <SelectItem value="medium">Medium (700×400)</SelectItem>
                <SelectItem value="large">Large (900×500)</SelectItem>
                <SelectItem value="responsive">Responsive (100% width)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-4">
            <pre
              ref={codeRef}
              className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all"
            >
              {generateEmbedCode()}
            </pre>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              When embedded, you'll receive analytics data in your dashboard.
            </div>
            <Button onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md mt-4">
          <h3 className="font-medium mb-2">Preview</h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <iframe 
              src={`${baseUrl}/embed/${tourId}`} 
              width="100%" 
              height="100%" 
              style={{ border: 'none' }}
              title={`${tourName} - Preview`}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}