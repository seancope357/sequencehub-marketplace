// src/app/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import {
  Package,
  Upload,
  Shield,
  ArrowRight,
  Sparkles,
  Zap,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SequenceHubLogo } from '@/components/branding/SequenceHubLogo';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => router.push('/')}
              aria-label="Go to homepage"
            >
              <SequenceHubLogo variant="header" />
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push('/browse')}
                className="hidden sm:inline-flex"
              >
                Browse
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/auth/login')}
                className="hidden sm:inline-flex"
              >
                Login
              </Button>
              <Button onClick={() => router.push('/auth/register')} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Start Selling
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            A Marketplace for xLights Creators
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sell your xLights sequences directly to the community.
            Simple, fair, and built for creators.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => router.push('/auth/register')}
              className="w-full sm:w-auto h-12 px-8 gap-2"
            >
              Start Selling
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="mb-4 p-4 bg-primary/10 rounded-lg inline-block">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">1. Upload a Sequence</h4>
              <p className="text-muted-foreground">
                Create an account, upload your .xsq file, and set a price.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 p-4 bg-primary/10 rounded-lg inline-block">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">2. Secure Processing</h4>
              <p className="text-muted-foreground">
                We handle payment processing through Stripe.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 p-4 bg-primary/10 rounded-lg inline-block">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">3. Get Paid</h4>
              <p className="text-muted-foreground">
                Receive earnings directly to your bank account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Start?
            </h3>
            <Button
              size="lg"
              onClick={() => router.push('/auth/register')}
              className="h-12 px-8 gap-2"
            >
              Become a Creator
              <ArrowRight className="h-5 w-5" />
            </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 SequenceHUB. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}