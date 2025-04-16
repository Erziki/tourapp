// components/ContactForm.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Send, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ContactFormProps {
  variant?: 'default' | 'dashboard'
  onClose?: () => void
  initialName?: string
  initialEmail?: string
  initialSubject?: string
}

export default function ContactForm({ 
  variant = 'default', 
  onClose,
  initialName = "",
  initialEmail = "",
  initialSubject = ""
}: ContactFormProps) {
  const { toast } = useToast()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [subject, setSubject] = useState(initialSubject)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")
  
  // Store submitted email for success message
  const [submittedEmail, setSubmittedEmail] = useState("")

  // Update values if props change
  useEffect(() => {
    if (initialName) setName(initialName)
    if (initialEmail) setEmail(initialEmail)
    if (initialSubject) setSubject(initialSubject)
  }, [initialName, initialEmail, initialSubject])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!name || !email || !message) {
      setSubmitStatus('error')
      setErrorMessage("Please fill in all required fields")
      return
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setSubmitStatus('error')
      setErrorMessage("Please enter a valid email address")
      return
    }
    
    // Save the submitted email before potentially clearing it
    setSubmittedEmail(email)
    
    setIsSubmitting(true)
    setSubmitStatus('idle')
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject: subject || 'Contact Form Submission',
          message
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send message')
      }
      
      // Success!
      setSubmitStatus('success')
      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
        variant: "default",
      })
      
      // Reset form
      setMessage("")
      if (!initialName) setName("")
      if (!initialEmail) setEmail("")
      if (!initialSubject) setSubject("")
      
      // If in modal/dashboard view, close after 2 seconds
      if (variant === 'dashboard' && onClose) {
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      setSubmitStatus('error')
      setErrorMessage(error.message || 'Failed to send message. Please try again later.')
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // For dashboard variant, we don't need the card wrappers since they're already provided
  if (variant === 'dashboard') {
    return (
      <div className="w-full">
        {submitStatus === 'success' ? (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-400">Message Sent!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Thank you for reaching out. Your message has been sent directly to our support team. We'll respond to your email ({submittedEmail}) as soon as possible.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Your Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="John Doe"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="john@example.com"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  placeholder="How can we help you?"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                <Textarea 
                  id="message" 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  placeholder="Tell us more about your question or inquiry..."
                  rows={5}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </form>
            
            <div className="flex justify-end mt-4 gap-2">
              {onClose && (
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }
  
  // Default variant with card wrappers
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Get in Touch</CardTitle>
        <CardDescription>
          Send us a message and we'll get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitStatus === 'success' ? (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-400">Message Sent!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Thank you for reaching out. Your message has been sent directly to our support team. We'll respond to your email ({submittedEmail}) as soon as possible.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitStatus === 'error' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="name">Your Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe"
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="john@example.com"
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input 
                id="subject" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="How can we help you?"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
              <Textarea 
                id="message" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Tell us more about your question or inquiry..."
                rows={5}
                disabled={isSubmitting}
                required
              />
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {submitStatus !== 'success' && (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}