'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Loader2, Check } from 'lucide-react';

interface BuyNowButtonProps {
  productId: string;
  productSlug: string;
  price: number;
  currency?: string;
  disabled?: boolean;
  alreadyOwned?: boolean;
  className?: string;
}

export function BuyNowButton({
  productId,
  productSlug,
  price,
  currency = 'USD',
  disabled = false,
  alreadyOwned = false,
  className = '',
}: BuyNowButtonProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please log in to purchase this product',
        variant: 'destructive',
      });
      window.location.href = `/auth/login?redirect=/browse/products/${productSlug}`;
      return;
    }

    setIsCreatingCheckout(true);

    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/library?purchase=success`,
          cancelUrl: `${window.location.origin}/browse/products/${productSlug}?checkout=canceled`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setIsCreatingCheckout(false);

      toast({
        title: 'Checkout Failed',
        description: error instanceof Error ? error.message : 'Failed to start checkout process',
        variant: 'destructive',
      });
    }
  };

  if (authLoading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (alreadyOwned) {
    return (
      <Button disabled variant="secondary" className={className}>
        <Check className="mr-2 h-4 w-4" />
        Already Purchased
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button onClick={handleBuyNow} className={className}>
        <ShoppingCart className="mr-2 h-4 w-4" />
        Login to Purchase
      </Button>
    );
  }

  const formattedPrice = price.toFixed(2);

  return (
    <Button
      onClick={handleBuyNow}
      disabled={disabled || isCreatingCheckout}
      className={className}
    >
      {isCreatingCheckout ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy Now - ${formattedPrice} {currency}
        </>
      )}
    </Button>
  );
}
