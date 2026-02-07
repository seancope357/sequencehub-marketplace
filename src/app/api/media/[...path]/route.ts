import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, type FileType as StorageFileType } from '@/lib/storage';
import { db } from '@/lib/db';

function assertDownloadSecretConfigured(): void {
  if (!process.env.DOWNLOAD_SECRET) {
    throw new Error('DOWNLOAD_SECRET is required');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    assertDownloadSecretConfigured();
    const storageKey = params.path.join('/');
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing download token' },
        { status: 400 }
      );
    }

    const tokenRecord = await db.downloadToken.findUnique({
      where: { token },
      select: {
        id: true,
        userId: true,
        entitlementId: true,
        fileId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid download token' },
        { status: 403 }
      );
    }

    if (tokenRecord.usedAt) {
      return NextResponse.json(
        { error: 'Download token already used' },
        { status: 403 }
      );
    }

    if (tokenRecord.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Download token expired' },
        { status: 403 }
      );
    }

    const entitlement = await db.entitlement.findFirst({
      where: {
        id: tokenRecord.entitlementId,
        userId: tokenRecord.userId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!entitlement) {
      return NextResponse.json(
        { error: 'Invalid entitlement for download token' },
        { status: 403 }
      );
    }

    const fileRecord = await db.productFile.findFirst({
      where: {
        storageKey,
        ...(tokenRecord.fileId ? { id: tokenRecord.fileId } : {}),
      },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        fileType: true,
      },
    });

    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const tokenConsumption = await db.downloadToken.updateMany({
      where: {
        token,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (tokenConsumption.count !== 1) {
      return NextResponse.json(
        { error: 'Download token already used' },
        { status: 403 }
      );
    }

    const buffer = await downloadFile(storageKey, fileRecord.fileType as StorageFileType);

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
