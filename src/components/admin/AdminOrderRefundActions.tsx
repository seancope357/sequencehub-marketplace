'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface AdminOrderRefundActionsProps {
  orderId: string;
  isRefundable: boolean;
  status: string;
}

export function AdminOrderRefundActions({ orderId, isRefundable, status }: AdminOrderRefundActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefund = async () => {
    if (!isRefundable) return;
    const confirmed = window.confirm(
      'Issue a full refund for this order? This will deactivate any entitlements.'
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error || 'Failed to refund order');
        return;
      }

      toast.success('Refund processed successfully');
      window.location.reload();
    } catch (error) {
      console.error('Refund error:', error);
      toast.error('Failed to refund order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      disabled={!isRefundable || isLoading}
      onClick={handleRefund}
    >
      {status === 'REFUNDED' ? 'Refunded' : isLoading ? 'Processing...' : 'Refund Order'}
    </Button>
  );
}
