'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SequenceHubLogo } from '@/components/branding/SequenceHubLogo';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getPasswordChecks,
  getPasswordStrengthMessage,
  isPasswordStrong,
  isValidEmail,
  normalizeEmail,
  normalizeName,
} from '@/lib/auth/registration';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  const normalizedEmail = normalizeEmail(email);
  const passwordChecks = getPasswordChecks(password);
  const isEmailValid = email.length > 0 ? isValidEmail(normalizedEmail) : false;
  const isPasswordValid = isPasswordStrong(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = isEmailValid && isPasswordValid && passwordsMatch && acceptedLegal && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = normalizeEmail(email);
    const cleanName = normalizeName(name);

    if (!cleanEmail || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!isPasswordStrong(password)) {
      toast.error(getPasswordStrengthMessage(password));
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!acceptedLegal) {
      toast.error('You must accept the Terms, Privacy Policy, and Refund Policy');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          name: cleanName,
          acceptedLegal: true,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (data.requiresEmailVerification) {
          toast.success(data.message || 'Account created. Check your email to verify your account.');
          router.replace(`/auth/login?checkEmail=1&email=${encodeURIComponent(cleanEmail)}`);
          return;
        }

        // Update auth store immediately with user data when a session was created.
        setUser(data.user);

        toast.success(`Welcome, ${data.user.name || data.user.email}!`);

        // Replace instead of push so users cannot navigate back to the signup form accidentally.
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
        toast.error(apiError || 'Registration failed');
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
          <div className="flex items-center justify-center mb-2">
            <SequenceHubLogo variant="auth" />
          </div>
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
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    className="pl-10"
                    autoComplete="name"
                    maxLength={NAME_MAX_LENGTH}
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
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    className="pl-10"
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    className="pl-10"
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
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
                {password && confirmPassword && password !== confirmPassword && (
                  <div className="text-sm text-destructive">Passwords do not match</div>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-md border p-3">
                <input
                  id="acceptedLegal"
                  name="acceptedLegal"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  required
                />
                <Label htmlFor="acceptedLegal" className="text-sm leading-6 font-normal">
                  I agree to the{' '}
                  <Link href="/legal/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-primary">
                    Terms of Service
                  </Link>
                  ,{' '}
                  <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-primary">
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link href="/legal/refunds" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-primary">
                    Refund Policy
                  </Link>
                  .
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{' '}
              </span>
              <Link
                href="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
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
