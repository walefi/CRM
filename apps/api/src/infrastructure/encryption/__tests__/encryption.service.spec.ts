import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const testKey = 'test-key-32-chars-long--------!';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return testKey;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    service.onModuleInit();
  });

  describe('isAvailable', () => {
    it('should return true when ENCRYPTION_KEY is set', () => {
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same-text';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);

      expect(enc1).not.toBe(enc2);
      expect(service.decrypt(enc1)).toBe(plaintext);
      expect(service.decrypt(enc2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Mot de passe en fran\u00e7ais: \u00e9\u00e8\u00ea';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptObject/decryptObject', () => {
    it('should encrypt and decrypt specified fields in an object', () => {
      const obj = {
        name: 'my-channel',
        apiKey: 'secret-key-123',
        webhookUrl: 'https://example.com',
        token: 'bearer-token-abc',
      };

      const encrypted = service.encryptObject(obj, ['apiKey', 'token']);
      expect(encrypted.name).toBe('my-channel');
      expect(encrypted.webhookUrl).toBe('https://example.com');
      expect(encrypted.apiKey).not.toBe('secret-key-123');
      expect(encrypted.token).not.toBe('bearer-token-abc');

      const decrypted = service.decryptObject(encrypted, ['apiKey', 'token']);
      expect(decrypted.apiKey).toBe('secret-key-123');
      expect(decrypted.token).toBe('bearer-token-abc');
    });

    it('should not modify non-string fields', () => {
      const obj = {
        count: 42,
        active: true,
        apiKey: 'secret',
      };

      const encrypted = service.encryptObject(obj, ['count', 'apiKey']);
      expect(encrypted.count).toBe(42);
      expect(encrypted.active).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw when ENCRYPTION_KEY is not set', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EncryptionService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const noKeyService = module.get<EncryptionService>(EncryptionService);
      noKeyService.onModuleInit();

      expect(() => noKeyService.encrypt('test')).toThrow('Encryption unavailable');
      expect(() => noKeyService.decrypt('test')).toThrow('Encryption unavailable');
    });
  });
});
