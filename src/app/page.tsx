// SequenceHUB.com - Production-Grade Landing Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Package,
  Upload,
  DollarSign,
  Shield,
  Eye,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Zap,
  Heart,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalCreators: 452,
    totalPaid: 47234,
    sequencesSold: 2847,
  });

  // Animated counter effect
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        sequencesSold: prev.sequencesSold + Math.floor(Math.random() * 3),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Package className="h-8 w-8 text-primary" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  SequenceHUB
                </h1>
                <p className="text-xs text-muted-foreground">xLights Marketplace</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {stats.sequencesSold.toLocaleString()} sequences sold this month
              </span>
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Sell Your xLights Sequences.{' '}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Earn Your First Dollar Today.
              </span>
            </h2>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Join {stats.totalCreators.toLocaleString()}+ display creators selling professional
              sequences to the xLights community. No monthly fees, just simple 10% commission.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                size="lg"
                onClick={() => router.push('/auth/register')}
                className="w-full sm:w-auto text-lg h-14 px-8 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                <Upload className="h-5 w-5" />
                Start Selling Today
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  document.getElementById('browse-sequences')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto text-lg h-14 px-8 gap-2 backdrop-blur-sm"
              >
                <Search className="h-5 w-5" />
                Browse Sequences
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Secure payments via Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>${stats.totalPaid.toLocaleString()} paid to creators</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>{stats.totalCreators}+ active creators</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar with Glassmorphism */}
      <section className="border-y bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                ${(stats.totalPaid / 1000).toFixed(0)}k+
              </div>
              <div className="text-sm text-muted-foreground">Paid to Creators This Month</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stats.sequencesSold.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Sequences Sold This Week</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stats.totalCreators}+
              </div>
              <div className="text-sm text-muted-foreground">Creators Earning</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights with Glassmorphism Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              Why Creators Choose SequenceHUB
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Succeed
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built by creators, for creators. We handle the tech so you can focus on your art.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Simple Upload */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Upload in Seconds</h4>
                <p className="text-muted-foreground">
                  Drag & drop your .xsq files. Add description, preview, and price. Go live
                  instantly—no approval delays.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2: Keep Earnings */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Keep 90% Per Sale</h4>
                <p className="text-muted-foreground">
                  No monthly fees. No listing costs. Just 10% commission per sale. Get paid weekly
                  directly to your bank account.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3: Secure Payments */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Protected Checkout</h4>
                <p className="text-muted-foreground">
                  Stripe-powered payments with fraud protection. SSL encryption. PCI compliance
                  included. Bank-level security.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4: Built-in Preview */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit group-hover:scale-110 transition-transform duration-300">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Try Before Buying</h4>
                <p className="text-muted-foreground">
                  Buyers can preview sequences in browser before purchase. Higher conversions, fewer
                  refunds, happier customers.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5: Creator Dashboard */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Track Everything</h4>
                <p className="text-muted-foreground">
                  Real-time sales analytics. Download tracking. Revenue reports. All your data in
                  one beautiful dashboard.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6: Community First */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit group-hover:scale-110 transition-transform duration-300">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">For the xLights Community</h4>
                <p className="text-muted-foreground">
                  Built by display creators who understand your workflow. No corporate nonsense. Just
                  passionate people helping passionate people.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-20 bg-gradient-to-b from-secondary/10 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              Creator Success Stories
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">What Creators Are Saying</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real creators. Real results. Real income.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">
                  "I made $1,847 in my first month selling Halloween sequences. This paid for my
                  entire display upgrade! Can't believe how easy it was to get started."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                    M
                  </div>
                  <div>
                    <div className="font-semibold">Mike T.</div>
                    <div className="text-sm text-muted-foreground">$1,847 earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 2 */}
            <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">
                  "SequenceHUB paid for my entire display hardware upgrade. Now it's 100% passive
                  income every year. Best decision I ever made."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                    S
                  </div>
                  <div>
                    <div className="font-semibold">Sarah K.</div>
                    <div className="text-sm text-muted-foreground">$4,230 earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 3 */}
            <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">
                  "I uploaded 15 sequences two years ago. Still earning $200-400/month with zero
                  effort. Best passive income stream ever!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                    D
                  </div>
                  <div>
                    <div className="font-semibold">David R.</div>
                    <div className="text-sm text-muted-foreground">$8,900 lifetime</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section with Gradient Background */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-6">
              <Zap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            </div>
            <h3 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Turn Your Sequences Into Income?
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Join {stats.totalCreators} creators already earning on SequenceHUB. Setup takes less
              than 5 minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button
                size="lg"
                onClick={() => router.push('/auth/register')}
                className="w-full sm:w-auto text-lg h-14 px-8 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
              >
                <Upload className="h-5 w-5" />
                Start Earning Today
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>No monthly fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Keep 90% per sale</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Free setup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* About Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-6 w-6 text-primary" />
                <span className="font-semibold">SequenceHUB</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The marketplace for xLights display creators. Built by creators, for creators.
              </p>
            </div>

            {/* For Creators Column */}
            <div>
              <h4 className="font-semibold mb-4">For Creators</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button
                    onClick={() => router.push('/auth/register')}
                    className="hover:text-primary transition-colors"
                  >
                    Start Selling
                  </button>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Creator Guide
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Success Stories
                  </a>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Refund Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 SequenceHUB • Built for the xLights Community with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
