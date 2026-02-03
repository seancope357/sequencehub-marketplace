'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth-store';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser, setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Update auth store immediately with user data
        setUser(data.user);

        toast.success(`Welcome, ${data.user.name || data.user.email}!`);

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">SequenceHUB</h1>
          <p className="text-muted-foreground">
            Marketplace for xLights Sequences
          </p>
        </div>

        {/* Register Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Join the community and start buying or selling sequences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {password && confirmPassword && password === confirmPassword && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{' '}
              </span>
              <a
                href="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </a>
            </div>

            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Back to Marketplace
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="mt-4 bg-muted/50">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Browse and download xLights sequences</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Sell your own sequences as a creator</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Track purchases and downloads</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
