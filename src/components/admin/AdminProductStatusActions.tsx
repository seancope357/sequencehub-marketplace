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

type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SUSPENDED';

interface AdminProductStatusActionsProps {
  productId: string;
  status: ProductStatus;
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  SUSPENDED: 'Suspended',
};

export function AdminProductStatusActions({ productId, status }: AdminProductStatusActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = async (nextStatus: ProductStatus) => {
    if (nextStatus === status) return;
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error || 'Failed to update status');
        return;
      }
      toast.success(`Status updated to ${STATUS_LABELS[nextStatus]}`);
      window.location.reload();
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          {STATUS_LABELS[status]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((entry) => (
          <DropdownMenuItem
            key={entry}
            disabled={isLoading || entry === status}
            onSelect={() => updateStatus(entry)}
          >
            {STATUS_LABELS[entry]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
