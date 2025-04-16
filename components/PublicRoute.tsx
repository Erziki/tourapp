// components/PublicRoute.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface PublicRouteProps {
  children: React.ReactNode;
  redirectIfAuthenticated?: string;
}

export default function PublicRoute({
  children,
  redirectIfAuthenticated = "/dashboard",
}: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && redirectIfAuthenticated) {
      router.push(redirectIfAuthenticated);
    }
  }, [isLoading, isAuthenticated, router, redirectIfAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}