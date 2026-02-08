'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  ShoppingBag,
  DollarSign,
  BarChart3,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ListOrdered,
  CircleHelp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/navigation/AppHeader';

interface DashboardStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalDownloads: number;
}

interface StripeStatus {
  stripeConfigured?: boolean;
  hasAccount: boolean;
  onboardingStatus: string;
  isComplete: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  capabilitiesActive: boolean;
  needsOnboarding: boolean;
  canReceivePayments: boolean;
  stripeError?: string;
  message?: string;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading, isCreatorOrAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalDownloads: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);

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

    loadStripeStatus();
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

  const loadStripeStatus = async () => {
    try {
      setIsLoadingStripe(true);
      const response = await fetch('/api/creator/onboarding/status');
      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
      }
    } catch (error) {
      console.error('Error loading Stripe status:', error);
    } finally {
      setIsLoadingStripe(false);
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
      <AppHeader contextLabel="Dashboard" />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground">Manage your products and sales</p>
          </div>
          <Button onClick={() => router.push('/dashboard/products/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </div>

        {isCreatorOrAdmin ? (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Connect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {isLoadingStripe ? (
                  <p>Loading Stripe status...</p>
                ) : stripeStatus?.stripeConfigured === false ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{stripeStatus.message || 'Stripe Connect is not configured for this environment.'}</span>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/dashboard/creator/onboarding')}>
                      View Setup Details
                    </Button>
                  </>
                ) : stripeStatus?.canReceivePayments ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Stripe is connected and ready for payouts.</span>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/dashboard/creator/onboarding')}>
                      Manage Stripe
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Stripe setup is incomplete. Finish onboarding to receive payments.</span>
                    </div>
                    <Button onClick={() => router.push('/dashboard/creator/onboarding')}>
                      Complete Stripe Setup
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

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
          </>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="justify-start" onClick={() => router.push('/dashboard/products')}>
            <Package className="h-4 w-4 mr-2" />
            Manage Listings
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => router.push('/dashboard/orders')}>
            <ListOrdered className="h-4 w-4 mr-2" />
            View Orders
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => router.push('/dashboard/payouts')}>
            <CreditCard className="h-4 w-4 mr-2" />
            View Payouts
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => router.push('/dashboard/support')}>
            <CircleHelp className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
