'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Package,
  Upload,
  Save,
  Trash2,
  Check,
  X,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { AppHeader } from '@/components/navigation/AppHeader';

interface UploadedFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: 'SOURCE' | 'RENDERED' | 'ASSET' | 'PREVIEW';
  uploadProgress?: number;
  uploadedFileId?: string;
  storageKey?: string;
  uploadError?: string;
}

export default function NewVersionPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const { user, isAuthenticated, isCreatorOrAdmin, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Product info
  const [product, setProduct] = useState<any>(null);

  // Version fields
  const [versionName, setVersionName] = useState('');
  const [changelog, setChangelog] = useState('');

  // Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    loadProduct();
  }, [isAuthenticated, isCreatorOrAdmin, authLoading, router, productId]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/products/${productId}`);

      if (!response.ok) {
        toast.error('Failed to load product');
        router.push('/dashboard/products');
        return;
      }

      const data = await response.json();
      setProduct(data.product);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
      router.push('/dashboard/products');
    } finally {
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

  const uploadFileToStorage = async (uploadedFile: UploadedFile): Promise<void> => {
    const formData = new FormData();
    formData.append('file', uploadedFile.file);
    formData.append('fileType', uploadedFile.fileType);

    try {
      const response = await fetch('/api/upload/simple', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                uploadedFileId: data.fileId,
                storageKey: data.storageKey,
                uploadProgress: 100,
                uploadError: undefined,
              }
            : f
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, uploadError: errorMessage, uploadProgress: 0 }
            : f
        )
      );

      throw error;
    }
  };

  const uploadAllFiles = async (): Promise<boolean> => {
    if (uploadedFiles.length === 0) return true;

    const filesToUpload = uploadedFiles.filter((f) => !f.uploadedFileId);
    if (filesToUpload.length === 0) return true;

    let uploadsFailed = false;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];

      try {
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, uploadProgress: 1 } : f))
        );

        await uploadFileToStorage(file);
        toast.success(`Uploaded ${file.fileName}`);
      } catch (error) {
        uploadsFailed = true;
        toast.error(`Failed to upload ${file.fileName}`);
        console.error(`Upload error for ${file.fileName}:`, error);
      }
    }

    return !uploadsFailed;
  };

  const handleSave = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please add at least one file for this version');
      return;
    }

    try {
      setIsSaving(true);

      // Upload all files first
      toast.info(`Uploading ${uploadedFiles.length} file(s)...`);
      const uploadSuccess = await uploadAllFiles();

      if (!uploadSuccess) {
        toast.error('Some files failed to upload. Please try again.');
        return;
      }

      // Create new version
      const response = await fetch(`/api/dashboard/products/${productId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionName: versionName.trim() || undefined,
          changelog: changelog.trim() || undefined,
          files: uploadedFiles.map((f) => ({
            fileId: f.uploadedFileId,
            fileName: f.fileName,
            fileType: f.fileType,
            fileSize: f.fileSize,
            storageKey: f.storageKey,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('New version created successfully!');
        router.push(`/dashboard/products/${productId}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create version');
      }
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Failed to create version');
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || !product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel={`New Version - ${product.title}`} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/products/${productId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Product
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create New Version</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Add a new version to {product.title}. The version number will be auto-incremented.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="versionName">Version Name (Optional)</Label>
                  <Input
                    id="versionName"
                    placeholder="e.g., 2.0.0, Summer 2024, Bug Fix Release"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave blank to auto-generate (e.g., "2.0.0" for version 2)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="changelog">Changelog (Optional)</Label>
                  <Textarea
                    id="changelog"
                    placeholder="What's new in this version? Bug fixes, new features, improvements..."
                    value={changelog}
                    onChange={(e) => setChangelog(e.target.value)}
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    Supports Markdown. Describe what changed in this version.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-upload">Upload Files *</Label>
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
                            {file.uploadProgress !== undefined && file.uploadProgress > 0 ? (
                              file.uploadProgress === 100 ? (
                                <Check className="h-5 w-5 text-green-600" />
                              ) : (
                                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              )
                            ) : file.uploadError ? (
                              <X className="h-5 w-5 text-destructive" />
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
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.id)}
                            disabled={file.uploadProgress !== undefined && file.uploadProgress > 0 && file.uploadProgress < 100}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedFiles.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please upload at least one file for this version.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/products/${productId}`)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || uploadedFiles.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Creating...' : 'Create Version'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
