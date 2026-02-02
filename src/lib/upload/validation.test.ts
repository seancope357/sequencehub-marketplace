import { describe, it, expect } from 'vitest';
import { validateFile } from './validation';
import { FileType } from '@prisma/client';

describe('File Validation', () => {
  it('should validate a correct FSEQ file', () => {
    const result = validateFile(
      'sequence.fseq',
      1024 * 1024, // 1MB
      'application/octet-stream',
      FileType.RENDERED
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject a file with invalid extension for the type', () => {
    const result = validateFile(
      'sequence.txt',
      1024,
      'text/plain',
      FileType.RENDERED
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Invalid extension for RENDERED. Expected: .fseq. Got: .txt'
    );
  });

  it('should reject a file that is too large', () => {
    const result = validateFile(
      'huge.fseq',
      600 * 1024 * 1024, // 600MB (limit is 500MB)
      'application/octet-stream',
      FileType.RENDERED
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('File too large'))).toBe(true);
  });

  it('should detect path traversal attempts', () => {
    const result = validateFile(
      '../etc/passwd',
      1024,
      'application/octet-stream',
      FileType.RENDERED
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid filename: path traversal detected');
  });

  it('should validate a source file correctly', () => {
    const result = validateFile(
      'project.xsq',
      5 * 1024 * 1024,
      'application/xml',
      FileType.SOURCE
    );
    expect(result.valid).toBe(true);
  });
});
