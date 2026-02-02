import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'your-download-secret-key';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const { searchParams } = new URL(request.url);
    const expires = searchParams.get('expires');
    const signature = searchParams.get('signature');

    // In production, validate the signed URL here
    // For now, return a placeholder response
    const now = Math.floor(Date.now() / 1000);

    if (expires && signature) {
      const expiresInt = parseInt(expires);
      if (expiresInt < now) {
        return NextResponse.json(
          { error: 'Download link has expired' },
          { status: 403 }
        );
      }

      const data = `${path}:${expires}:${searchParams.get('userId')}`;
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

    // For demo purposes, return file info
    // In production, this would serve the actual file from cloud storage
    return NextResponse.json(
      {
        message: 'File download endpoint',
        path,
        note: 'In production, this would serve the actual file from cloud storage',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
