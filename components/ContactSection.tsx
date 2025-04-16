// components/ContactSection.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { useAuth } from "@/contexts/AuthContext";

export default function ContactSection() {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Contact Support</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact cards - sidebar */}
        <div className="md:col-span-1 space-y-6">
          {/* Contact info card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium">Email</h3>
                  <a 
                    href="mailto:contact@vuetour.com" 
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    contact@vuetour.com
                  </a>
                </div>
              </div>
                       
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium">Office</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Office N8, QFC Tower 1<br />
                    Doha, Qatar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Knowledge base card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Send className="mr-2 h-5 w-5 text-blue-500" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline block">
                Help Center
              </a>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline block">
                Frequently Asked Questions
              </a>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline block">
                User Guide
              </a>
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline block">
                API Documentation
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Contact form */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Send Us a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactForm 
                variant="dashboard" 
                // Pre-fill with user's name and email if available
                initialName={`${user?.attributes?.given_name || ''} ${user?.attributes?.family_name || ''}`.trim()}
                initialEmail={user?.attributes?.email || ''}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}