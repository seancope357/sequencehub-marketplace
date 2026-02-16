'use client';

import { useEffect } from 'react';
import { User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Settings" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
            <p className="text-muted-foreground mb-4">Manage your account and preferences</p>
            <SellerSidebarNav />
          </div>

          {/* Account Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-base">{user.name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-base">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                <p className="text-base">{user.roles.join(', ')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon */}
          <Card>
            <CardHeader>
              <CardTitle>More Settings Coming Soon</CardTitle>
              <CardDescription>We're working on additional settings</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Update profile information</li>
                <li>• Change password</li>
                <li>• Notification preferences</li>
                <li>• Stripe Connect settings</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
