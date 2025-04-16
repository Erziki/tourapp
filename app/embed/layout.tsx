// app/embed/layout.tsx
import { EmbedAnalyticsProvider } from "@/contexts/EmbedAnalyticsProvider"
import { ThemeProvider } from "@/components/theme-provider"

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This is a public layout with only the necessary providers
  return (
    <ThemeProvider>
      <EmbedAnalyticsProvider>
        {children}
      </EmbedAnalyticsProvider>
    </ThemeProvider>
  )
}