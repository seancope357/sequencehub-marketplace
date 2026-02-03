'use client';

import { useRouter } from 'next/navigation';
import { Package, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CreatorOnboarding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Creator Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Set up your creator account and start listing products.</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>Connect Stripe to receive payments from buyers.</span>
          </div>
          <Button className="w-full gap-2" onClick={() => router.push('/dashboard/creator/onboarding')}>
            Continue to Stripe Setup
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
