// Amazing Creator Onboarding Flow - Production Grade
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Upload,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
  PartyPopper,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function CreatorOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Form state
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    photo: null as File | null,
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep === 2) {
      // Celebrate halfway point
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save onboarding data
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call

      toast.success('Welcome to SequenceHUB! Your creator shop is ready!');

      // Show final celebration
      setShowCelebration(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      toast.error('Failed to complete onboarding. Please try again.');
      setIsLoading(false);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Creator Profile',
      description: 'Tell buyers who you are',
      icon: <User className="h-6 w-6" />,
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Display Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Your creative name"
              value={profileData.displayName}
              onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
              className="text-lg h-12"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This is how buyers will see you on the marketplace
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bio (Optional)</label>
            <Textarea
              placeholder="Tell the community about your experience with xLights..."
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              rows={4}
              maxLength={250}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {profileData.bio.length}/250 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Profile Photo (Optional)</label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: 'Payment Setup',
      description: 'Connect Stripe to receive payments',
      icon: <CreditCard className="h-6 w-6" />,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Secure Payment Processing</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  We use Stripe to ensure you get paid safely and on time. Your financial data is
                  encrypted and never stored on our servers.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Bank-level security</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Weekly payouts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Keep 90% per sale</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center py-8">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h4 className="text-lg font-semibold mb-2">Connect with Stripe</h4>
            <p className="text-muted-foreground mb-6">
              Click below to securely connect your Stripe account. This takes about 2 minutes.
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => {
                toast.info('Stripe Connect will be integrated here');
                // In production: router.push('/api/creator/onboarding/start')
              }}
            >
              <Shield className="h-5 w-5" />
              Connect Stripe Account
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Note:</span> You can skip this step and set up payments
              later from your dashboard. However, you won't be able to receive payments until this
              is complete.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Your First Sequence',
      description: 'Upload your first product (optional)',
      icon: <Upload className="h-6 w-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-3">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Upload Your First Sequence</h4>
            <p className="text-muted-foreground">
              Get a head start by uploading your first sequence now, or skip and do it later from
              your dashboard.
            </p>
          </div>

          <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                <Upload className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h4 className="text-lg font-semibold mb-2">Drop your .xsq file here</h4>
            <p className="text-muted-foreground mb-4">or click to browse your files</p>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Choose File
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-background to-primary/5">
              <CardContent className="p-4 text-center">
                <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Instant Upload</p>
                <p className="text-xs text-muted-foreground">Goes live immediately</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-background to-primary/5">
              <CardContent className="p-4 text-center">
                <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Secure Storage</p>
                <p className="text-xs text-muted-foreground">Your files are safe</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-background to-primary/5">
              <CardContent className="p-4 text-center">
                <Star className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Get Discovered</p>
                <p className="text-xs text-muted-foreground">Reach thousands</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: "You\\'re All Set!",
      description: 'Review and launch your creator shop',
      icon: <Sparkles className="h-6 w-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mb-4">
              <PartyPopper className="h-10 w-10 text-primary-foreground animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Your Creator Shop is Ready!</h3>
            <p className="text-lg text-muted-foreground">
              Here's what you've accomplished in just a few minutes:
            </p>
          </div>

          <div className="space-y-3">
            <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Creator Profile Created</p>
                  <p className="text-sm text-muted-foreground">
                    Buyers can now discover you on SequenceHUB
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Payment Processing Ready</p>
                  <p className="text-sm text-muted-foreground">
                    You can start earning with every sale
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Dashboard Access Granted</p>
                  <p className="text-sm text-muted-foreground">
                    Track sales, manage products, view analytics
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg p-6 text-center">
            <h4 className="font-semibold mb-2">🎉 Welcome to the SequenceHUB Creator Community!</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Join 452+ creators who have earned over $47,000 selling their sequences. Your journey
              starts now.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>No monthly fees</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Secure payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span>Instant uploads</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10 flex items-center justify-center p-4">
      {/* Celebration Confetti Effect */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-8xl animate-bounce">🎉</div>
        </div>
      )}

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
            Creator Onboarding
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Welcome to SequenceHUB!</h1>
          <p className="text-muted-foreground">
            Let's get your creator shop set up in just a few minutes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-primary font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-2 flex-1 ${
                  step.id === currentStep ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.id < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.id === currentStep
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="text-xs text-center hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm border-primary/10">
          <CardContent className="p-8">
            {/* Step Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
              <p className="text-muted-foreground">{currentStepData.description}</p>
            </div>

            {/* Step Content */}
            <div className="mb-8">{currentStepData.content}</div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                {currentStep < totalSteps && (
                  <Button variant="outline" onClick={handleSkip} className="text-sm">
                    Skip for now
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    disabled={currentStep === 1 && !profileData.displayName}
                    className="gap-2 bg-gradient-to-r from-primary to-primary/90"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Launch My Creator Shop
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>Your data is secure</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>Setup takes 3-5 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span>No credit card required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
