// src/components/onboarding/CreatorOnboarding.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function CreatorOnboarding() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
  });

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Here you would typically save the profileData to your database
      // For this example, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Your creator profile has been saved!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Creator Profile</h1>
          <p className="text-muted-foreground">
            This is how buyers will see you on the marketplace.
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Your creative name"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  className="text-lg h-12"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <Textarea
                  placeholder="Tell the community about your experience with xLights..."
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={4}
                  maxLength={250}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {profileData.bio.length}/250 characters
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button
                onClick={handleComplete}
                disabled={isLoading || !profileData.displayName}
                className="gap-2"
              >
                {isLoading ? 'Saving...' : 'Complete Profile'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}