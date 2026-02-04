'use client';

import { useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronDown,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Upload,
  LogOut,
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
  onLogout: () => Promise<void> | void;
}

export function DashboardMenu({ user, isCreatorOrAdmin, onLogout }: DashboardMenuProps) {
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
        {isCreatorOrAdmin ? (
          <DropdownMenuItem onSelect={() => router.push('/dashboard/products')}>
            <Package className="h-4 w-4" />
            Products
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
