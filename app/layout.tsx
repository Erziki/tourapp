// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToursProvider } from "@/contexts/ToursContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { AnalyticsProvider } from "@/contexts/AnalyticsContext"
import { SubscriptionProvider } from "@/contexts/SubscriptionContext"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
// Import ThemeProvider
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VueTour - 360° Virtual Tours Creator",
  description: "Create immersive 360° virtual tours for your business, real estate, or educational needs",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <ToursProvider>
                <AnalyticsProvider>
                  {children}
                  <Toaster />
                  <SonnerToaster position="top-right" />
                </AnalyticsProvider>
              </ToursProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}