'use client';

import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  AlertCircle,
  Check,
  CreditCard,
  DollarSign,
  Package,
  Trash2,
  Upload,
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
import { CATEGORIES } from './constants';
import type { PublishReadinessState, UploadedFile, UploadedMedia } from './types';
import { formatFileSize, getLicenseTypeLabel } from './utils';
import { PublishReadinessPanel } from './PublishReadinessPanel';

type StripeStatusLike = {
  canReceivePayments: boolean;
  stripeConfigured?: boolean;
  stripeError?: string;
  message?: string;
};

interface ListingFormTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  xLightsVersionMin: string;
  onXLightsVersionMinChange: (value: string) => void;
  xLightsVersionMax: string;
  onXLightsVersionMaxChange: (value: string) => void;
  targetUse: string;
  onTargetUseChange: (value: string) => void;
  expectedProps: string;
  onExpectedPropsChange: (value: string) => void;
  price: string;
  onPriceChange: (value: string) => void;
  includesFSEQ: boolean;
  onIncludesFSEQChange: (value: boolean) => void;
  includesSource: boolean;
  onIncludesSourceChange: (value: boolean) => void;
  licenseType: 'PERSONAL' | 'COMMERCIAL';
  onLicenseTypeChange: (value: 'PERSONAL' | 'COMMERCIAL') => void;
  seatCount: number;
  onSeatCountChange: (value: number) => void;
  uploadedFiles: UploadedFile[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileId: string) => void;
  coverMedia: UploadedMedia | null;
  onCoverUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;
  galleryMedia: UploadedMedia[];
  onGalleryUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveGalleryItem: (fileId: string) => void;
  onGalleryReorder: (items: UploadedMedia[]) => void;
  stripeLoading: boolean;
  stripeStatus: StripeStatusLike | null;
  onOpenStripeOnboarding: () => void;
  onRefreshStripeStatus: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSaving: boolean;
  isPublishing: boolean;
  readiness: PublishReadinessState;
}

