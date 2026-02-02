'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, ExternalLink, RefreshCw, CreditCard } from 'lucide-react';

interface OnboardingStatus {
  hasAccount: boolean;
  stripeAccountId?: string;
  onboardingStatus: string;
  isComplete: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  capabilitiesActive: boolean;
  needsOnboarding: boolean;
  canReceivePayments: boolean;
}

function CreatorOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for return parameters
  const isSuccess = searchParams.get('success') === 'true';
  const isRefresh = searchParams.get('refresh') === 'true';

  // Fetch onboarding status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/creator/onboarding/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);

      // If returning from successful onboarding, show success message
      if (isSuccess && data.isComplete) {
        setSuccessMessage('Stripe account connected successfully! You can now receive payments.');
      } else if (isRefresh && !data.isComplete) {
        setSuccessMessage('Please complete the onboarding process to start receiving payments.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
      console.error('Error fetching onboarding status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Start onboarding process
  const handleStartOnboarding = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/creator/onboarding/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start onboarding');
      }

      // Redirect to Stripe onboarding
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      console.error('Error starting onboarding:', err);
      setActionLoading(false);
    }
  };

  // Open Stripe Dashboard
  const handleOpenDashboard = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/creator/onboarding/dashboard');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get dashboard link');
      }

      // Open dashboard in new tab
      if (data.dashboardUrl) {
        window.open(data.dashboardUrl, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open dashboard');
      console.error('Error opening dashboard:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Refresh status
  const handleRefresh = () => {
    fetchStatus();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stripe Connect Setup</h1>
        <p className="text-muted-foreground">
          Connect your Stripe account to receive payments from your product sales
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 border-green-500 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              Current state of your Stripe Connect integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Account Exists */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Stripe Account Created</span>
                {status?.hasAccount ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Details Submitted */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Details Submitted</span>
                {status?.detailsSubmitted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Capabilities Active */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment Capabilities Active</span>
                {status?.capabilitiesActive ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Charges Enabled */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ready to Accept Payments</span>
                {status?.canReceivePayments ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Overall Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Overall Status</span>
                  <span className={`text-sm font-semibold ${
                    status?.isComplete ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {status?.onboardingStatus || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              {status?.isComplete
                ? 'Your account is ready to receive payments'
                : 'Complete your Stripe onboarding to start selling'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!status?.isComplete ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You need to complete the Stripe onboarding process before you can receive
                  payments. This includes verifying your identity and providing bank account
                  information for payouts.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleStartOnboarding}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {status?.hasAccount ? 'Continue Setup' : 'Connect with Stripe'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={actionLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Your Stripe account is fully connected. You can manage your payouts,
                  view transactions, and update your account settings in the Stripe Dashboard.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleOpenDashboard}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Stripe Dashboard
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={actionLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Stripe Connect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              SequenceHUB uses Stripe Connect to process payments. This allows you to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Receive payments directly to your bank account</li>
              <li>Manage your own payout schedule</li>
              <li>Track all transactions in your Stripe Dashboard</li>
              <li>Get detailed financial reports and tax documents</li>
            </ul>
            <p className="pt-2">
              Platform fee: <span className="font-semibold">10%</span> of each sale
              (automatically deducted from payments)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreatorOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <CreatorOnboardingContent />
    </Suspense>
  );
}
