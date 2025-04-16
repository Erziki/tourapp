// app/auth/confirm/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import PublicRoute from "@/components/PublicRoute";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  code: z.string().min(6, { message: "Please enter a valid confirmation code" }),
});

type FormData = z.infer<typeof formSchema>;

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const { confirmSignUp, resendConfirmationCode, error, clearError, isLoading } = useAuth();
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setValue("email", emailParam);
    }
  }, [searchParams, setValue]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  const onSubmit = async (data: FormData) => {
    setAuthError(null);
    clearError();
    setSuccessMessage(null);
    
    try {
      await confirmSignUp(data.email, data.code);
      setSuccessMessage("Email confirmed successfully! Redirecting to login...");
      
      // Redirect to sign in page after a brief delay
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    } catch (err: any) {
      setAuthError(err.message || "An error occurred during confirmation");
    }
  };

  const handleResendCode = async () => {
    if (resendDisabled) return;
    
    setAuthError(null);
    clearError();
    setSuccessMessage(null);
    
    try {
      await resendConfirmationCode(email);
      setSuccessMessage("Confirmation code resent. Please check your email.");
      setResendDisabled(true);
      setCountdown(60); // Disable resend for 60 seconds
    } catch (err: any) {
      setAuthError(err.message || "An error occurred when resending the code");
    }
  };

  return (
    <PublicRoute>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Confirm Your Account</CardTitle>
            <CardDescription className="text-center">
              Enter the confirmation code sent to your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  disabled={isLoading || !!email}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Confirmation Code</Label>
                <Input
                  id="code"
                  placeholder="Enter your verification code"
                  {...register("code")}
                  disabled={isLoading}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code.message}</p>
                )}
              </div>

              {(error || authError) && (
                <Alert variant="destructive">
                  <AlertDescription>{error || authError}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Confirming..." : "Confirm Account"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendCode}
                  disabled={resendDisabled || isLoading}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {resendDisabled
                    ? `Resend code (${countdown}s)`
                    : "Didn't receive a code? Resend"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <p className="text-sm text-gray-500">
              Return to{" "}
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </PublicRoute>
  );
}