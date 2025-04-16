// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Upload, UserCircle, Lock, Mail, Building } from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, signOut, updateProfile, changePassword } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  
  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load user data
  useEffect(() => {
    if (user) {
      setFirstName(user.attributes.given_name || "");
      setLastName(user.attributes.family_name || "");
      setEmail(user.attributes.email || "");
      setOrganization(user.attributes.organization || "");
      setBio(user.attributes.bio || "");
      // Profile image could be stored as a URL in custom attributes
      setProfileImage(user.attributes.profile_image || null);
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      // Update user attributes in Cognito
      await updateProfile({
        given_name: firstName,
        family_name: lastName,
        organization: organization,
        bio: bio,
        ...(profileImage && { profile_image: profileImage })
      });
      
      setSuccessMessage("Profile updated successfully!");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords don't match");
      setIsSubmitting(false);
      return;
    }
    
    try {
      await changePassword(currentPassword, newPassword);
      
      setSuccessMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // If still loading, show simple loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="bg-black text-white dark:bg-white dark:text-black p-2 rounded-lg font-bold">VT</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Virtual Tour</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sign Out
                </Button>
                <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium">
                  {user?.attributes?.given_name?.[0] || user?.attributes?.email?.[0] || "U"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="flex items-center mb-6">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
              <p className="text-gray-500 dark:text-gray-400">Manage your account settings and preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Profile sidebar */}
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-4">
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="Profile" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <UserCircle className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 cursor-pointer bg-blue-500 rounded-full p-1.5 text-white">
                        <Upload className="h-4 w-4" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleProfileImageChange} 
                        />
                      </label>
                    </div>
                    <h3 className="text-lg font-medium mb-1">
                      {firstName} {lastName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{email}</p>
                    <Link href="/dashboard">
                      <Button variant="outline" className="w-full">Back to Dashboard</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile settings */}
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Update your profile information and account settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                      <TabsTrigger value="personal">
                        <UserCircle className="h-4 w-4 mr-2" />
                        Personal Info
                      </TabsTrigger>
                      <TabsTrigger value="security">
                        <Lock className="h-4 w-4 mr-2" />
                        Security
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="personal">
                      <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">First Name</label>
                            <Input 
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="Your first name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Last Name</label>
                            <Input 
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Your last name"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email</label>
                          <Input 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            disabled
                          />
                          <p className="text-xs text-gray-500">Email cannot be changed</p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Organization (Optional)</label>
                          <Input 
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            placeholder="Your company or organization"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Bio (Optional)</label>
                          <Textarea 
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself"
                            rows={4}
                          />
                        </div>
                        
                        {successMessage && (
                          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
                            <AlertDescription className="text-green-700 dark:text-green-300">
                              {successMessage}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {errorMessage && (
                          <Alert variant="destructive">
                            <AlertDescription>{errorMessage}</AlertDescription>
                          </Alert>
                        )}
                        
                        <Button 
                          type="submit" 
                          className="w-full sm:w-auto"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="security">
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Current Password</label>
                          <Input 
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">New Password</label>
                          <Input 
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Confirm New Password</label>
                          <Input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                        </div>
                        
                        {successMessage && (
                          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
                            <AlertDescription className="text-green-700 dark:text-green-300">
                              {successMessage}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {errorMessage && (
                          <Alert variant="destructive">
                            <AlertDescription>{errorMessage}</AlertDescription>
                          </Alert>
                        )}
                        
                        <Button 
                          type="submit" 
                          className="w-full sm:w-auto"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Updating..." : "Update Password"}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-between">
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Member since: {new Date().toLocaleDateString()}
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}