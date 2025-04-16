// app/(protected)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext"; // Add this import

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { currentSubscription, isLoading: isSubscriptionLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/landing');
    }
  }, [isLoading, isAuthenticated, router]);

  // Handle subscription-specific redirects
  useEffect(() => {
    // Only execute after both auth and subscription are loaded
    if (!isLoading && !isSubscriptionLoading && isAuthenticated && currentSubscription) {
      // If payment is past due and trying to access sensitive pages, redirect to subscription page
      if (currentSubscription.status === 'past_due' && 
          !pathname.includes('/subscription') && 
          !pathname.includes('/dashboard')) {
        router.push('/subscription');
      }
    }
  }, [isLoading, isSubscriptionLoading, isAuthenticated, currentSubscription, pathname, router]);

  if (isLoading || isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}