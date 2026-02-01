/**
 * Cloudflare R2 Storage Integration
 * Handles file upload, download, and deletion from R2 cloud storage
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';

// Initialize R2 client (compatible with S3 API)
const getR2Client = () => {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY');
  }

  return new S3Client({
    region: 'auto', // Cloudflare R2 uses 'auto'
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'sequencehub-files';

/**
 * Upload a file to R2 storage
 */
export async function uploadToR2(
  filePath: string,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<string> {
  const client = getR2Client();

  // Read file
  const fileBuffer = await fs.readFile(filePath);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    Body: fileBuffer,
    ContentType: options.contentType || 'application/octet-stream',
    Metadata: {
      ...options.metadata,
      uploadedAt: new Date().toISOString(),
    },
  });

  await client.send(command);

  return storageKey;
}

/**
 * Upload a buffer to R2 storage
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  storageKey: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<string> {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    Body: buffer,
    ContentType: options.contentType || 'application/octet-stream',
    Metadata: {
      ...options.metadata,
      uploadedAt: new Date().toISOString(),
    },
  });

  await client.send(command);

  return storageKey;
}

/**
 * Generate a presigned URL for uploading to R2
 * Allows client-side direct uploads
 */
export async function generatePresignedUploadUrl(
  storageKey: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}

/**
 * Generate a presigned URL for downloading from R2
 */
export async function generatePresignedDownloadUrl(
  storageKey: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}

/**
 * Download a file from R2 to local filesystem
 */
export async function downloadFromR2(
  storageKey: string,
  localPath: string
): Promise<void> {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error('No file body returned from R2');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Write to local file
  await fs.writeFile(localPath, buffer);
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFromR2(storageKey: string): Promise<void> {
  const client = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  await client.send(command);
}

/**
 * Check if R2 is configured and available
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}
