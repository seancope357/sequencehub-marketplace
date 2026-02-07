'use client';

import { useState } from 'react';
import CryptoJS from 'crypto-js';
import { toast } from 'sonner';
import { CHUNK_SIZE, SIMPLE_UPLOAD_MAX_SIZE } from './constants';
import type { UploadedFile, UploadedMedia } from './types';

export function useListingUploadManager() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [coverMedia, setCoverMedia] = useState<UploadedMedia | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<UploadedMedia[]>([]);

  const updateFileState = (fileId: string, patch: Partial<UploadedFile>) => {
    setUploadedFiles((previous) =>
      previous.map((file) => (file.id === fileId ? { ...file, ...patch } : file))
    );
  };

  const updateCoverMedia = (patch: Partial<UploadedMedia>) => {
    setCoverMedia((previous) => (previous ? { ...previous, ...patch } : previous));
  };

  const updateGalleryMedia = (fileId: string, patch: Partial<UploadedMedia>) => {
    setGalleryMedia((previous) =>
      previous.map((file) => (file.id === fileId ? { ...file, ...patch } : file))
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: UploadedFile['fileType'] = 'ASSET';

      if (ext === 'fseq') fileType = 'RENDERED';
      else if (ext === 'xsq' || ext === 'xml') fileType = 'SOURCE';
      else if (['mp4', 'mov', 'webm', 'gif'].includes(ext || '')) fileType = 'PREVIEW';

      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType,
      };
    });

    setUploadedFiles((previous) => [...previous, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((previous) => previous.filter((file) => file.id !== fileId));
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setCoverMedia({
      id: `${Date.now()}-cover`,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: 'PREVIEW',
      mediaType: 'cover',
    });
  };

  const removeCover = () => {
    setCoverMedia(null);
  };

  const handleGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }

    const newItems: UploadedMedia[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: 'PREVIEW',
      mediaType: 'gallery',
    }));

    setGalleryMedia((previous) => [...previous, ...newItems]);
  };

  const removeGalleryItem = (fileId: string) => {
    setGalleryMedia((previous) => previous.filter((item) => item.id !== fileId));
  };

  const reorderGallery = (items: UploadedMedia[]) => {
    setGalleryMedia(items);
  };

  const uploadFileSimple = async (uploadedFile: UploadedFile): Promise<void> => {
    const formData = new FormData();
    formData.append('file', uploadedFile.file);
    formData.append('fileType', uploadedFile.fileType);

    updateFileState(uploadedFile.id, { uploadProgress: 1, uploadError: undefined });

    const response = await fetch('/api/upload/simple', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();

    updateFileState(uploadedFile.id, {
      uploadedFileId: data.fileId || undefined,
      storageKey: data.storageKey,
      fileHash: data.fileHash,
      mimeType: data.mimeType || uploadedFile.file.type,
      metadata: data.metadata || undefined,
      sequenceLength: data.sequenceLength,
      fps: data.fps,
      channelCount: data.channelCount,
      uploadProgress: 100,
      uploadError: undefined,
    });
  };

  const uploadMediaSimple = async (mediaFile: UploadedMedia): Promise<void> => {
    const formData = new FormData();
    formData.append('file', mediaFile.file);
    formData.append('fileType', mediaFile.fileType);

    if (mediaFile.mediaType === 'cover') {
      updateCoverMedia({ uploadProgress: 1, uploadError: undefined });
    } else {
      updateGalleryMedia(mediaFile.id, { uploadProgress: 1, uploadError: undefined });
    }

    const response = await fetch('/api/upload/simple', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    const patch = {
      storageKey: data.storageKey,
      fileHash: data.fileHash,
      mimeType: data.mimeType || mediaFile.file.type,
      uploadProgress: 100,
      uploadError: undefined,
    };

    if (mediaFile.mediaType === 'cover') {
      updateCoverMedia(patch);
    } else {
      updateGalleryMedia(mediaFile.id, patch);
    }
  };

  const uploadFileChunked = async (uploadedFile: UploadedFile): Promise<void> => {
    updateFileState(uploadedFile.id, { uploadProgress: 1, uploadError: undefined });

    const initResponse = await fetch('/api/upload/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: uploadedFile.file.name,
        fileSize: uploadedFile.file.size,
        mimeType: uploadedFile.file.type || 'application/octet-stream',
        uploadType: uploadedFile.fileType,
      }),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to initiate upload');
    }

    const initData = await initResponse.json();
    const totalChunks = initData.totalChunks as number;
    const chunkSize = typeof initData.chunkSize === 'number' ? initData.chunkSize : CHUNK_SIZE;
    const uploadId = initData.uploadId as string;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, uploadedFile.file.size);
      const chunk = uploadedFile.file.slice(start, end);
      const chunkBuffer = await chunk.arrayBuffer();
      const chunkHash = CryptoJS.MD5(CryptoJS.lib.WordArray.create(chunkBuffer)).toString();

      const chunkForm = new FormData();
      chunkForm.append('uploadId', uploadId);
      chunkForm.append('chunkIndex', String(chunkIndex));
      chunkForm.append('chunkHash', chunkHash);
      chunkForm.append('chunk', new File([chunk], uploadedFile.file.name));

      const chunkResponse = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: chunkForm,
      });

      if (!chunkResponse.ok) {
        const error = await chunkResponse.json().catch(() => ({}));
        throw new Error(error.error || `Failed to upload chunk ${chunkIndex + 1}`);
      }

      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      updateFileState(uploadedFile.id, { uploadProgress: progress });
    }

    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId }),
    });

    if (!completeResponse.ok) {
      const error = await completeResponse.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to complete upload');
    }

    const data = await completeResponse.json();

    updateFileState(uploadedFile.id, {
      uploadedFileId: data.fileId || undefined,
      storageKey: data.storageKey,
      fileHash: data.fileHash,
      mimeType: data.mimeType || uploadedFile.file.type,
      metadata: data.metadata || undefined,
      sequenceLength: data.sequenceLength,
      fps: data.fps,
      channelCount: data.channelCount,
      uploadProgress: 100,
      uploadError: undefined,
    });
  };

  const uploadMediaChunked = async (mediaFile: UploadedMedia): Promise<void> => {
    if (mediaFile.mediaType === 'cover') {
      updateCoverMedia({ uploadProgress: 1, uploadError: undefined });
    } else {
      updateGalleryMedia(mediaFile.id, { uploadProgress: 1, uploadError: undefined });
    }

    const initResponse = await fetch('/api/upload/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: mediaFile.file.name,
        fileSize: mediaFile.file.size,
        mimeType: mediaFile.file.type || 'application/octet-stream',
        uploadType: mediaFile.fileType,
      }),
    });

    const initData = await initResponse.json().catch(() => ({}));
    if (!initResponse.ok) {
      throw new Error(initData.error || 'Failed to initiate upload');
    }

    const uploadId = initData.uploadId as string;
    const chunkSize = initData.chunkSize as number;
    const totalChunks = initData.totalChunks as number;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, mediaFile.file.size);
      const chunk = mediaFile.file.slice(start, end);
      const chunkBuffer = await chunk.arrayBuffer();
      const chunkHash = CryptoJS.MD5(CryptoJS.lib.WordArray.create(chunkBuffer)).toString();

      const chunkForm = new FormData();
      chunkForm.append('uploadId', uploadId);
      chunkForm.append('chunkIndex', String(chunkIndex));
      chunkForm.append('chunkHash', chunkHash);
      chunkForm.append('chunk', new File([chunk], mediaFile.file.name));

      const chunkResponse = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: chunkForm,
      });

      if (!chunkResponse.ok) {
        const error = await chunkResponse.json().catch(() => ({}));
        throw new Error(error.error || `Failed to upload chunk ${chunkIndex + 1}`);
      }

      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      if (mediaFile.mediaType === 'cover') {
        updateCoverMedia({ uploadProgress: progress });
      } else {
        updateGalleryMedia(mediaFile.id, { uploadProgress: progress });
      }
    }

    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId }),
    });

    const data = await completeResponse.json().catch(() => ({}));
    if (!completeResponse.ok) {
      throw new Error(data.error || 'Failed to complete upload');
    }

    const patch = {
      storageKey: data.storageKey,
      fileHash: data.fileHash,
      mimeType: data.mimeType || mediaFile.file.type,
      uploadProgress: 100,
      uploadError: undefined,
    };

    if (mediaFile.mediaType === 'cover') {
      updateCoverMedia(patch);
    } else {
      updateGalleryMedia(mediaFile.id, patch);
    }
  };

  const uploadFileToStorage = async (uploadedFile: UploadedFile): Promise<void> => {
    try {
      if (uploadedFile.file.size > SIMPLE_UPLOAD_MAX_SIZE) {
        await uploadFileChunked(uploadedFile);
      } else {
        await uploadFileSimple(uploadedFile);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      updateFileState(uploadedFile.id, { uploadError: message, uploadProgress: 0 });
      throw error;
    }
  };

  const uploadMediaToStorage = async (mediaFile: UploadedMedia): Promise<void> => {
    try {
      if (mediaFile.file.size > SIMPLE_UPLOAD_MAX_SIZE) {
        await uploadMediaChunked(mediaFile);
      } else {
        await uploadMediaSimple(mediaFile);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      if (mediaFile.mediaType === 'cover') {
        updateCoverMedia({ uploadError: message, uploadProgress: 0 });
      } else {
        updateGalleryMedia(mediaFile.id, { uploadError: message, uploadProgress: 0 });
      }
      throw error;
    }
  };

  const uploadAllFiles = async (): Promise<boolean> => {
    const filesToUpload = uploadedFiles.filter((file) => !file.storageKey || !file.fileHash);
    if (filesToUpload.length === 0) {
      return true;
    }

    for (const file of filesToUpload) {
      try {
        await uploadFileToStorage(file);
        toast.success(`Uploaded ${file.fileName}`);
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error(`Failed to upload ${file.fileName}`);
        return false;
      }
    }

    return true;
  };

  const uploadAllMedia = async (): Promise<boolean> => {
    const mediaToUpload = [
      ...(coverMedia ? [coverMedia] : []),
      ...galleryMedia,
    ].filter((mediaItem) => !mediaItem.storageKey || !mediaItem.fileHash);

    if (mediaToUpload.length === 0) {
      return true;
    }

    for (const mediaItem of mediaToUpload) {
      try {
        await uploadMediaToStorage(mediaItem);
      } catch (error) {
        console.error('Media upload failed:', error);
        toast.error(`Failed to upload ${mediaItem.fileName}`);
        return false;
      }
    }

    return true;
  };

  const buildFilesPayload = () =>
    uploadedFiles
      .filter((file) => file.storageKey && file.fileHash)
      .map((file) => ({
        fileId: file.uploadedFileId,
        fileName: file.fileName,
        originalName: file.file.name,
        fileType: file.fileType,
        fileSize: file.fileSize,
        storageKey: file.storageKey,
        fileHash: file.fileHash,
        mimeType: file.mimeType,
        metadata: file.metadata,
        sequenceLength: file.sequenceLength,
        fps: file.fps,
        channelCount: file.channelCount,
      }));

  const buildMediaPayload = () => [
    ...(coverMedia && coverMedia.storageKey && coverMedia.fileHash
      ? [
          {
            fileName: coverMedia.fileName,
            originalName: coverMedia.file.name,
            fileSize: coverMedia.fileSize,
            storageKey: coverMedia.storageKey,
            fileHash: coverMedia.fileHash,
            mimeType: coverMedia.mimeType,
            mediaType: 'cover',
            displayOrder: 0,
          },
        ]
      : []),
    ...galleryMedia
      .filter((mediaItem) => mediaItem.storageKey && mediaItem.fileHash)
      .map((mediaItem, index) => ({
        fileName: mediaItem.fileName,
        originalName: mediaItem.file.name,
        fileSize: mediaItem.fileSize,
        storageKey: mediaItem.storageKey,
        fileHash: mediaItem.fileHash,
        mimeType: mediaItem.mimeType,
        mediaType: mediaItem.mediaType,
        displayOrder: index + 1,
      })),
  ];

  return {
    uploadedFiles,
    coverMedia,
    galleryMedia,
    handleFileUpload,
    removeFile,
    handleCoverUpload,
    removeCover,
    handleGalleryUpload,
    removeGalleryItem,
    reorderGallery,
    uploadAllFiles,
    uploadAllMedia,
    buildFilesPayload,
    buildMediaPayload,
  };
}
