'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Upload,
  Save,
  Eye,
  Trash2,
  Plus,
  X,
  DollarSign,
  Check,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: 'SOURCE' | 'RENDERED' | 'ASSET' | 'PREVIEW';
}

const CATEGORIES = [
  { value: 'CHRISTMAS', label: 'Christmas' },
  { value: 'HALLOWEEN', label: 'Halloween' },
  { value: 'PIXEL_TREE', label: 'Pixel Tree' },
  { value: 'MELODY', label: 'Melody' },
  { value: 'MATRIX', label: 'Matrix' },
  { value: 'ARCH', label: 'Arch' },
  { value: 'PROP', label: 'Prop' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'OTHER', label: 'Other' },
];

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
}

export default function NewProductPage() {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Stripe Connect status
  const [stripeStatus, setStripeStatus] = useState<StripeOnboardingStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  // xLights Metadata
  const [xLightsVersionMin, setXLightsVersionMin] = useState('');
  const [xLightsVersionMax, setXLightsVersionMax] = useState('');
  const [targetUse, setTargetUse] = useState('');
  const [expectedProps, setExpectedProps] = useState('');

  // File Options
  const [includesFSEQ, setIncludesFSEQ] = useState(true);
  const [includesSource, setIncludesSource] = useState(true);

  // License
  const [licenseType, setLicenseType] = useState<'PERSONAL' | 'COMMERCIAL'>('PERSONAL');
  const [seatCount, setSeatCount] = useState(1);

  // Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Preview mode
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/auth/login';
      return;
    }
    checkStripeStatus();
  }, [isAuthenticated]);

  const checkStripeStatus = async () => {
    try {
      setStripeLoading(true);
      const response = await fetch('/api/creator/onboarding/status');
      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
      } else {
        console.error('Failed to check Stripe status');
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setStripeLoading(false);
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: UploadedFile['fileType'] = 'ASSET';

      if (ext === 'fseq') fileType = 'RENDERED';
      else if (ext === 'xsq' || ext === 'xml') fileType = 'SOURCE';
      else if (['mp4', 'mov', 'gif'].includes(ext || '')) fileType = 'PREVIEW';

      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType,
      };
    });

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSave = async (publish: boolean = false) => {
    // Check Stripe account first
    if (!stripeStatus?.canReceivePayments) {
      toast.error('Please connect your Stripe account before creating products');
      return;
    }

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    if (!category) {
      toast.error('Category is required');
      return;
    }

    if (price === '' || parseFloat(price) < 0) {
      toast.error('Valid price is required');
      return;
    }

    if (!includesFSEQ && !includesSource && uploadedFiles.length === 0) {
      toast.error('Please add at least one file or enable file types');
      return;
    }

    try {
      setIsSaving(true);
      setIsPublishing(publish);

      const response = await fetch('/api/dashboard/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          price: parseFloat(price),
          xLightsVersionMin,
          xLightsVersionMax,
          targetUse,
          expectedProps,
          includesFSEQ,
          includesSource,
          licenseType,
          seatCount: licenseType === 'COMMERCIAL' ? seatCount : null,
          status: publish ? 'PUBLISHED' : 'DRAFT',
          files: uploadedFiles.map((f) => ({
            fileName: f.fileName,
            fileType: f.fileType,
            fileSize: f.fileSize,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          publish
            ? 'Product published successfully!'
            : 'Product saved as draft'
        );
        window.location.href = `/dashboard/products/${data.product.id}/edit`;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getLicenseTypeLabel = () => {
    if (licenseType === 'PERSONAL') return 'Personal Use';
    return `Commercial Use (${seatCount} seat${seatCount > 1 ? 's' : ''})`;
  };

  if (isLoading) {
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span
                className="font-semibold cursor-pointer"
                onClick={() => (window.location.href = '/')}
              >
                SequenceHUB
              </span>
              <span className="text-muted-foreground">/</span>
              <span>New Product</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href === '/dashboard/products/new' ? '/dashboard' : window.location.href}
              >
                Back to Products
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Stripe Account Requirement Banner */}
          {!stripeLoading && stripeStatus && !stripeStatus.canReceivePayments && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-lg font-semibold">Stripe Account Required</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3">
                  You need to connect your Stripe account before you can sell products on SequenceHUB.
                  This is required to receive payments from buyers.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-gray-50"
                    onClick={() => window.location.href = '/dashboard/creator/onboarding'}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Set Up Stripe Account
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    onClick={checkStripeStatus}
                  >
                    Refresh Status
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {showPreview ? (
            /* Preview Mode */
            <Card>
              <CardHeader>
                <CardTitle>Product Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preview Content */}
                <div className="space-y-4">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-24 w-24 text-muted-foreground" />
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="secondary">{category || 'No Category'}</Badge>
                      <div className="flex gap-2">
                        {includesFSEQ && <Badge variant="outline">FSEQ</Badge>}
                        {includesSource && <Badge variant="outline">Source</Badge>}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold">{title || 'Untitled'}</h2>
                    <p className="text-muted-foreground">{description || 'No description'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Price</h3>
                      <p className="text-2xl font-bold">
                        {price === '' ? '$0.00' : `$${parseFloat(price).toFixed(2)}`}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">License</h3>
                      <p className="text-lg">{getLicenseTypeLabel()}</p>
                    </div>
                  </div>

                  {xLightsVersionMin && (
                    <div>
                      <h3 className="font-semibold mb-2">xLights Compatibility</h3>
                      <p className="text-sm text-muted-foreground">
                        xLights {xLightsVersionMin}
                        {xLightsVersionMax && ` - ${xLightsVersionMax}`}
                      </p>
                    </div>
                  )}

                  {targetUse && (
                    <div>
                      <h3 className="font-semibold mb-2">Target Use</h3>
                      <p className="text-sm text-muted-foreground">{targetUse}</p>
                    </div>
                  )}

                  {expectedProps && (
                    <div>
                      <h3 className="font-semibold mb-2">Expected Props</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {expectedProps}
                      </p>
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Included Files</h3>
                      <div className="space-y-2">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>{file.fileName}</span>
                              <Badge variant="outline" className="text-xs">
                                {file.fileType}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(false)}
                  >
                    Back to Edit
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleSave(false)}
                      disabled={isSaving || !stripeStatus?.canReceivePayments}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button
                      onClick={() => handleSave(true)}
                      disabled={isSaving || !stripeStatus?.canReceivePayments}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      {isPublishing ? 'Publishing...' : 'Publish'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Edit Mode */
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="metadata">xLights</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="license">License</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Product Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Christmas Tree Twinkle Sequence"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your sequence. What makes it special? What props are needed?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Supports Markdown. Be detailed to help buyers understand what they're getting.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Files</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>File Types Included</Label>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                              FSEQ
                            </div>
                            <span className="text-sm">
                              Rendered playback file (.fseq)
                            </span>
                          </div>
                          <Switch
                            checked={includesFSEQ}
                            onCheckedChange={setIncludesFSEQ}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                              SRC
                            </div>
                            <span className="text-sm">
                              Source project file (.xsq, .xml)
                            </span>
                          </div>
                          <Switch
                            checked={includesSource}
                            onCheckedChange={setIncludesSource}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label htmlFor="file-upload">Upload Files</Label>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".fseq,.xsq,.xml,.mp4,.mov,.gif,.png,.jpg,.jpeg"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer block"
                          >
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-semibold mb-2">
                              Click to upload or drag files here
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Supports: .fseq, .xsq, .xml, .mp4, .mov, .gif, .png, .jpg, .jpeg
                            </p>
                          </label>
                        </div>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label>Uploaded Files</Label>
                          <div className="space-y-2">
                            {uploadedFiles.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3 border rounded"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                  <div className="flex-1">
                                    <div className="font-medium">{file.fileName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatFileSize(file.fileSize)}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {file.fileType}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFile(file.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!includesFSEQ && !includesSource && uploadedFiles.length === 0 && (
                        <div className="flex items-start gap-2 p-3 bg-muted rounded">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <p className="text-sm">
                            Add files or enable at least one file type (FSEQ or Source)
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* xLights Metadata Tab */}
              <TabsContent value="metadata" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>xLights Compatibility & Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetUse">Target Use (Optional)</Label>
                      <Input
                        id="targetUse"
                        placeholder="e.g., Pixel Tree, Mega Tree, Arches, Matrix"
                        value={targetUse}
                        onChange={(e) => setTargetUse(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Describe what type of display this sequence is designed for.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="xlightsMin">Min xLights Version</Label>
                        <Input
                          id="xlightsMin"
                          placeholder="e.g., 2023.1"
                          value={xLightsVersionMin}
                          onChange={(e) => setXLightsVersionMin(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="xlightsMax">Max xLights Version</Label>
                        <Input
                          id="xlightsMax"
                          placeholder="e.g., 2024.0"
                          value={xLightsVersionMax}
                          onChange={(e) => setXLightsVersionMax(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expectedProps">Expected Props / Models (Optional)</Label>
                      <Textarea
                        id="expectedProps"
                        placeholder="e.g., 24x50 Pixel Tree, 8 Arches with 50 pixels each"
                        value={expectedProps}
                        onChange={(e) => setExpectedProps(e.target.value)}
                        rows={4}
                      />
                      <p className="text-sm text-muted-foreground">
                        Help buyers understand what hardware is required to use this sequence.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (USD) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-10 text-lg"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Set to 0 for free products. Platform fee will be deducted from paid products.
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded">
                      <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold">Dynamic Pricing Tips:</p>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                            <li>Research similar products for pricing</li>
                            <li>Consider the complexity and length</li>
                            <li>Offer competitive pricing for new products</li>
                            <li>Update pricing over time based on feedback</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* License Tab */}
              <TabsContent value="license" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>License Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <Label>Choose License Type:</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-4 border-2 rounded cursor-pointer transition-all ${
                            licenseType === 'PERSONAL'
                              ? 'border-primary bg-primary/10'
                              : 'border-muted'
                          }`}
                          onClick={() => setLicenseType('PERSONAL')}
                        >
                          <div className="font-semibold mb-2">Personal Use</div>
                          <p className="text-sm text-muted-foreground">
                            For individual use on personal light shows
                          </p>
                        </div>
                        <div
                          className={`p-4 border-2 rounded cursor-pointer transition-all ${
                            licenseType === 'COMMERCIAL'
                              ? 'border-primary bg-primary/10'
                              : 'border-muted'
                          }`}
                          onClick={() => setLicenseType('COMMERCIAL')}
                        >
                          <div className="font-semibold mb-2">Commercial Use</div>
                          <p className="text-sm text-muted-foreground">
                            For commercial installations, events, or clients
                          </p>
                        </div>
                      </div>
                    </div>

                    {licenseType === 'COMMERCIAL' && (
                      <div className="space-y-2">
                        <Label htmlFor="seatCount">Number of Seats/Licenses *</Label>
                        <Input
                          id="seatCount"
                          type="number"
                          min="1"
                          value={seatCount}
                          onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                        />
                        <p className="text-sm text-muted-foreground">
                          How many installations is this license valid for? Each seat allows one
                          buyer to use the sequence.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Review Tab */}
              <TabsContent value="review" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Review & Publish</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Summary */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-3">Product Summary</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Title:</span>
                            <span className="font-medium">{title || 'Untitled'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium">{category || 'Not set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-medium">
                              {price === '' ? '$0.00' : `$${parseFloat(price).toFixed(2)}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">License:</span>
                            <span className="font-medium">{getLicenseTypeLabel()}</span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Files Summary */}
                      <div>
                        <h3 className="font-semibold mb-3">Files Included</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">FSEQ:</span>
                            <span className="font-medium">
                              {includesFSEQ ? (
                                <span className="text-green-600">Included</span>
                              ) : (
                                <span className="text-muted">Not included</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Source:</span>
                            <span className="font-medium">
                              {includesSource ? (
                                <span className="text-green-600">Included</span>
                              ) : (
                                <span className="text-muted">Not included</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Uploaded Files:</span>
                            <span className="font-medium">{uploadedFiles.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* xLights Metadata Summary */}
                      {(xLightsVersionMin || targetUse || expectedProps) && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold mb-3">xLights Metadata</h3>
                            <div className="space-y-2 text-sm">
                              {xLightsVersionMin && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Compatibility:</span>
                                  <span className="font-medium">
                                    xLights {xLightsVersionMin}
                                    {xLightsVersionMax && ` - ${xLightsVersionMax}`}
                                  </span>
                                </div>
                              )}
                              {targetUse && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Target Use:</span>
                                  <span className="font-medium">{targetUse}</span>
                                </div>
                              )}
                              {expectedProps && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground">Expected Props:</span>
                                  <span className="font-medium">{expectedProps}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      {/* Validation */}
                      <div className="space-y-2">
                        {!stripeStatus?.canReceivePayments && (
                          <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded border border-red-200">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">Stripe Account Required</p>
                              <p className="text-sm">
                                You must connect your Stripe account before you can publish products.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                                onClick={() => window.location.href = '/dashboard/creator/onboarding'}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Set Up Stripe Now
                              </Button>
                            </div>
                          </div>
                        )}

                        {(!title.trim() || !description.trim() || !category || price === '') && (
                          <div className="flex items-start gap-2 text-yellow-600 bg-yellow-50 p-3 rounded">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">Missing Required Fields</p>
                              <p className="text-sm">
                                Please fill in all required fields (*)
                              </p>
                            </div>
                          </div>
                        )}

                        {(!includesFSEQ && !includesSource && uploadedFiles.length === 0) && (
                          <div className="flex items-start gap-2 text-yellow-600 bg-yellow-50 p-3 rounded">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">No Files</p>
                              <p className="text-sm">
                                Add files or enable at least one file type (FSEQ or Source)
                              </p>
                            </div>
                          </div>
                        )}

                        {title.trim() && description.trim() && category && price !== '' &&
                          (includesFSEQ || includesSource || uploadedFiles.length > 0) &&
                          stripeStatus?.canReceivePayments && (
                            <div className="flex items-start gap-2 text-green-600 bg-green-50 p-3 rounded">
                              <Check className="h-5 w-5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold">Ready to Publish!</p>
                                <p className="text-sm">
                                  Your product has all required information and your Stripe account is connected.
                                  You can save as draft or publish now.
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
    </div>
  );
}
