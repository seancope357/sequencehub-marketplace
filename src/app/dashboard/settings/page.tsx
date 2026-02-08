'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';
import { SettingsForm } from '@/components/dashboard/settings/SettingsForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RequestTimeoutError,
  fetchWithTimeout,
  getApiErrorMessage,
} from '@/lib/network/fetch-with-timeout';
import { defaultSettingsValues, type SettingsPayload } from '@/lib/schemas/settings';

const SETTINGS_TIMEOUT_MS = 12000;

type SettingsPageState = 'loading' | 'ready' | 'error';

interface SettingsApiResponse {
  settings: SettingsPayload;
  accountEmail: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<SettingsPageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [settings, setSettings] = useState<SettingsPayload>(defaultSettingsValues);
  const [accountEmail, setAccountEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setPageState('loading');
      setErrorMessage('');

      const response = await fetchWithTimeout(
        '/api/dashboard/settings',
        {
          cache: 'no-store',
        },
        SETTINGS_TIMEOUT_MS
      );

      if (response.status === 401 || response.status === 403) {
        router.replace('/auth/login?next=%2Fdashboard%2Fsettings');
        return;
      }

      if (!response.ok) {
        const apiError = await getApiErrorMessage(
          response,
          'Unable to load account settings right now.'
        );
        setErrorMessage(apiError);
        setPageState('error');
        return;
      }

      const payload = (await response.json()) as SettingsApiResponse;
      setSettings(payload.settings);
      setAccountEmail(payload.accountEmail);
      setPageState('ready');
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        setErrorMessage(
          'Loading settings took too long. Please retry. If this persists, verify database connectivity.'
        );
      } else {
        setErrorMessage('Unable to load account settings right now.');
      }
      setPageState('error');
    }
  }, [router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (payload: SettingsPayload) => {
    try {
      setIsSaving(true);
      const response = await fetchWithTimeout(
        '/api/dashboard/settings',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        SETTINGS_TIMEOUT_MS
      );

      if (!response.ok) {
        const apiError = await getApiErrorMessage(response, 'Failed to save settings');
        toast.error(apiError);
        return;
      }

      const data = await response.json();
      setSettings(data.settings);
      toast.success(data.message || 'Settings saved successfully.');
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        toast.error('Save request timed out. Please retry.');
      } else {
        toast.error('Failed to save settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Settings" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <SellerSidebarNav />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your seller profile, preferences, notifications, and dashboard defaults.
          </p>
        </div>

        {pageState === 'loading' ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : null}

        {pageState === 'error' ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load settings</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{errorMessage}</p>
              <Button variant="secondary" onClick={loadSettings}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {pageState === 'ready' ? (
          <>
            <SettingsForm
              initialValues={settings}
              accountEmail={accountEmail}
              isSaving={isSaving}
              onSave={handleSave}
            />

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Manage your current session and account access controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Signing out clears your current session from this device.
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                    router.replace('/auth/login');
                  }}
                >
                  Sign out
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

