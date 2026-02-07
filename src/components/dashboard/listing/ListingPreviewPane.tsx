import { Package, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { UploadedFile } from './types';
import { formatFileSize, getLicenseTypeLabel } from './utils';

interface ListingPreviewPaneProps {
  title: string;
  description: string;
  category: string;
  price: string;
  licenseType: 'PERSONAL' | 'COMMERCIAL';
  seatCount: number;
  includesFSEQ: boolean;
  includesSource: boolean;
  xLightsVersionMin: string;
  xLightsVersionMax: string;
  targetUse: string;
  expectedProps: string;
  uploadedFiles: UploadedFile[];
  isSaving: boolean;
  isPublishing: boolean;
  stripeReady: boolean;
  onBackToEdit: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function ListingPreviewPane({
  title,
  description,
  category,
  price,
  licenseType,
  seatCount,
  includesFSEQ,
  includesSource,
  xLightsVersionMin,
  xLightsVersionMax,
  targetUse,
  expectedProps,
  uploadedFiles,
  isSaving,
  isPublishing,
  stripeReady,
  onBackToEdit,
  onSaveDraft,
  onPublish,
}: ListingPreviewPaneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
                {price === '' ? '$0.00' : `$${Number.parseFloat(price).toFixed(2)}`}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">License</h3>
              <p className="text-lg">{getLicenseTypeLabel(licenseType, seatCount)}</p>
            </div>
          </div>

          {xLightsVersionMin ? (
            <div>
              <h3 className="font-semibold mb-2">xLights Compatibility</h3>
              <p className="text-sm text-muted-foreground">
                xLights {xLightsVersionMin}
                {xLightsVersionMax ? ` - ${xLightsVersionMax}` : ''}
              </p>
            </div>
          ) : null}

          {targetUse ? (
            <div>
              <h3 className="font-semibold mb-2">Target Use</h3>
              <p className="text-sm text-muted-foreground">{targetUse}</p>
            </div>
          ) : null}

          {expectedProps ? (
            <div>
              <h3 className="font-semibold mb-2">Expected Props</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{expectedProps}</p>
            </div>
          ) : null}

          {uploadedFiles.length > 0 ? (
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
                    <span className="text-sm text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBackToEdit}>
            Back to Edit
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSaveDraft} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={onPublish} disabled={isSaving || !stripeReady}>
              <Package className="h-4 w-4 mr-2" />
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
