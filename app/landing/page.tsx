// app/landing/page.tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion } from "framer-motion"
import ContactForm from "@/components/ContactForm"
import { Mail, Phone, MapPin } from "lucide-react"

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const [showVideoModal, setShowVideoModal] = useState(false)

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  const openVideoModal = () => {
    setShowVideoModal(true)
  }

  const closeVideoModal = () => {
    setShowVideoModal(false)
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    
    // Set light mode as default
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 text-gray-900 dark:text-gray-100" data-theme="light">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md" : "bg-transparent"
      }`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
          {/* Replaced VT text with logo image */}
          <div className="h-15 w-15 flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="VueTour Logo" 
              width={40} 
              height={40} 
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">VueTour</h1>
        </div>
          
          <div className="flex items-center space-x-4">
            {/* Navigation links */}
            
            {/* Theme toggle */}
            <ThemeToggle />
            
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300 font-medium">Log In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-700 text-white">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
              Create Immersive Virtual Experiences
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
              Build stunning 360° virtual tours for your business, real estate, education, or events.
              <span className="block mt-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                No coding required. Start creating in minutes.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all">
                  Start Creating — Free
                </Button>
              </Link>
            </div>
          </motion.div>
          
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Powerful Features, Simple Interface</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Everything you need to create stunning virtual experiences, with no technical skills required.
              </p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📸",
                title: "360° Photo Tours",
                description: "Create virtual tours using 360° panoramic images. Perfect for real estate, showcasing venues, and more."
              },
              {
                icon: "🎥",
                title: "360° Video Tours",
                description: "Create immersive video-based tours with interactive elements. Great for guided experiences."
              },
              {
                icon: "🔗",
                title: "Interactive Hotspots",
                description: "Add interactive elements like text, images, videos, quizzes, and navigation points to your tours."
              },
              {
                icon: "🔌",
                title: "Easy Embedding",
                description: "Seamlessly embed your virtual tours on your website, social media, or share via direct link."
              },
              {
                icon: "📱",
                title: "Mobile Optimized",
                description: "Your virtual tours work perfectly on all devices - desktops, tablets, and mobile phones."
              },
              {
                icon: "📊",
                title: "Analytics Dashboard",
                description: "Track visitor engagement, popular hotspots, and tour performance with detailed analytics."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow p-8 border border-gray-200 dark:border-gray-700"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-blue-50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Create and publish your first virtual tour in minutes with our intuitive platform.
              </p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 z-0"></div>
            
            {[
              { 
                step: "01", 
                title: "Upload",
                description: "Upload your 360° photos or videos to our platform",
                icon: "📤"
              },
              { 
                step: "02", 
                title: "Customize",
                description: "Add interactive elements, media, and custom branding",
                icon: "✨"
              },
              { 
                step: "03", 
                title: "Publish",
                description: "Share your tour via link or embed on your website",
                icon: "🚀"
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg z-10 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {step.step}
                  </div>
                  <div className="text-3xl">{step.icon}</div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Choose the plan that works for your needs. All plans include our core features with different usage limits.
              </p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Free</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Perfect for beginners</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span>
                  <span className="text-lg text-gray-500 dark:text-gray-400 ml-2">/month</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {[
                    '2 Virtual Tours',
                    '3 Scenes per tour',
                    '5 Hotspots per scene',
                    '360° Video support',
                    'Basic analytics',
                    'Embed tours on websites',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="px-8 pb-8">
                <Link href="/auth/signup">
                  <Button className="w-full py-6 h-auto text-base" variant="outline">Get Started</Button>
                </Link>
              </div>
            </motion.div>
            
            {/* Professional Plan */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/40 dark:to-gray-800 rounded-2xl overflow-hidden border-2 border-blue-500 dark:border-blue-400 shadow-xl hover:shadow-2xl transition-shadow transform md:-translate-y-4"
            >
              <div className="bg-blue-500 dark:bg-blue-600 text-white py-2 text-center text-sm font-semibold">
                MOST POPULAR
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Professional</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">For serious creators</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$29</span>
                  <span className="text-lg text-gray-500 dark:text-gray-400 ml-2">/month</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {[
                    '20 Virtual Tours',
                    '50 Scenes per tour',
                    '20 Hotspots per scene',
                    '360° Video support',
                    'Advanced analytics',
                    'Embed tours on websites',
                    'Priority support',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="px-8 pb-8">
                <Link href="/auth/signup">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 h-auto text-base shadow-lg hover:shadow-xl transition-all">Get Started</Button>
                </Link>
              </div>
            </motion.div>
            
            {/* Enterprise Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Enterprise</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">For large organizations</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$99</span>
                  <span className="text-lg text-gray-500 dark:text-gray-400 ml-2">/month</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {[
                    '100 Virtual Tours',
                    '100 Scenes per tour',
                    '50 Hotspots per scene',
                    '360° Video support',
                    'Advanced analytics',
                    'Embed tours on websites',
                    'Priority support',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="px-8 pb-8">
                <Link href="/auth/signup">
                  <Button className="w-full py-6 h-auto text-base" variant="outline">Get Started</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Perfect for Any Industry</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Discover how virtual tours can transform your business or organization.
              </p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Real Estate",
                description: "Offer virtual property tours 24/7, saving time and attracting more potential buyers.",
                color: "from-blue-400 to-blue-600"
              },
              {
                title: "Tourism & Hospitality",
                description: "Showcase hotels, resorts, and tourist attractions with immersive virtual experiences.",
                color: "from-green-400 to-green-600"
              },
              {
                title: "Education",
                description: "Create interactive learning environments for students with engaging content.",
                color: "from-amber-400 to-amber-600"
              },
              {
                title: "Events & Venues",
                description: "Allow clients to explore your venue virtually before booking for their events.",
                color: "from-purple-400 to-purple-600"
              }
            ].map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer relative"
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-tr ${useCase.color} opacity-80 group-hover:opacity-90 transition-opacity`}></div>
                  <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                    <h3 className="text-xl font-bold mb-2 group-hover:translate-y-0 translate-y-2 transition-transform duration-300">{useCase.title}</h3>
                    <p className="text-white/90 text-sm group-hover:opacity-100 opacity-0 transform group-hover:translate-y-0 translate-y-4 transition-all duration-300">{useCase.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Get answers to common questions about VueTour.
              </p>
            </motion.div>
          </div>
          
          <div className="max-w-3xl mx-auto">
            {[
              {
                question: "What equipment do I need to create 360° tours?",
                answer: "You can use any 360° camera or smartphone with a panoramic lens attachment. Our platform accepts standard panoramic image formats like equirectangular JPGs and 360° videos."
              },
              {
                question: "Do I need technical skills to use VueTour?",
                answer: "No technical skills required! Our intuitive drag-and-drop interface makes it easy for anyone to create professional virtual tours without any coding knowledge."
              },
              {
                question: "Can I customize the appearance of my tours?",
                answer: "Absolutely! Change colors to match your brand, and customize the navigation interface. Pro and Enterprise plans offer additional branding options."
              },
              {
                question: "How do I share my completed tours?",
                answer: "You can share your tours via direct link, embed them on your website with our provided code, or share them directly to social media platforms."
              },
              {
                question: "Can I upgrade or downgrade my plan later?",
                answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll gain immediate access to new features. When downgrading, changes take effect at the end of your billing cycle."
              }
            ].map((faq, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="mb-6"
              >
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button 
                    onClick={() => toggleFaq(i)}
                    className="w-full p-6 flex justify-between items-center text-left focus:outline-none"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{faq.question}</h3>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 transform transition-transform duration-200 ${openFaqIndex === i ? 'rotate-180' : ''}`}>
                      <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </button>
                  
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="p-6 pt-0 text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Us Section */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Have questions? Get in touch with our friendly team and we'll be happy to help.
              </p>
            </motion.div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 shadow-md border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Get in Touch</h3>
                
                <div className="space-y-6">
                  <h4 className="text-base font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Global Headquarters</h4>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                    <Mail className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">Email</h4>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">contact@vuetour.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <MapPin className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">Address</h4>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Office N8, QFC Tower 1<br />
                        Doha, Qatar
                      </p>
                    </div>
                  </div>
                  
                </div>
                
                <div className="mt-8">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">Connect With Us</h4>
                  <div className="flex space-x-4">
                    <a href="https://x.com/VueTour" className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                      <span className="sr-only">X (Twitter)</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                    <a href="https://www.youtube.com/@VueTour" className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                      <span className="sr-only">YouTube</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                    <a href="https://www.linkedin.com/company/vuetour" className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                      <span className="sr-only">LinkedIn</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Send Us a Message</h3>
                <ContactForm variant="default" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Start Creating Amazing Virtual Tours Today</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses already using VueTour to create engaging virtual experiences.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-base px-8 py-6 h-auto">
                  Get Started for Free
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 py-16 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="px-1 pb-5 flex items-center space-x-2">
                {/* Replaced VT text with logo image */}
                <div className="h-15 w-15 flex items-center justify-center">
                  <Image 
                    src="/logo.png" 
                    alt="VueTour Logo" 
                    width={40} 
                    height={40} 
                    className="object-contain"
                  />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">VueTour</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Creating immersive virtual experiences for businesses and individuals worldwide.
              </p>
              <div className="flex space-x-4">
                <a href="https://x.com/VueTour" className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                  <span className="sr-only">X (Twitter)</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://www.youtube.com/@VueTour" className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                  <span className="sr-only">YouTube</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/vuetour" className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">Features</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">Pricing</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">Demo Tour</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">API Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">About Us</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">Careers</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">Blog</a></li>
                <li><Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                  <a href="mailto:contact@vuetour.com" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">contact@vuetour.com</a>
                </li>
                <li className="flex items-start">
                  <MapPin className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                  <span className="text-gray-600 dark:text-gray-400">Office N8, QFC Tower 1, Doha, Qatar</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p>© {new Date().getFullYear()} VueTour. All rights reserved.</p>
            <div className="mt-4 md:mt-0 text-sm flex space-x-6">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {showVideoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeVideoModal}
        >
          <div 
            className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 z-10 text-white bg-black/50 hover:bg-black/70 rounded-full p-1.5 transition-colors"
              onClick={closeVideoModal}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="aspect-video">
              <iframe 
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                title="VueTour Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen>
              </iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
