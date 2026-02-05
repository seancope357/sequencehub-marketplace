'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type RoleName = 'ADMIN' | 'CREATOR' | 'BUYER';

interface AdminUserRoleActionsProps {
  userId: string;
  roles: RoleName[];
  isSelf?: boolean;
}

const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: 'Admin',
  CREATOR: 'Creator',
  BUYER: 'Buyer',
};

export function AdminUserRoleActions({ userId, roles, isSelf }: AdminUserRoleActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const hasRole = (role: RoleName) => roles.includes(role);

  const updateRole = async (role: RoleName, action: 'add' | 'remove') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: action === 'add' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error || 'Failed to update role');
        return;
      }

      toast.success(`${ROLE_LABELS[role]} role ${action === 'add' ? 'added' : 'removed'}`);
      window.location.reload();
    } catch (error) {
      console.error('Role update error:', error);
      toast.error('Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          Manage Roles
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          disabled={hasRole('CREATOR') || isLoading}
          onSelect={() => updateRole('CREATOR', 'add')}
        >
          Add Creator
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasRole('CREATOR') || isLoading}
          onSelect={() => updateRole('CREATOR', 'remove')}
        >
          Remove Creator
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={hasRole('ADMIN') || isLoading}
          onSelect={() => updateRole('ADMIN', 'add')}
        >
          Add Admin
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasRole('ADMIN') || isLoading || isSelf}
          onSelect={() => updateRole('ADMIN', 'remove')}
        >
          Remove Admin
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
