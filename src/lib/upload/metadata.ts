/**
 * Metadata Extraction
 * Extract metadata from FSEQ and XSQ/XML files
 */

import fs from 'fs/promises';
import { FSEQMetadata, XSQMetadata } from './types';

/**
 * Extract metadata from FSEQ file
 * FSEQ Header Structure (first 32 bytes):
 * - Bytes 0-3: Magic "PSEQ"
 * - Bytes 4-5: Channel data offset (little-endian)
 * - Byte 6: Minor version
 * - Byte 7: Major version
 * - Bytes 8-9: Header length (little-endian)
 * - Bytes 10-13: Channel count (little-endian)
 * - Bytes 14-17: Frame count (little-endian)
 * - Byte 18: Step time in milliseconds
 */
export async function extractFSEQMetadata(filePath: string): Promise<FSEQMetadata> {
  // Read first 1KB for header
  const fd = await fs.open(filePath, 'r');
  const headerBuffer = Buffer.alloc(1024);
  await fd.read(headerBuffer, 0, 1024, 0);
  await fd.close();

  // Validate magic bytes
  const magic = headerBuffer.toString('ascii', 0, 4);
  if (magic !== 'PSEQ') {
    throw new Error('Invalid FSEQ file: magic bytes mismatch');
  }

  // Parse header fields
  const channelDataOffset = headerBuffer.readUInt16LE(4);
  const minorVersion = headerBuffer.readUInt8(6);
  const majorVersion = headerBuffer.readUInt8(7);
  const headerLength = headerBuffer.readUInt16LE(8);
  const channelCount = headerBuffer.readUInt32LE(10);
  const frameCount = headerBuffer.readUInt32LE(14);
  const stepTime = headerBuffer.readUInt8(18);

  // Validate parsed values
  if (channelCount === 0 || frameCount === 0 || stepTime === 0) {
    throw new Error('Invalid FSEQ header: zero values detected');
  }

  if (channelCount > 1000000) {
    throw new Error('Invalid FSEQ header: channel count too large');
  }

  if (frameCount > 1000000) {
    throw new Error('Invalid FSEQ header: frame count too large');
  }

  // Calculate derived values
  const sequenceLength = (frameCount * stepTime) / 1000; // in seconds
  const fps = Math.round(1000 / stepTime);

  // Try to extract compression type (byte 19)
  let compressionType: string | undefined;
  if (headerBuffer.length > 19) {
    const compressionByte = headerBuffer.readUInt8(19);
    switch (compressionByte) {
      case 0:
        compressionType = 'none';
        break;
      case 1:
        compressionType = 'zstd';
        break;
      case 2:
        compressionType = 'zlib';
        break;
      default:
        compressionType = 'unknown';
    }
  }

  return {
    version: `${majorVersion}.${minorVersion}`,
    channelCount,
    frameCount,
    stepTime,
    sequenceLength,
    fps,
    compressionType,
  };
}

/**
 * Extract metadata from XSQ/XML file
 */
export async function extractXSQMetadata(filePath: string): Promise<XSQMetadata> {
  const xmlContent = await fs.readFile(filePath, 'utf-8');

  // For full XML parsing, we'd use fast-xml-parser
  // For now, use regex to extract key metadata
  const metadata: XSQMetadata = {};

  // Extract xLights version
  const versionMatch = xmlContent.match(/version="([^"]+)"/);
  if (versionMatch) {
    metadata.xLightsVersion = versionMatch[1];
  }

  // Extract media file
  const mediaMatch = xmlContent.match(/mediaFile="([^"]+)"/);
  if (mediaMatch) {
    metadata.mediaFile = mediaMatch[1];
  }

  // Extract sequence type
  const typeMatch = xmlContent.match(/sequenceType="([^"]+)"/);
  if (typeMatch) {
    metadata.sequenceType = typeMatch[1];
  }

  // Extract sequence timing
  const timingMatch = xmlContent.match(/sequenceTiming="([^"]+)"/);
  if (timingMatch) {
    metadata.sequenceTiming = timingMatch[1];
  }

  // Count models (approximate)
  const modelMatches = xmlContent.match(/<model /g);
  metadata.modelCount = modelMatches ? modelMatches.length : 0;

  // Count effects (approximate)
  const effectMatches = xmlContent.match(/<effect /g);
  metadata.effectCount = effectMatches ? effectMatches.length : 0;

  return metadata;
}

/**
 * Extract metadata from XSQ/XML file using full XML parser
 * This is a more robust version that requires fast-xml-parser
 */
export async function extractXSQMetadataAdvanced(filePath: string): Promise<XSQMetadata> {
  try {
    // Dynamically import fast-xml-parser if available
    const { XMLParser } = await import('fast-xml-parser');

    const xmlContent = await fs.readFile(filePath, 'utf-8');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const data = parser.parse(xmlContent);

    // Handle both 'sequence' and 'xsequence' root elements
    const sequence = data.sequence || data.xsequence;

    if (!sequence) {
      throw new Error('Invalid XSQ/XML file: missing sequence root element');
    }

    const metadata: XSQMetadata = {
      xLightsVersion: sequence['@_version'],
      mediaFile: sequence['@_mediaFile'],
      sequenceType: sequence['@_sequenceType'],
      sequenceTiming: sequence['@_sequenceTiming'],
    };

    // Count models
    if (sequence.models?.model) {
      metadata.modelCount = Array.isArray(sequence.models.model)
        ? sequence.models.model.length
        : 1;
    } else {
      metadata.modelCount = 0;
    }

    // Count effects recursively
    metadata.effectCount = countEffectsRecursive(sequence);

    return metadata;
  } catch (error) {
    // Fall back to regex-based extraction if fast-xml-parser is not available
    console.warn('fast-xml-parser not available, using fallback extraction');
    return extractXSQMetadata(filePath);
  }
}

/**
 * Recursively count effects in XML object
 */
function countEffectsRecursive(obj: any): number {
  let count = 0;

  if (obj.effect) {
    count += Array.isArray(obj.effect) ? obj.effect.length : 1;
  }

  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countEffectsRecursive(obj[key]);
    }
  }

  return count;
}

/**
 * Extract metadata based on file type
 */
export async function extractMetadata(
  filePath: string,
  fileType: string
): Promise<FSEQMetadata | XSQMetadata | null> {
  try {
    if (fileType === 'RENDERED') {
      return await extractFSEQMetadata(filePath);
    } else if (fileType === 'SOURCE') {
      return await extractXSQMetadataAdvanced(filePath);
    }
    return null;
  } catch (error) {
    console.error('Metadata extraction failed:', error);
    return null;
  }
}
