'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SequenceHubLogo } from '@/components/branding/SequenceHubLogo';
import { useAuthStore } from '@/lib/store/auth-store';
import { PASSWORD_MIN_LENGTH, getPasswordChecks, isValidEmail, normalizeEmail } from '@/lib/auth/registration';

function normalizeLoginErrorMessage(rawMessage: unknown): string {
  if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
    return 'Unable to sign in right now. Please try again.';
  }

  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password') ||
    normalized.includes('email not found') ||
    normalized.includes('user not found') ||
    normalized.includes('not confirmed') ||
    normalized.includes('not verified')
  ) {
    return 'Invalid email or password';
  }

  if (
    normalized.includes('too many') ||
    normalized.includes('rate limit') ||
    normalized.includes('429')
  ) {
    return 'Too many login attempts. Please try again in 15 minutes.';
  }

  if (normalized.includes('internal')) {
    return 'Unable to sign in right now. Please try again.';
  }

  return rawMessage;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();
  const normalizedEmail = normalizeEmail(email);
  const passwordChecks = getPasswordChecks(password);
  const isEmailValid = email.length > 0 ? isValidEmail(normalizedEmail) : false;
  const canSubmit = isEmailValid && password.length > 0 && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Update auth store immediately with user data
        setUser(data.user);

        // Show success message
        toast.success(`Welcome back, ${data.user.name || data.user.email}!`);

        // Replace instead of push so users cannot navigate back to login accidentally.
        router.replace('/dashboard');
        router.refresh();
      } else {
        let apiError: string | undefined;
        try {
          const payload = await response.json();
          apiError = payload?.error;
        } catch {
          apiError = undefined;
        }
        toast.error(normalizeLoginErrorMessage(apiError));
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : undefined;
      toast.error(normalizeLoginErrorMessage(message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <SequenceHubLogo variant="auth" />
          </div>
          <p className="text-muted-foreground">
            Marketplace for xLights Sequences
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmail((current) => normalizeEmail(current))}
                    required
                  />
                </div>
                {email.length > 0 && !isEmailValid && (
                  <p className="text-xs text-destructive">Please enter a valid email address.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <div className={passwordChecks.minLength ? 'text-green-600' : 'text-muted-foreground'}>
                    <Check className="inline mr-1 h-3 w-3" />
                    At least {PASSWORD_MIN_LENGTH} characters
                  </div>
                  <div className={passwordChecks.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}>
                    <Check className="inline mr-1 h-3 w-3" />
                    One lowercase letter
                  </div>
                  <div className={passwordChecks.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}>
                    <Check className="inline mr-1 h-3 w-3" />
                    One uppercase letter
                  </div>
                  <div className={passwordChecks.hasNumber ? 'text-green-600' : 'text-muted-foreground'}>
                    <Check className="inline mr-1 h-3 w-3" />
                    One number
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                Don't have an account?{' '}
              </span>
              <Link
                href="/auth/register"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Back to Marketplace
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
