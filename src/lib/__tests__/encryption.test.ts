import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, isEncrypted, generateMasterKey, isEncryptionConfigured } from '../encryption';

describe('Encryption Utilities', () => {
  // Set up test environment variable
  const testKey = generateMasterKey();
  process.env.CLOUDINARY_MASTER_KEY = testKey;

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      // Same plaintext should produce different ciphertext due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'API密钥🔐 encrypt';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted string', () => {
      const encrypted = encrypt('some-secret');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(isEncrypted('plaintext-key')).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(isEncrypted('not-valid-format')).toBe(false);
    });

    it('should return false for short hex strings', () => {
      expect(isEncrypted('abc')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });
  });

  describe('generateMasterKey', () => {
    it('should generate a 64-character hex key', () => {
      const key = generateMasterKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateMasterKey();
      const key2 = generateMasterKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('isEncryptionConfigured', () => {
    it('should return true when CLOUDINARY_MASTER_KEY is set', () => {
      expect(isEncryptionConfigured()).toBe(true);
    });

    it('should return false when CLOUDINARY_MASTER_KEY is not set', () => {
      const originalKey = process.env.CLOUDINARY_MASTER_KEY;
      delete process.env.CLOUDINARY_MASTER_KEY;
      
      expect(isEncryptionConfigured()).toBe(false);
      
      // Restore
      process.env.CLOUDINARY_MASTER_KEY = originalKey;
    });
  });

  describe('encryption format', () => {
    it('should produce encrypted string with correct format (iv:authTag:ciphertext)', () => {
      const encrypted = encrypt('test-key');
      const parts = encrypted.split(':');
      
      expect(parts).toHaveLength(3);
      // Each part should be valid hex
      parts.forEach(part => {
        expect(part).toMatch(/^[0-9a-f]+$/i);
      });
    });

    it('should have correct IV and auth tag lengths (32 hex = 16 bytes)', () => {
      const encrypted = encrypt('test-key');
      const [ivHex, authTagHex] = encrypted.split(':');
      
      expect(ivHex).toHaveLength(32); // 16 bytes
      expect(authTagHex).toHaveLength(32); // 16 bytes
    });
  });
});
