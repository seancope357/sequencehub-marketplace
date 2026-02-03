'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ShoppingBag, DollarSign, BarChart3, Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';

interface DashboardStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalDownloads: number;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading, logout, isCreatorOrAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalDownloads: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isCreatorOrAdmin) {
      loadStats();
    } else {
      setIsLoadingStats(false);
    }
  }, [isAuthenticated, authLoading, isCreatorOrAdmin, router]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Show loading while auth or stats are loading
  if (authLoading || isLoadingStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold cursor-pointer" onClick={() => router.push('/')}>
                SequenceHUB
              </span>
              <span className="text-muted-foreground">/</span>
              <span>Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-semibold">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm">{user.name || 'User'}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                Marketplace
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {isCreatorOrAdmin ? 'Creator Dashboard' : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {isCreatorOrAdmin ? 'Manage your products and sales' : 'Welcome to your account'}
            </p>
          </div>
          {isCreatorOrAdmin ? (
            <Button onClick={() => router.push('/dashboard/products/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          ) : (
            <Button onClick={() => router.push('/dashboard/creator/onboarding')}>
              <Plus className="h-4 w-4 mr-2" />
              Start Selling
            </Button>
          )}
        </div>

        {isCreatorOrAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSales}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDownloads}</div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Start Selling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Connect Stripe to receive payouts and publish your first sequence.
              </p>
              <Button onClick={() => router.push('/dashboard/creator/onboarding')}>
                Connect Stripe
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Tabs */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" onClick={() => router.push('/dashboard/products')}>
              Products
            </TabsTrigger>
            <TabsTrigger value="settings" onClick={() => router.push('/dashboard/settings')}>
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  View all your products in the Products tab
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Manage your account settings in the Settings tab
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
