'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CreditCard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';
import { ListingFormTabs } from '@/components/dashboard/listing/ListingFormTabs';
import { ListingPreviewPane } from '@/components/dashboard/listing/ListingPreviewPane';
import { computePublishReadiness } from '@/components/dashboard/listing/utils';
import { useListingUploadManager } from '@/components/dashboard/listing/useListingUploadManager';

interface StripeOnboardingStatus {
  hasAccount: boolean;
  stripeAccountId?: string;
  onboardingStatus: string;
  isComplete: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  capabilitiesActive: boolean;
  needsOnboarding: boolean;
  canReceivePayments: boolean;
  stripeConfigured?: boolean;
  message?: string;
  stripeError?: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [stripeStatus, setStripeStatus] = useState<StripeOnboardingStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autosaveMessage, setAutosaveMessage] = useState('');

  const autosaveInFlight = useRef(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  const [xLightsVersionMin, setXLightsVersionMin] = useState('');
  const [xLightsVersionMax, setXLightsVersionMax] = useState('');
  const [targetUse, setTargetUse] = useState('');
  const [expectedProps, setExpectedProps] = useState('');

  const [includesFSEQ, setIncludesFSEQ] = useState(true);
  const [includesSource, setIncludesSource] = useState(true);

  const [licenseType, setLicenseType] = useState<'PERSONAL' | 'COMMERCIAL'>('PERSONAL');
  const [seatCount, setSeatCount] = useState(1);

  const [showPreview, setShowPreview] = useState(false);

  const {
    uploadedFiles,
    coverMedia,
    galleryMedia,
    handleFileUpload,
    removeFile,
    handleCoverUpload,
    removeCover,
    handleGalleryUpload,
    removeGalleryItem,
    reorderGallery,
    uploadAllFiles,
    uploadAllMedia,
    buildFilesPayload,
    buildMediaPayload,
  } = useListingUploadManager();

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    void checkStripeStatus();
  }, [isAuthenticated, authLoading, router]);

  const checkStripeStatus = async () => {
    try {
      setStripeLoading(true);
      const response = await fetch('/api/creator/onboarding/status');
      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setStripeLoading(false);
      setIsLoading(false);
    }
  };

  const buildDraftPayload = useCallback(() => {
    const numericPrice = Number.parseFloat(price);
    return {
      draftId: draftId || undefined,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      category: category || undefined,
      price: Number.isNaN(numericPrice) ? undefined : numericPrice,
      xLightsVersionMin: xLightsVersionMin.trim() || null,
      xLightsVersionMax: xLightsVersionMax.trim() || null,
      targetUse: targetUse.trim() || null,
      expectedProps: expectedProps.trim() || null,
      includesFSEQ,
      includesSource,
      licenseType,
      seatCount: licenseType === 'COMMERCIAL' ? seatCount : null,
    };
  }, [
    draftId,
    title,
    description,
    category,
    price,
    xLightsVersionMin,
    xLightsVersionMax,
    targetUse,
    expectedProps,
    includesFSEQ,
    includesSource,
    licenseType,
    seatCount,
  ]);

  const saveDraft = useCallback(
    async (reason: 'auto' | 'manual') => {
      if (autosaveInFlight.current && reason === 'auto') {
        return false;
      }

      const hasAnyData =
        title.trim().length > 0 ||
        description.trim().length > 0 ||
        category.length > 0 ||
        price.length > 0 ||
        xLightsVersionMin.length > 0 ||
        xLightsVersionMax.length > 0 ||
        targetUse.length > 0 ||
        expectedProps.length > 0;

      if (!hasAnyData) {
        return true;
      }

      autosaveInFlight.current = true;
      setAutosaveState('saving');
      setAutosaveMessage(reason === 'manual' ? 'Saving draft...' : 'Autosaving draft...');

      try {
        const response = await fetch('/api/dashboard/products/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildDraftPayload()),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error?.message || payload?.error || 'Failed to save draft');
        }

        if (payload?.draftId) {
          setDraftId(payload.draftId);
        }

        setAutosaveState('saved');
        setAutosaveMessage('Draft saved');
        if (reason === 'manual') {
          toast.success('Draft saved');
        }

        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save draft';
        setAutosaveState('error');
        setAutosaveMessage(message);
        if (reason === 'manual') {
          toast.error(message);
        }
        return false;
      } finally {
        autosaveInFlight.current = false;
      }
    },
    [
      title,
      description,
      category,
      price,
      xLightsVersionMin,
      xLightsVersionMax,
      targetUse,
      expectedProps,
      buildDraftPayload,
    ]
  );

  useEffect(() => {
    if (isLoading || authLoading || !isAuthenticated) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void saveDraft('auto');
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [
    isLoading,
    authLoading,
    isAuthenticated,
    title,
    description,
    category,
    price,
    xLightsVersionMin,
    xLightsVersionMax,
    targetUse,
    expectedProps,
    includesFSEQ,
    includesSource,
    licenseType,
    seatCount,
    saveDraft,
  ]);

  const handleSave = async (publish: boolean) => {
    if (!publish) {
      await saveDraft('manual');
      return;
    }

    const publishReadiness = computePublishReadiness({
      title,
      description,
      category,
      price,
      includesFSEQ,
      includesSource,
      uploadedFiles,
      stripeReady: Boolean(stripeStatus?.canReceivePayments),
    });

    if (!publishReadiness.ready) {
      toast.error(publishReadiness.blockers[0] || 'Listing is not ready to publish');
      return;
    }

    try {
      setIsSaving(true);
      setIsPublishing(true);

      const filesUploaded = await uploadAllFiles();
      if (!filesUploaded) {
        return;
      }

      const mediaUploaded = await uploadAllMedia();
      if (!mediaUploaded) {
        return;
      }

      const response = await fetch('/api/dashboard/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: draftId || undefined,
          title,
          description,
          category,
          price: Number.parseFloat(price),
          xLightsVersionMin,
          xLightsVersionMax,
          targetUse,
          expectedProps,
          includesFSEQ,
          includesSource,
          licenseType,
          seatCount: licenseType === 'COMMERCIAL' ? seatCount : null,
          status: 'PUBLISHED',
          files: buildFilesPayload(),
          media: buildMediaPayload(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error?.message || error?.error || 'Failed to publish listing');
      }

      toast.success('Product published successfully');
      router.push('/dashboard/products');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish listing';
      toast.error(message);
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  const readiness = useMemo(
    () =>
      computePublishReadiness({
        title,
        description,
        category,
        price,
        includesFSEQ,
        includesSource,
        uploadedFiles,
        stripeReady: Boolean(stripeStatus?.canReceivePayments),
      }),
    [title, description, category, price, includesFSEQ, includesSource, uploadedFiles, stripeStatus]
  );

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="New Product" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <SellerSidebarNav />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">New Product</h1>
              <p className="text-muted-foreground">Create and publish a new sequence listing.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {autosaveState === 'saving' ? 'Autosaving…' : autosaveMessage || 'Autosave idle'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/products')}>
                Back to Listings
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPreview((previous) => !previous)}>
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </div>

          {!stripeLoading && stripeStatus && !stripeStatus.canReceivePayments ? (
            <Alert
              className={`mb-6 ${
                stripeStatus.stripeConfigured === false
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-red-500 bg-red-50 text-red-900'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>
                {stripeStatus.stripeConfigured === false
                  ? 'Stripe Connect Not Configured'
                  : 'Stripe Account Required'}
              </AlertTitle>
              <AlertDescription>
                <p className="mb-3">
                  {stripeStatus.stripeConfigured === false
                    ? stripeStatus.message || 'Stripe Connect is not configured for this environment.'
                    : stripeStatus.stripeError ||
                      'You need to complete Stripe onboarding before publishing products.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/creator/onboarding')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Set Up Stripe
                  </Button>
                  <Button variant="ghost" size="sm" onClick={checkStripeStatus}>
                    Refresh
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {showPreview ? (
            <ListingPreviewPane
              title={title}
              description={description}
              category={category}
              price={price}
              licenseType={licenseType}
              seatCount={seatCount}
              includesFSEQ={includesFSEQ}
              includesSource={includesSource}
              xLightsVersionMin={xLightsVersionMin}
              xLightsVersionMax={xLightsVersionMax}
              targetUse={targetUse}
              expectedProps={expectedProps}
              uploadedFiles={uploadedFiles}
              isSaving={isSaving}
              isPublishing={isPublishing}
              stripeReady={Boolean(stripeStatus?.canReceivePayments)}
              onBackToEdit={() => setShowPreview(false)}
              onSaveDraft={() => void handleSave(false)}
              onPublish={() => void handleSave(true)}
            />
          ) : (
            <ListingFormTabs
              activeTab={activeTab}
              onTabChange={(value) => {
                setActiveTab(value);
                void saveDraft('auto');
              }}
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              category={category}
              onCategoryChange={setCategory}
              xLightsVersionMin={xLightsVersionMin}
              onXLightsVersionMinChange={setXLightsVersionMin}
              xLightsVersionMax={xLightsVersionMax}
              onXLightsVersionMaxChange={setXLightsVersionMax}
              targetUse={targetUse}
              onTargetUseChange={setTargetUse}
              expectedProps={expectedProps}
              onExpectedPropsChange={setExpectedProps}
              price={price}
              onPriceChange={setPrice}
              includesFSEQ={includesFSEQ}
              onIncludesFSEQChange={setIncludesFSEQ}
              includesSource={includesSource}
              onIncludesSourceChange={setIncludesSource}
              licenseType={licenseType}
              onLicenseTypeChange={setLicenseType}
              seatCount={seatCount}
              onSeatCountChange={setSeatCount}
              uploadedFiles={uploadedFiles}
              onFileUpload={handleFileUpload}
              onRemoveFile={removeFile}
              coverMedia={coverMedia}
              onCoverUpload={handleCoverUpload}
              onRemoveCover={removeCover}
              galleryMedia={galleryMedia}
              onGalleryUpload={handleGalleryUpload}
              onRemoveGalleryItem={removeGalleryItem}
              onGalleryReorder={(items) => {
                reorderGallery(items);
                void saveDraft('auto');
              }}
              stripeLoading={stripeLoading}
              stripeStatus={stripeStatus}
              onOpenStripeOnboarding={() => router.push('/dashboard/creator/onboarding')}
              onRefreshStripeStatus={checkStripeStatus}
              onSaveDraft={() => void handleSave(false)}
              onPublish={() => void handleSave(true)}
              isSaving={isSaving}
              isPublishing={isPublishing}
              readiness={readiness}
            />
          )}

          {draftId ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Draft ID: <span className="font-mono">{draftId}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
