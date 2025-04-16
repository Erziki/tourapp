"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutGrid, 
  BarChart2, 
  User, 
  HelpCircle, 
  CreditCard,
  LogOut,
  Settings,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"

interface NavigationBarProps {
  onSectionChange: (section: 'tours' | 'analytics' | 'profile' | 'subscription' | 'contact') => void
  currentSection: 'tours' | 'analytics' | 'profile' | 'subscription' | 'contact'
}

export default function NavigationBar({ onSectionChange, currentSection }: NavigationBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, user } = useAuth()

  const navItems = [
    {
      name: "360° Tours",
      icon: <LayoutGrid className="h-5 w-5" />,
      value: "tours" as const,
    },
    {
      name: "Analytics",
      icon: <BarChart2 className="h-5 w-5" />,
      value: "analytics" as const,
    },
    {
      name: "Subscription",
      icon: <CreditCard className="h-5 w-5" />,
      value: "subscription" as const,
    },
    {
      name: "Profile",
      icon: <User className="h-5 w-5" />,
      value: "profile" as const,
    },
    {
      name: "Contact Support",
      icon: <MessageSquare className="h-5 w-5" />,
      value: "contact" as const,
    },
  ]

  return (
    <div className="h-screen flex flex-col w-56 bg-white dark:bg-gray-800 text-gray-800 dark:text-white fixed border-r border-gray-200 dark:border-gray-700 z-20">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/dashboard">
          <div className="flex items-center space-x-2">
            {/* Replaced VT text with logo image */}
            <div className="h-8 w-8 flex items-center justify-center">
              <Image 
                src="/logo.png" 
                alt="VueTour Logo" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">VueTour</h1>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <button
            key={item.value}
            onClick={() => onSectionChange(item.value)}
            className={cn(
              "flex items-center w-full space-x-3 px-3 py-2 text-sm font-medium rounded-md transition",
              item.value === currentSection
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {item.icon}
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto space-y-1">
        <button
          onClick={() => signOut()}
          className="flex items-center px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  )
}