function SortableGalleryItem({
  item,
  onRemove,
}: {
  item: UploadedMedia;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center justify-between p-3 border rounded bg-background ${
        isDragging ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ≡
        </button>
        {item.uploadProgress && item.uploadProgress > 0 ? (
          item.uploadProgress === 100 ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )
        ) : item.uploadError ? (
          <AlertCircle className="h-5 w-5 text-destructive" />
        ) : (
          <Package className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="flex-1">
          <div className="font-medium">{item.fileName}</div>
          <div className="text-sm text-muted-foreground">
            {item.uploadError ? (
              <span className="text-destructive">{item.uploadError}</span>
            ) : item.uploadProgress === 100 ? (
              <span className="text-green-600">Uploaded successfully</span>
            ) : item.uploadProgress ? (
              <span>Uploading...</span>
            ) : (
              formatFileSize(item.fileSize)
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Gallery
        </Badge>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        disabled={item.uploadProgress !== undefined && item.uploadProgress > 0 && item.uploadProgress < 100}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function ListingFormTabs(props: ListingFormTabsProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = props.galleryMedia.findIndex((item) => item.id === active.id);
    const newIndex = props.galleryMedia.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    props.onGalleryReorder(arrayMove(props.galleryMedia, oldIndex, newIndex));
  };

  return (
    <Tabs value={props.activeTab} onValueChange={props.onTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-7">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="metadata">xLights</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="license">License</TabsTrigger>
        <TabsTrigger value="review">Review</TabsTrigger>
      </TabsList>

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
                value={props.title}
                onChange={(event) => props.onTitleChange(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your sequence. What makes it special? What props are needed?"
                value={props.description}
                onChange={(event) => props.onDescriptionChange(event.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={props.category} onValueChange={props.onCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="files" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Product Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Rendered playback file (.fseq)</span>
                </div>
                <Switch checked={props.includesFSEQ} onCheckedChange={props.onIncludesFSEQChange} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Source project file (.xsq, .xml)</span>
                </div>
                <Switch checked={props.includesSource} onCheckedChange={props.onIncludesSourceChange} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload Files</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={props.onFileUpload}
                    className="hidden"
                    accept=".fseq,.xsq,.xml,.mp4,.mov,.webm,.gif,.png,.jpg,.jpeg,.mp3,.wav,.ogg,.xmodel"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold mb-2">Click to upload files</p>
                    <p className="text-sm text-muted-foreground">
                      Supports sequence, source, media, and asset files
                    </p>
                  </label>
                </div>
              </div>

              {props.uploadedFiles.length > 0 ? (
                <div className="space-y-2">
                  <Label>Uploaded Files</Label>
                  <div className="space-y-2">
                    {props.uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3 flex-1">
                          {file.uploadProgress !== undefined && file.uploadProgress > 0 ? (
                            file.uploadProgress === 100 ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            )
                          ) : file.uploadError ? (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{file.fileName}</div>
                            <div className="text-sm text-muted-foreground">
                              {file.uploadError ? (
                                <span className="text-destructive">{file.uploadError}</span>
                              ) : file.uploadProgress === 100 ? (
                                <span className="text-green-600">Uploaded successfully</span>
                              ) : file.uploadProgress !== undefined && file.uploadProgress > 0 ? (
                                <span>Uploading...</span>
                              ) : (
                                formatFileSize(file.fileSize)
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {file.fileType}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => props.onRemoveFile(file.id)}
                          disabled={
                            file.uploadProgress !== undefined &&
                            file.uploadProgress > 0 &&
                            file.uploadProgress < 100
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="media" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Product Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cover-upload">Cover Image / Video</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  id="cover-upload"
                  type="file"
                  onChange={props.onCoverUpload}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.mov,.webm"
                />
                <label htmlFor="cover-upload" className="cursor-pointer block">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-semibold">Upload a cover image or short preview</p>
                </label>
              </div>

              {props.coverMedia ? (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3 flex-1">
                    {props.coverMedia.uploadProgress && props.coverMedia.uploadProgress > 0 ? (
                      props.coverMedia.uploadProgress === 100 ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )
                    ) : props.coverMedia.uploadError ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{props.coverMedia.fileName}</div>
                      <div className="text-sm text-muted-foreground">
                        {props.coverMedia.uploadError ? (
                          <span className="text-destructive">{props.coverMedia.uploadError}</span>
                        ) : props.coverMedia.uploadProgress === 100 ? (
                          <span className="text-green-600">Uploaded successfully</span>
                        ) : props.coverMedia.uploadProgress ? (
                          <span>Uploading...</span>
                        ) : (
                          formatFileSize(props.coverMedia.fileSize)
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Cover
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={props.onRemoveCover}
                    disabled={
                      props.coverMedia.uploadProgress !== undefined &&
                      props.coverMedia.uploadProgress > 0 &&
                      props.coverMedia.uploadProgress < 100
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="gallery-upload">Gallery Images</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  id="gallery-upload"
                  type="file"
                  multiple
                  onChange={props.onGalleryUpload}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.webp,.gif"
                />
                <label htmlFor="gallery-upload" className="cursor-pointer block">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-semibold">Upload gallery images</p>
                </label>
              </div>

              {props.galleryMedia.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext
                    items={props.galleryMedia.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {props.galleryMedia.map((item) => (
                        <SortableGalleryItem
                          key={item.id}
                          item={item}
                          onRemove={props.onRemoveGalleryItem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="metadata" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>xLights Compatibility & Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetUse">Target Use</Label>
              <Input
                id="targetUse"
                placeholder="e.g., Pixel Tree, Mega Tree, Arches"
                value={props.targetUse}
                onChange={(event) => props.onTargetUseChange(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="xlightsMin">Min xLights Version</Label>
                <Input
                  id="xlightsMin"
                  placeholder="e.g., 2023.1"
                  value={props.xLightsVersionMin}
                  onChange={(event) => props.onXLightsVersionMinChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="xlightsMax">Max xLights Version</Label>
                <Input
                  id="xlightsMax"
                  placeholder="e.g., 2024.0"
                  value={props.xLightsVersionMax}
                  onChange={(event) => props.onXLightsVersionMaxChange(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedProps">Expected Props / Models</Label>
              <Textarea
                id="expectedProps"
                placeholder="Describe required props and models"
                value={props.expectedProps}
                onChange={(event) => props.onExpectedPropsChange(event.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

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
                  value={props.price}
                  onChange={(event) => props.onPriceChange(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="license" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>License Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`p-4 border-2 rounded cursor-pointer transition-all text-left ${
                  props.licenseType === 'PERSONAL' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
                onClick={() => props.onLicenseTypeChange('PERSONAL')}
              >
                <div className="font-semibold mb-2">Personal Use</div>
                <p className="text-sm text-muted-foreground">
                  For individual use on personal light shows
                </p>
              </button>
              <button
                type="button"
                className={`p-4 border-2 rounded cursor-pointer transition-all text-left ${
                  props.licenseType === 'COMMERCIAL' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
                onClick={() => props.onLicenseTypeChange('COMMERCIAL')}
              >
                <div className="font-semibold mb-2">Commercial Use</div>
                <p className="text-sm text-muted-foreground">
                  For commercial installations, events, or clients
                </p>
              </button>
            </div>

            {props.licenseType === 'COMMERCIAL' ? (
              <div className="space-y-2">
                <Label htmlFor="seatCount">Number of Seats/Licenses *</Label>
                <Input
                  id="seatCount"
                  type="number"
                  min="1"
                  value={props.seatCount}
                  onChange={(event) => props.onSeatCountChange(Number.parseInt(event.target.value, 10) || 1)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="review" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Review & Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Title:</span>
                <span className="font-medium">{props.title || 'Untitled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{props.category || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium">
                  {props.price === '' ? '$0.00' : `$${Number.parseFloat(props.price).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">License:</span>
                <span className="font-medium">{getLicenseTypeLabel(props.licenseType, props.seatCount)}</span>
              </div>
            </div>

            <PublishReadinessPanel readiness={props.readiness} />

            {!props.stripeLoading && props.stripeStatus && !props.stripeStatus.canReceivePayments ? (
              <Alert className="border-red-500 bg-red-50 text-red-900">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Stripe Account Required</AlertTitle>
                <AlertDescription>
                  {props.stripeStatus.stripeConfigured === false
                    ? props.stripeStatus.message || 'Stripe is not configured in this environment.'
                    : props.stripeStatus.stripeError || 'Complete Stripe onboarding to publish.'}
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" onClick={props.onOpenStripeOnboarding}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Set Up Stripe
                    </Button>
                    <Button type="button" variant="ghost" onClick={props.onRefreshStripeStatus}>
                      Refresh Status
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={props.onSaveDraft} disabled={props.isSaving}>
                {props.isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                type="button"
                onClick={props.onPublish}
                disabled={props.isSaving || props.isPublishing || !props.readiness.ready}
              >
                {props.isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
