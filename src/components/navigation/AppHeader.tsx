'use client';

import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SequenceHubLogo } from '@/components/branding/SequenceHubLogo';
import { DashboardMenu } from '@/components/navigation/DashboardMenu';
import { useAuth } from '@/hooks/use-auth';

interface AppHeaderProps {
  contextLabel?: string;
  showBrowse?: boolean;
  browseLabel?: string;
  browseHref?: string;
}

export function AppHeader({
  contextLabel,
  showBrowse = true,
  browseLabel = 'Browse',
  browseHref = '/browse',
}: AppHeaderProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isCreatorOrAdmin, isAdmin, logout } = useAuth();

  const showDashboardMenu = !isLoading && isAuthenticated;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => router.push('/')}
              aria-label="Go to homepage"
            >
              <SequenceHubLogo variant="header" />
            </button>
            {contextLabel ? (
              <>
                <span className="text-muted-foreground">/</span>
                <span>{contextLabel}</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {showDashboardMenu ? (
              <>
                {showBrowse ? (
                  <Button variant="ghost" onClick={() => router.push(browseHref)}>
                    {browseLabel}
                  </Button>
                ) : null}
                <DashboardMenu
                  user={user}
                  isCreatorOrAdmin={isCreatorOrAdmin}
                  isAdmin={isAdmin}
                  onLogout={handleLogout}
                />
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push('/auth/login')}>
                  Login
                </Button>
                {showBrowse ? (
                  <Button variant="outline" onClick={() => router.push(browseHref)}>
                    {browseLabel}
                  </Button>
                ) : null}
                <Button onClick={() => router.push('/auth/register')} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Start Selling
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
