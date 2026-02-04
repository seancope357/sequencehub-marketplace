'use client';

import { useRouter } from 'next/navigation';
import { Package, Upload, Shield, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/navigation/AppHeader';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <AppHeader />

      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              Built for xLights Creators
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Sell Your xLights Sequences
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Publish, sell, and deliver your sequences with secure checkout and buyer access in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => router.push('/auth/register')}
                className="w-full sm:w-auto text-lg h-14 px-8 gap-2"
              >
                <Upload className="h-5 w-5" />
                Start Selling
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/browse')}
                className="w-full sm:w-auto text-lg h-14 px-8 gap-2"
              >
                <Search className="h-5 w-5" />
                Browse Listings
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload and Organize</h3>
                <p className="text-muted-foreground">
                  Add source files and renders with versioning and metadata for buyers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Checkout</h3>
                <p className="text-muted-foreground">
                  Stripe-powered payments with creator payouts and order tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Buyer Access</h3>
                <p className="text-muted-foreground">
                  Purchases appear in the buyer library for easy access.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p className="mb-2">SequenceHUB • Built for the xLights Community</p>
          <div className="flex items-center justify-center gap-4">
            <button
              className="hover:text-foreground underline underline-offset-4"
              onClick={() => router.push('/legal/terms')}
            >
              Terms
            </button>
            <button
              className="hover:text-foreground underline underline-offset-4"
              onClick={() => router.push('/legal/privacy')}
            >
              Privacy
            </button>
            <button
              className="hover:text-foreground underline underline-offset-4"
              onClick={() => router.push('/legal/refunds')}
            >
              Refunds
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
