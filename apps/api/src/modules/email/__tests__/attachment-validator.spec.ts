import { AttachmentValidator, AttachmentInput } from '../attachments/attachment-validator';

describe('AttachmentValidator', () => {
  let validator: AttachmentValidator;

  beforeEach(() => {
    validator = new AttachmentValidator();
  });

  describe('validate', () => {
    it('should accept a valid PDF attachment', () => {
      const input: AttachmentInput = {
        filename: 'document.pdf',
        contentType: 'application/pdf',
        size: 1024,
        content: Buffer.from('pdf content'),
      };

      const result = validator.validate(input);

      expect(result.safeFilename).toBe('document.pdf');
      expect(result.checksum).toBeDefined();
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject exe files', () => {
      const input: AttachmentInput = {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
        size: 1024,
        content: Buffer.from('exe content'),
      };

      expect(() => validator.validate(input)).toThrow('Blocked file extension');
    });

    it('should reject blocked MIME types', () => {
      const input: AttachmentInput = {
        filename: 'script.ps1',
        contentType: 'application/x-bat',
        size: 1024,
        content: Buffer.from('bat content'),
      };

      expect(() => validator.validate(input)).toThrow();
    });

    it('should reject files exceeding max size', () => {
      const largeValidator = new AttachmentValidator({ maxFileSize: 100 });
      const input: AttachmentInput = {
        filename: 'big.pdf',
        contentType: 'application/pdf',
        size: 200,
        content: Buffer.from('x'.repeat(200)),
      };

      expect(() => largeValidator.validate(input)).toThrow('exceeds max');
    });

    it('should sanitize dangerous filenames', () => {
      const input: AttachmentInput = {
        filename: '../../../etc/passwd',
        contentType: 'text/plain',
        size: 100,
        content: Buffer.from('content'),
      };

      const result = validator.validate(input);

      expect(result.safeFilename).not.toContain('..');
      expect(result.safeFilename).not.toContain('/');
    });

    it('should handle path traversal in filename', () => {
      const input: AttachmentInput = {
        filename: '....//....//etc/passwd',
        contentType: 'text/plain',
        size: 100,
        content: Buffer.from('content'),
      };

      const result = validator.validate(input);

      expect(result.safeFilename).not.toContain('..');
    });

    it('should warn on empty files', () => {
      const input: AttachmentInput = {
        filename: 'empty.txt',
        contentType: 'text/plain',
        size: 0,
        content: Buffer.alloc(0),
      };

      const result = validator.validate(input);

      expect(result.warnings).toContain('Empty file');
    });

    it('should warn on unknown MIME type', () => {
      const input: AttachmentInput = {
        filename: 'unknown.xyz',
        contentType: 'application/octet-stream',
        size: 100,
        content: Buffer.from('content'),
      };

      const result = validator.validate(input);

      expect(result.warnings).toContain('Unknown MIME type');
    });

    it('should compute consistent checksum', () => {
      const input: AttachmentInput = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: 100,
        content: Buffer.from('same content'),
      };

      const result1 = validator.validate(input);
      const result2 = validator.validate(input);

      expect(result1.checksum).toBe(result2.checksum);
    });

    it('should reject empty filename by giving default name', () => {
      const input: AttachmentInput = {
        filename: '',
        contentType: 'text/plain',
        size: 100,
        content: Buffer.from('content'),
      };

      const result = validator.validate(input);

      expect(result.safeFilename).toBe('unnamed_attachment');
    });

    it('should truncate very long filenames', () => {
      const input: AttachmentInput = {
        filename: 'a'.repeat(300) + '.pdf',
        contentType: 'application/pdf',
        size: 100,
        content: Buffer.from('content'),
      };

      const result = validator.validate(input);

      expect(result.safeFilename.length).toBeLessThanOrEqual(255);
    });
  });
});
