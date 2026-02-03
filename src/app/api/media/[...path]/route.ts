import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { downloadFile } from '@/lib/storage';
import { db } from '@/lib/db';

const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'your-download-secret-key';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const storageKey = params.path.join('/');
    const { searchParams } = new URL(request.url);
    const expires = searchParams.get('expires');
    const signature = searchParams.get('signature');
    const userId = searchParams.get('userId');

    if (!expires || !signature || !userId) {
      return NextResponse.json(
        { error: 'Missing signature parameters' },
        { status: 400 }
      );
    }

    const expiresInt = Number.parseInt(expires, 10);
    if (Number.isNaN(expiresInt)) {
      return NextResponse.json(
        { error: 'Invalid expiration timestamp' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (expiresInt < now) {
      return NextResponse.json(
        { error: 'Download link has expired' },
        { status: 403 }
      );
    }

    const dataToSign = `${storageKey}:${expires}:${userId}`;
    const expectedSignature = crypto
      .createHmac('sha256', DOWNLOAD_SECRET)
      .update(dataToSign)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid download signature' },
        { status: 403 }
      );
    }

    const fileRecord = await db.productFile.findFirst({
      where: { storageKey },
      select: {
        fileName: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const buffer = await downloadFile(storageKey);

    const fileName = fileRecord.originalName || fileRecord.fileName;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
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
