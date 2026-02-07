'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useAuth } from '@/hooks/use-auth';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SellerPayoutStatus {
  stripeConfigured: boolean;
  hasAccount: boolean;
  canReceivePayments: boolean;
  onboardingStatus: string;
  stripeError?: string;
  message?: string;
  payoutSchedule?: string | null;
  revenue: {
    grossSales: number;
    totalSales: number;
  };
}

export default function DashboardPayoutsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, isCreatorOrAdmin } = useAuth();
  const [status, setStatus] = useState<SellerPayoutStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    void loadPayoutStatus();
  }, [authLoading, isAuthenticated, isCreatorOrAdmin, router]);

  async function loadPayoutStatus() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/payouts', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.error || 'Failed to load payouts');
      }

      const payload = (await response.json()) as SellerPayoutStatus;
      setStatus(payload);
    } catch (loadError) {
      console.error('Failed to load payout status:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading payouts...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Dashboard / Payouts" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <SellerSidebarNav />

        <div>
          <h1 className="text-3xl font-bold">Payouts</h1>
          <p className="text-muted-foreground">Track Stripe readiness and payout eligibility.</p>
        </div>

        {error ? (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void loadPayoutStatus()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {status ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!status.stripeConfigured ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{status.message || 'Stripe is not configured for this environment.'}</span>
                  </div>
                ) : status.canReceivePayments ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Stripe account is ready to receive payments.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {status.stripeError || 'Stripe onboarding is incomplete. Complete onboarding to receive payouts.'}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Onboarding: {status.onboardingStatus}</Badge>
                  <Badge variant="outline">Payout schedule: {status.payoutSchedule || 'manual'}</Badge>
                  <Badge variant={status.canReceivePayments ? 'default' : 'secondary'}>
                    {status.canReceivePayments ? 'Payments Enabled' : 'Payments Disabled'}
                  </Badge>
                </div>

                <Button onClick={() => router.push('/dashboard/creator/onboarding')}>
                  Manage Stripe Connect
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gross sales</span>
                  <span className="font-medium">{formatCurrency(status.revenue.grossSales)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total sales</span>
                  <span className="font-medium">{status.revenue.totalSales}</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
