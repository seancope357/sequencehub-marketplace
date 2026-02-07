export interface UploadedFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: 'SOURCE' | 'RENDERED' | 'ASSET' | 'PREVIEW';
  uploadProgress?: number;
  uploadedFileId?: string;
  storageKey?: string;
  fileHash?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  sequenceLength?: number;
  fps?: number;
  channelCount?: number;
  uploadError?: string;
}

export interface UploadedMedia {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: 'PREVIEW';
  mediaType: 'cover' | 'gallery' | 'preview';
  uploadProgress?: number;
  storageKey?: string;
  fileHash?: string;
  mimeType?: string;
  uploadError?: string;
}

export interface ListingDraftPayload {
  title: string;
  description: string;
  category: string;
  price: string;
  xLightsVersionMin: string;
  xLightsVersionMax: string;
  targetUse: string;
  expectedProps: string;
  includesFSEQ: boolean;
  includesSource: boolean;
  licenseType: 'PERSONAL' | 'COMMERCIAL';
  seatCount: number;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface PublishReadinessState {
  blockers: string[];
  warnings: string[];
  ready: boolean;
}
