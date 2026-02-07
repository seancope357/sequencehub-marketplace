import type { PublishReadinessState, UploadedFile } from './types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

export function getLicenseTypeLabel(
  licenseType: 'PERSONAL' | 'COMMERCIAL',
  seatCount: number
): string {
  if (licenseType === 'PERSONAL') {
    return 'Personal Use';
  }

  return `Commercial Use (${seatCount} seat${seatCount > 1 ? 's' : ''})`;
}

export function computePublishReadiness(input: {
  title: string;
  description: string;
  category: string;
  price: string;
  includesFSEQ: boolean;
  includesSource: boolean;
  uploadedFiles: UploadedFile[];
  stripeReady: boolean;
}): PublishReadinessState {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const hasRenderedFile = input.uploadedFiles.some((file) => file.fileType === 'RENDERED');
  const hasSourceFile = input.uploadedFiles.some((file) => file.fileType === 'SOURCE');

  if (!input.title.trim()) blockers.push('Title is required');
  if (!input.description.trim()) blockers.push('Description is required');
  if (!input.category) blockers.push('Category is required');

  const numericPrice = Number.parseFloat(input.price);
  if (input.price === '' || Number.isNaN(numericPrice) || numericPrice < 0) {
    blockers.push('A valid non-negative price is required');
  }

  if (input.includesFSEQ && !hasRenderedFile) {
    blockers.push('FSEQ is enabled but no rendered (.fseq) file is uploaded');
  }

  if (input.includesSource && !hasSourceFile) {
    blockers.push('Source is enabled but no source (.xsq/.xml) file is uploaded');
  }

  if (!input.includesFSEQ && hasRenderedFile) {
    blockers.push('Rendered files are uploaded while FSEQ is disabled');
  }

  if (!input.includesSource && hasSourceFile) {
    blockers.push('Source files are uploaded while Source is disabled');
  }

  if (!input.includesFSEQ && !input.includesSource && input.uploadedFiles.length === 0) {
    blockers.push('Add files or enable at least one file type');
  }

  if (!input.stripeReady) {
    blockers.push('Stripe Connect must be completed before publishing');
  }

  if (input.uploadedFiles.length === 0) {
    warnings.push('No product files uploaded yet');
  }

  return {
    blockers,
    warnings,
    ready: blockers.length === 0,
  };
}
