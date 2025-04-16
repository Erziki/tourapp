"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Copy, Code } from "lucide-react"
import { toast } from "sonner"

interface EmbedCodeGeneratorProps {
  tourId: string
  tourName: string
}

export default function EmbedCodeGenerator({ tourId, tourName }: EmbedCodeGeneratorProps) {
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'responsive'>('responsive')
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Code className="h-4 w-4" />
          <span>Embed</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] p-0 gap-0 overflow-hidden">
        {/* Side-by-side layout */}
        <div className="flex flex-col md:flex-row w-full h-full">
          {/* Left side: Embed code */}
          <div className="flex-1 p-6 border-r border-gray-200 dark:border-gray-700">
            <DialogHeader className="mb-4">
              <DialogTitle>Embed this Virtual Tour</DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add this tour to your website by copying and pasting the code below.
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
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
          </div>
          
          {/* Right side: Preview with skip-analytics parameter */}
          <div className="flex-1 flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-medium">Preview</h3>
            </div>
            <div className="flex-1 p-0 relative">
              <iframe 
                src={`${baseUrl}/embed/${tourId}?skip-analytics=true`} 
                width="100%" 
                height="100%" 
                style={{ border: 'none', position: 'absolute', inset: 0 }}
                title={`${tourName} - Preview`}
                allow="fullscreen; accelerometer; gyroscope; magnetometer"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={() => setIsOpen(false)} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}