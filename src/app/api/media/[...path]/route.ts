import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { downloadFile, STORAGE_BUCKETS, type StorageBucket } from '@/lib/supabase/storage';

const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'your-download-secret-key';

/**
 * Map storage key prefix to Supabase bucket
 * Storage keys are formatted as: {fileType}/{timestamp}-{random}-{filename}
 */
function getBucketFromStorageKey(storageKey: string): StorageBucket | null {
  const prefix = storageKey.split('/')[0]?.toLowerCase();

  // Map file type prefixes to buckets
  switch (prefix) {
    case 'fseq':
    case 'xsq':
    case 'xml':
    case 'source':
    case 'rendered':
      return STORAGE_BUCKETS.PRODUCT_FILES;

    case 'media':
    case 'cover':
    case 'gallery':
    case 'preview':
      return STORAGE_BUCKETS.PRODUCT_MEDIA;

    case 'avatar':
      return STORAGE_BUCKETS.USER_AVATARS;

    default:
      return null;
  }
}

/**
 * Detect MIME type from file extension
 */
function getMimeTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',

    // xLights files
    'fseq': 'application/octet-stream',
    'xsq': 'application/xml',
    'xml': 'application/xml',

    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',

    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',

    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const storageKey = path.join('/');
    const { searchParams } = new URL(request.url);
    const expires = searchParams.get('expires');
    const signature = searchParams.get('signature');
    const userId = searchParams.get('userId');

    // Map storage key to Supabase bucket
    const bucket = getBucketFromStorageKey(storageKey);
    if (!bucket) {
      console.error('Invalid storage key format:', storageKey);
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Determine if this is media (public) or a product file (requires signature)
    const isPublicMedia = bucket === STORAGE_BUCKETS.PRODUCT_MEDIA || bucket === STORAGE_BUCKETS.USER_AVATARS;

    // For product files, validate signed URL
    if (!isPublicMedia) {
      const now = Math.floor(Date.now() / 1000);

      if (!expires || !signature) {
        return NextResponse.json(
          { error: 'Missing signature or expiration' },
          { status: 403 }
        );
      }

      const expiresInt = parseInt(expires);
      if (expiresInt < now) {
        return NextResponse.json(
          { error: 'Download link has expired' },
          { status: 403 }
        );
      }

      const data = `${storageKey}:${expires}:${userId}`;
      const expectedSignature = crypto
        .createHmac('sha256', DOWNLOAD_SECRET)
        .update(data)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid download signature' },
          { status: 403 }
        );
      }
    }

    // Download file from Supabase Storage
    const { data: fileBlob, error } = await downloadFile(bucket, storageKey);

    if (error || !fileBlob) {
      console.error('Error downloading from Supabase:', error);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Convert Blob to ArrayBuffer then Buffer for streaming
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine Content-Type
    const mimeType = getMimeTypeFromPath(storageKey);

    // Extract filename for Content-Disposition
    const fileName = storageKey.split('/').pop() || 'download';

    // Stream the file back with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
