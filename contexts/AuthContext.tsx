// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { 
  signUp, 
  confirmSignUp, 
  signIn as amplifySignIn, 
  signOut as amplifySignOut, 
  fetchUserAttributes, 
  getCurrentUser, 
  resetPassword, 
  confirmResetPassword, 
  resendSignUpCode, 
  updateUserAttributes
} from 'aws-amplify/auth';
import { useRouter, usePathname } from 'next/navigation';
import { configureAmplify } from '@/lib/auth/amplify-config';
import { uploadBase64ImageToS3 } from '@/lib/aws/s3-media-utils';

// Initialize Amplify on client side only
if (typeof window !== 'undefined') {
  configureAmplify();
}

interface UserAttributes {
  email?: string;
  email_verified?: string;
  given_name?: string;
  family_name?: string;
  sub?: string;
  organization?: string;
  bio?: string;
  profile_image?: string;
  picture?: string; // Standard Cognito attribute that might exist
  created_at?: string;
  updated_at?: string;
  [key: string]: string | undefined;
}

interface AuthUser {
  username: string;
  attributes: UserAttributes;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
  signUp: (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string
  ) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  resendConfirmationCode: (email: string) => Promise<void>;
  updateProfile: (attributes: Record<string, string>) => Promise<void>;
  updateProfileWithImage: (attributes: Record<string, string>, profileImage?: string | null) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateEmail: (newEmail: string, password: string) => Promise<void>;
  verifyNewEmail: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  signUp: async () => {},
  confirmSignUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  clearError: () => {},
  resendConfirmationCode: async () => {},
  updateProfile: async () => {},
  updateProfileWithImage: async () => {},
  changePassword: async () => {},
  updateEmail: async () => {},
  verifyNewEmail: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Add check to identify public routes that don't need authentication
  const isPublicRoute = (path: string): boolean => {
    return (
      path.startsWith('/landing') ||
      path.startsWith('/auth/') ||
      path.startsWith('/embed/') ||
      path.startsWith('/api/')
    );
  };

  useEffect(() => {
    // Skip auth check for public routes
    if (isPublicRoute(pathname)) {
      setIsLoading(false);
      return;
    }
    
    checkAuthState();
  }, [pathname]);

  const checkAuthState = async () => {
    setIsLoading(true);
    try {
      // Get current authenticated user
      const currentUser = await getCurrentUser();
      const userAttributes = await fetchUserAttributes();
      
      // Format user data
      const userData: AuthUser = {
        username: currentUser.username,
        attributes: userAttributes || {},
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // If user is authenticated and on an auth page, redirect to dashboard
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/auth/') || path === '/landing') {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error('Auth state check error:', err);
      setUser(null);
      setIsAuthenticated(false);
      
      // Only redirect to landing for protected routes, not for public routes
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (!isPublicRoute(path) && path !== '/') {
          router.push('/landing');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      console.log('Signing up with:', { email, firstName, lastName });
      
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
          },
          autoSignIn: true
        }
      });
      
      console.log('Sign up successful', { isSignUpComplete, userId, nextStep });
      
