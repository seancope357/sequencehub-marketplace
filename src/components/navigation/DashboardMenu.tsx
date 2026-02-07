'use client';

import { useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronDown,
  CircleHelp,
  CreditCard,
  ListOrdered,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Upload,
  LogOut,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AuthUser } from '@/lib/auth-types';

interface DashboardMenuProps {
  user: AuthUser | null;
  isCreatorOrAdmin: boolean;
  isAdmin: boolean;
  onLogout: () => Promise<void> | void;
}

export function DashboardMenu({ user, isCreatorOrAdmin, isAdmin, onLogout }: DashboardMenuProps) {
  const router = useRouter();

  const displayName = user?.profile?.displayName
    || user?.name
    || user?.email
    || 'Account';

  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {userInitial}
          </span>
          <span>Dashboard</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/dashboard')}>
          <BarChart3 className="h-4 w-4" />
          Overview
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem onSelect={() => router.push('/admin')}>
            <Shield className="h-4 w-4" />
            Admin Panel
          </DropdownMenuItem>
        ) : null}
        {isCreatorOrAdmin ? (
          <DropdownMenuItem onSelect={() => router.push('/dashboard/products')}>
            <Package className="h-4 w-4" />
            Listings
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => router.push('/dashboard/creator/onboarding')}>
            <Upload className="h-4 w-4" />
            Start Selling
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => router.push('/library')}>
          <ShoppingBag className="h-4 w-4" />
          Library
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')}>
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        {isCreatorOrAdmin ? (
          <>
            <DropdownMenuItem onSelect={() => router.push('/dashboard/orders')}>
              <ListOrdered className="h-4 w-4" />
              Orders
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/dashboard/payouts')}>
              <CreditCard className="h-4 w-4" />
              Payouts
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/dashboard/support')}>
              <CircleHelp className="h-4 w-4" />
              Support
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/')}>
          <Package className="h-4 w-4" />
          Marketplace
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/browse')}>
          <Search className="h-4 w-4" />
          Browse
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void onLogout()}>
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
