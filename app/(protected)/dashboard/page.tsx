"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Search, Edit, Trash2, Eye, Save, BarChart, PlusCircle, Code, AlertTriangle, CreditCard } from "lucide-react"
import { useTours } from "@/contexts/ToursContext"
import { useAnalytics } from "@/contexts/AnalyticsContext"
import { useAuth } from "@/contexts/AuthContext"
import { useSubscription } from "@/contexts/SubscriptionContext"
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion } from "framer-motion"
import ProtectedRoute from "@/components/ProtectedRoute"
import NavigationBar from "@/components/NavigationBar"
import AnalyticsSection from "@/components/AnalyticsSection"
import ProfileSection from "@/components/ProfileSection"
import SubscriptionManager from "@/components/SubscriptionManager"
import EmbedCodeGenerator from "@/components/EmbedCodeGenerator"
import DisabledTourCard from "@/components/DisabledTourCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ContactSection from "@/components/ContactSection"

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { 
    tours, 
    updateTour, 
    deleteTour, 
    isTourDisabled, 
    getDisabledReason 
  } = useTours()
  const { isAuthenticated, isLoading, user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [currentSection, setCurrentSection] = useState<'tours' | 'analytics' | 'profile' | 'subscription' | 'contact'>('tours')
  
  // Subscription-related hooks
  const { getCurrentPlan, usageMetrics, refreshUsageMetrics } = useSubscription()
  const { isAtTourLimit, getToursRemaining } = useSubscriptionLimits()
  const currentPlan = getCurrentPlan()
  const toursRemaining = getToursRemaining()
  
  // Ref to track if we've already refreshed metrics for this section change
  const hasRefreshedRef = useRef(false);
  
  // Check for section query parameter on initial load
  useEffect(() => {
    // Check for section query parameter
    const sectionParam = searchParams.get('section')
    if (sectionParam) {
      // Type casting to ensure it's a valid section type
      const validSection = sectionParam as 'tours' | 'analytics' | 'profile' | 'subscription' | 'contact'
      // Only set if it's a valid section
      if (['tours', 'analytics', 'profile', 'subscription', 'contact'].includes(validSection)) {
        setCurrentSection(validSection)
      }
    }
  }, [searchParams])

  // Safely refresh usage metrics when viewing subscription section - fixed to avoid infinite loop
  useEffect(() => {
    if (currentSection === 'subscription' && !hasRefreshedRef.current) {
      // Mark that we've refreshed metrics for this section change
      hasRefreshedRef.current = true;
      // Use setTimeout to break the render cycle
      setTimeout(() => {
        refreshUsageMetrics(tours);
      }, 0);
    } else if (currentSection !== 'subscription') {
      // Reset the flag when leaving subscription section
      hasRefreshedRef.current = false;
    }
  }, [currentSection]); // Remove tours and refreshUsageMetrics from dependencies

  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        tour.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'drafts') return matchesSearch && tour.isDraft;
    if (activeTab === 'published') return matchesSearch && !tour.isDraft;
    return matchesSearch;
  });

  // Add a new function to directly create a tour and redirect to editor
  const createNewTour = () => {
    // Create a new tour template with default image type
    const newTourTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Tour",
      description: "",
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDraft: true,
      type: 'image' // Default to image type
    }
    
    // Store template in localStorage to pass to editor
    localStorage.setItem('newTourTemplate', JSON.stringify(newTourTemplate))
    
    // Route to editor page
    router.push('/editor')
  }

  const handlePublish = (tourId: string) => {
    const tour = tours.find(t => t.id === tourId)
    if (tour) {
      updateTour(tourId, {
        ...tour,
        isDraft: false,
        updatedAt: new Date().toISOString()
      })
    }
  }

  const handleDelete = (tourId: string) => {
    deleteTour(tourId)
  }

  const handleSectionChange = (section: 'tours' | 'analytics' | 'profile' | 'subscription' | 'contact') => {
    setCurrentSection(section)
  }

  // If still loading, show simple loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        {/* Side Navigation */}
        <NavigationBar 
          onSectionChange={handleSectionChange} 
          currentSection={currentSection} 
        />

        {/* Main Content - with left margin to accommodate fixed sidebar */}
        <div className="flex-1 bg-white dark:bg-gray-900 overflow-auto ml-56">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-3 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentSection === 'tours' ? '360 Tours' : 
                   currentSection === 'analytics' ? 'Analytics' : 
                   currentSection === 'subscription' ? 'Subscription' :
                   currentSection === 'contact' ? 'Contact Support' : 'Profile'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                {currentSection === 'tours' && (
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-10 pr-4 py-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600"
                      placeholder="Search tours..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {/* Theme Toggle */}
                  <ThemeToggle />
                  
                  <div className="relative group">
                      <button 
                        className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden"
                      >
                        {user?.attributes?.profile_image || user?.attributes?.picture ? (
                          <img 
                            src={user.attributes.profile_image || user.attributes.picture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            {user?.attributes?.given_name?.[0] || user?.attributes?.email?.[0] || "U"}
                          </div>
                        )}
                      </button>
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <div className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.attributes?.given_name} {user?.attributes?.family_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.attributes?.email}</div>
                        </div>
                        <div className="py-1">
                          <button 
                            onClick={() => setCurrentSection('profile')} 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Profile Settings
                          </button>
                          <button 
                            onClick={() => signOut()} 
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </header>

          <main className="px-6 py-6">
            {/* Tours Section */}
            {currentSection === 'tours' && (
              <>
                {/* Page Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Virtual Tours</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage and monitor your immersive experiences</p>
                    
                    {/* Tour limit warning */}
                    {toursRemaining <= 3 && toursRemaining > 0 && (
                      <div className="text-amber-600 dark:text-amber-400 text-sm flex items-center mt-2">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span>
                          {toursRemaining} {toursRemaining === 1 ? 'tour' : 'tours'} remaining on your {currentPlan?.name} plan
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createNewTour}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isAtTourLimit}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New Tour
                    </Button>
                  </div>
                </div>

                {/* Subscription limit alert */}
                {isAtTourLimit && (
                  <Alert className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <AlertTitle className="text-amber-800 dark:text-amber-400">Tour Limit Reached</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      You've reached the maximum of {currentPlan?.limits.maxTours} tours allowed on your {currentPlan?.name} plan.
                      <Button
                        variant="link"
                        onClick={() => setCurrentSection('subscription')}
                        className="text-blue-600 dark:text-blue-400 p-0 h-auto font-semibold"
                      >
                        Upgrade your plan
                      </Button> to create more tours.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'all' 
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All Tours
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'published' 
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('published')}
                  >
                    Published
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'drafts' 
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('drafts')}
                  >
                    Drafts
                  </button>
                </div>

                {/* Grid of tours */}
                {filteredTours.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTours.map((tour) => {
                      // Check if tour is disabled due to subscription limits
                      const isDisabled = isTourDisabled(tour.id);
                      
                      // If disabled, show special card
                      if (isDisabled) {
                        return (
                          <DisabledTourCard 
                            key={tour.id}
                            tour={tour}
                            reason={getDisabledReason() || 'limit_exceeded'}
                            onUpgradeClick={() => setCurrentSection('subscription')}
                          />
                        );
                      }
                      
                      // Otherwise, show regular tour card
                      return (
                        <motion.div
                          key={tour.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                          {/* Tour Preview */}
                          <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
                            {tour.thumbnail ? (
                              <img
                                src={tour.thumbnail}
                                alt={tour.name}
                                className="w-full h-full object-cover"
                              />
                            ) : tour.scenes && tour.scenes[0]?.type === 'video' ? (
                              <video
                                src={tour.scenes[0]?.videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                onMouseOver={(e) => e.currentTarget.play()}
                                onMouseOut={(e) => {
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                }}
                              />
                            ) : (
                              <img
                                src={(tour.scenes && tour.scenes[0]?.imageUrl) || "/api/placeholder/400/300"}
                                alt={tour.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute top-2 right-2 flex gap-2">
                              <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs">
                                {tour.scenes?.length || 0} scenes
                              </div>
                              {tour.isDraft && (
                                <div className="bg-amber-500/90 px-2 py-1 rounded-full text-white text-xs">
                                  Draft
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Tour Info */}
                          <div className="p-4">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{tour.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{tour.description}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-500 mb-4">
                              <div>Updated {new Date(tour.updatedAt).toLocaleDateString()}</div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex justify-between">
                              <div className="flex gap-2">
                                <Link href={`/view/${tour.id}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/editor/${tour.id}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                {!tour.isDraft && (
                                  <EmbedCodeGenerator 
                                    tourId={tour.id}
                                    tourName={tour.name}
                                  />
                                )}
                              </div>
                              <div className="flex gap-2">
                                {tour.isDraft && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handlePublish(tour.id)}
                                    className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDelete(tour.id)}
                                  className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty state */
                  <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                      <Plus className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tours found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {searchQuery ? "Try adjusting your search or filters" : "Create your first virtual tour to get started"}
                    </p>
                    {!searchQuery && !isAtTourLimit && (
                      <Button 
                        onClick={createNewTour}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Tour
                      </Button>
                    )}
                    {!searchQuery && isAtTourLimit && (
                      <Button 
                        onClick={() => setCurrentSection('subscription')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Upgrade Your Plan
                      </Button>
                    )}
                  </div>
                )}

                {/* Disabled Tours Section (if any) */}
                {activeTab === 'all' && tours.some(tour => isTourDisabled(tour.id)) && (
                  <div className="mt-12">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Disabled Tours</h2>
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentSection('subscription')}
                        size="sm"
                      >
                        Manage Subscription
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tours
                        .filter(tour => isTourDisabled(tour.id))
                        .map(tour => (
                          <DisabledTourCard 
                            key={tour.id}
                            tour={tour}
                            reason={getDisabledReason() || 'limit_exceeded'}
                            onUpgradeClick={() => setCurrentSection('subscription')}
                          />
                        ))
                      }
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Analytics Section */}
            {currentSection === 'analytics' && <AnalyticsSection />}

            {/* Profile Section */}
            {currentSection === 'profile' && <ProfileSection />}

            {/* Subscription Section */}
            {currentSection === 'subscription' && <SubscriptionManager />}

            {/* Contact Section */}
            {currentSection === 'contact' && <ContactSection />}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}