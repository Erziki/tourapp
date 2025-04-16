// components/ContactDialog.tsx
"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import ContactForm from "@/components/ContactForm"

interface ContactDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
}

export default function ContactDialog({ 
  isOpen, 
  onClose, 
  title = "Contact Support",
  description = "Our team is here to help with any questions or concerns."
}: ContactDialogProps) {
  const { user } = useAuth();
  
  // Get user information from auth context
  const userName = user ? `${user.attributes?.given_name || ''} ${user.attributes?.family_name || ''}`.trim() : '';
  const userEmail = user?.attributes?.email || '';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ContactForm 
          variant="dashboard" 
          onClose={onClose} 
          initialName={userName}
          initialEmail={userEmail}
          initialSubject="Subscription Support Request"
        />
      </DialogContent>
    </Dialog>
  )
}