      if (!isSignUpComplete && nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        // This is expected - user needs to confirm their email
        console.log('User needs to confirm signup');
      }
      
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'An error occurred during sign up');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      
      // After confirmation, we'll check auth state again
      await checkAuthState();
    } catch (err: any) {
      console.error('Confirm sign up error:', err);
      setError(err.message || 'An error occurred during confirmation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmationCode = async (email: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      await resendSignUpCode({
        username: email
      });
      console.log('Confirmation code resent successfully');
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err.message || 'An error occurred sending the code');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      console.log('Signing in with:', email);
      
      const { isSignedIn, nextStep } = await amplifySignIn({
        username: email,
        password
      });
      
      if (isSignedIn) {
        console.log('Sign in successful');
        
        // Recheck auth state to set user
        await checkAuthState();
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        setError('Please check your email and confirm your account first.');
        await handleResendConfirmationCode(email);
        router.push(`/auth/confirm?email=${encodeURIComponent(email)}`);
      } else {
        // Handle other next steps if needed
        console.log('Next sign in step:', nextStep);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      
      // Handle specific error codes
      if (err.name === 'UserNotConfirmedException') {
        setError('Please check your email and confirm your account first.');
        await handleResendConfirmationCode(email);
        router.push(`/auth/confirm?email=${encodeURIComponent(email)}`);
      } else if (err.name === 'NotAuthorizedException') {
        setError('Incorrect username or password.');
      } else {
        setError(err.message || 'An error occurred during sign in');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    clearError();
    
    try {
      await amplifySignOut();
      
      setIsAuthenticated(false);
      setUser(null);
      
      // Redirect to landing page
      router.push('/landing');
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'An error occurred during sign out');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      await resetPassword({
        username: email
      });
      console.log('Forgot password initiated');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'An error occurred during password reset request');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string, code: string, newPassword: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword
      });
      console.log('Password reset successful');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'An error occurred during password reset');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (attributes: Record<string, string>) => {
    setIsLoading(true);
    clearError();
    
    try {
      // Log the attributes we're updating
      console.log('Updating user attributes:', attributes);
      
      // Ensure all attribute values are strings
      const stringAttributes: Record<string, string> = {};
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== null && value !== undefined) {
          stringAttributes[key] = String(value);
        }
      }
      
      await updateUserAttributes({
        userAttributes: stringAttributes
      });
      
      // Refresh user data
      await checkAuthState();
      
      console.log('Profile updated successfully');
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'An error occurred updating your profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfileWithImage = async (attributes: Record<string, string>, profileImage?: string | null) => {
    setIsLoading(true);
    clearError();
    
    try {
      console.log('Current user:', user?.attributes);
      console.log('Updating profile with attributes:', attributes);
      
      // Create a copy of attributes to avoid modifying the original
      const updatedAttributes: Record<string, string> = {};
      
      // Basic profile information
      updatedAttributes.given_name = attributes.given_name || '';
      updatedAttributes.family_name = attributes.family_name || '';
      
      // Add optional attributes if they're provided
      if (attributes.organization) {
        updatedAttributes.organization = attributes.organization;
      }
      
      if (attributes.bio) {
        updatedAttributes.bio = attributes.bio;
      }
      
      // Handle profile image upload
      if (profileImage && profileImage.startsWith('data:image')) {
        console.log('Uploading profile image to S3...');
        
        try {
          // Get user ID from Cognito
          const userId = user?.attributes.sub;
          if (!userId) {
            throw new Error('User ID not available');
          }
          
          // Upload image to S3
          const profileImageUrl = await uploadBase64ImageToS3(
            userId, 
            profileImage, 
            'profile-photo.jpg',
            (progress) => console.log(`Upload progress: ${progress}%`)
          );
          
          console.log('Profile image uploaded successfully:', profileImageUrl);
          
          // Since we know picture exists and is writable, use it directly
          updatedAttributes.picture = profileImageUrl;
        } catch (imgError) {
          console.error('Error uploading profile image:', imgError);
        }
      } else if (profileImage === null) {
        // If explicitly set to null, clear the picture attribute
        updatedAttributes.picture = '';
      }
      
      console.log('Final attributes to update:', updatedAttributes);
      
      // Update user attributes in Cognito
      await updateUserAttributes({
        userAttributes: updatedAttributes
      });
      
      // Refresh user data to get updated attributes
      await checkAuthState();
      
      console.log('Profile updated successfully');
    } catch (err: any) {
      console.error('Update profile error:', err);
      
      // Check if the error is due to an attribute not existing in schema
      if (err.message && err.message.includes('Attribute does not exist in the schema')) {
        // Still throw the error so the UI can handle it appropriately
        setError('Some profile attributes could not be updated. Basic information was saved.');
      } else {
        setError(err.message || 'An error occurred updating your profile');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Starting password change process");
      
      // Import Auth from aws-amplify for the changePassword method
      // This uses the compat API which is more reliable for this operation
      const Auth = (await import('aws-amplify')).Auth;
      
      // Get the current authenticated user
      const user = await Auth.currentAuthenticatedUser();
      console.log("Got current authenticated user");
      
      // Use the Auth object to change password
      await Auth.changePassword(user, oldPassword, newPassword);
      
      console.log("Password changed successfully");
      return true;
    } catch (err: any) {
      console.error("Change password error:", err);
      
      // Provide more specific error messages based on the error type
      if (err.name === "NotAuthorizedException") {
        setError("Incorrect current password. Please try again.");
      } else if (err.name === "InvalidPasswordException") {
        setError(err.message || "Password does not meet the requirements.");
      } else if (err.name === "LimitExceededException") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err.message || "An error occurred changing your password");
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (newEmail: string, password: string): Promise<void> => {
    setIsLoading(true);
    clearError();
    
    try {
      // Get the current authenticated user
      const AuthCompat = await import('aws-amplify').then(module => module.Auth);
      const user = await AuthCompat.currentAuthenticatedUser();
      
      // Update email attribute
      await updateUserAttributes({
        userAttributes: {
          email: newEmail
        }
      });
      
      // Get verification code sent to the new email
      console.log('Email update initiated. Verification code sent to new email.');
      
      // Refresh user data
      await checkAuthState();
      
      return;
    } catch (err: any) {
      console.error('Update email error:', err);
      
      if (err.code === 'CodeDeliveryFailureException') {
        setError('Failed to send verification code to new email. Please try again.');
      } else if (err.code === 'InvalidPasswordException') {
        setError('Incorrect password provided.');
      } else if (err.code === 'AliasExistsException') {
        setError('This email is already in use by another account.');
      } else {
        setError(err.message || 'An error occurred updating your email');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNewEmail = async (code: string): Promise<void> => {
    setIsLoading(true);
    clearError();
    
    try {
      const AuthCompat = await import('aws-amplify').then(module => module.Auth);
      
      // Verify the new email with the code
      await AuthCompat.verifyCurrentUserAttributeSubmit('email', code);
      
      console.log('Email successfully verified');
      
      // Refresh user data
      await checkAuthState();
      
      return;
    } catch (err: any) {
      console.error('Verify email error:', err);
      
      if (err.code === 'CodeMismatchException') {
        setError('Verification code is incorrect. Please try again.');
      } else if (err.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
      } else {
        setError(err.message || 'An error occurred verifying your email');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    error,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    clearError,
    resendConfirmationCode: handleResendConfirmationCode,
    updateProfile: handleUpdateProfile,
    updateProfileWithImage: handleUpdateProfileWithImage,
    changePassword: handleChangePassword,
    updateEmail: handleUpdateEmail,
    verifyNewEmail: handleVerifyNewEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};