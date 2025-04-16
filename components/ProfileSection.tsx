// components/ProfileSection.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle, Camera } from "lucide-react";

export default function ProfileSection() {
  const { user, updateProfileWithImage } = useAuth();
  
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

  // Debug helper
  const logFormData = () => {
    console.log("Current form state:", {
      firstName,
      lastName,
      email,
      organization,
      bio,
      profileImage: profileImage ? "Image data present" : null
    });
  };

  // Load user data
  useEffect(() => {
    if (user) {
      console.log("Loading user data:", user.attributes);
      setFirstName(user.attributes.given_name || "");
      setLastName(user.attributes.family_name || "");
      setEmail(user.attributes.email || "");
      setOrganization(user.attributes.organization || "");
      setBio(user.attributes.bio || "");
      setProfileImage(user.attributes.profile_image || user.attributes.picture || null);
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    logFormData();
    console.log("Submitting profile update...");
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      const attributes: Record<string, string> = {
        given_name: firstName || "",
        family_name: lastName || ""
      };
      
      // Only add optional fields if they have values
      if (organization) attributes.organization = organization;
      if (bio) attributes.bio = bio;
      
      console.log("Updating profile with attributes:", attributes);
      
      await updateProfileWithImage(attributes, profileImage);
      
      setSuccessMessage("Profile updated successfully!");
      console.log("Profile updated successfully!");
    } catch (error: any) {
      console.error("Profile update error:", error);
      setErrorMessage(error.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Processing profile image:", file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfileImage(result);
        console.log("Profile image processed and set");
      };
      reader.readAsDataURL(file);
    }
  };

  // For debugging purposes
  useEffect(() => {
    console.log("ProfileSection mounted");
    return () => console.log("ProfileSection unmounted");
  }, []);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
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
                    <Camera className="h-4 w-4" />
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
                <p className="text-sm text-gray-500 mb-4">{email}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile settings */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
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
                    disabled
                    className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200"
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
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-700">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}