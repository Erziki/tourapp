// components/ContactPage.tsx
"use client"

import Link from "next/link"
import { Mail, Phone, MapPin, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import ContactForm from "@/components/ContactForm"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/landing">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Have questions about our service? Need help with your virtual tours? Our team is here to assist you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-4">
                <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email Us</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Our friendly team is here to help
              </p>
              <a 
                href="mailto:contact@vuetour.com" 
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                contact@vuetour.com
              </a>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-4">
                <MapPin className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Office</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Come say hello at our office
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                Office N8, QFC Tower 1<br />
                Doha, Qatar
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-4">
                <Phone className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Phone</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Mon-Fri from 8am to 5pm
              </p>
              <a 
                href="tel:+97412345678" 
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                +974 1234 5678
              </a>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Send Us a Message
              </h2>
              <ContactForm />
            </div>

            <div className="rounded-lg overflow-hidden h-[450px]">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3610.0453986621086!2d51.518878400000005!3d25.205376699999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e45c524ecb1d0f9%3A0x7be2f03a8d6d05be!2sQFC%20Tower%201!5e0!3m2!1sen!2sus!4v1711719780882!5m2!1sen!2sus" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} VueTour. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}