/**
 * Credential Encryption Utility
 * 
 * Menggunakan AES-256-GCM untuk enkripsi credentials sensitif (Cloudinary API keys, dll).
 * Master key disimpan di environment variable CLOUDINARY_MASTER_KEY.
 * 
 * Format encrypted: iv:authTag:ciphertext (hex encoded)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get master key from environment variable
 * Key harus 32 bytes (64 hex characters)
 */
function getMasterKey(): Buffer {
  const keyHex = process.env.CLOUDINARY_MASTER_KEY;
  
  if (!keyHex) {
    throw new Error(
      'CLOUDINARY_MASTER_KEY environment variable is not set. ' +
      'Generate a key with: openssl rand -hex 32'
    );
  }
  
  if (keyHex.length !== 64) {
    throw new Error(
      `CLOUDINARY_MASTER_KEY must be 64 hex characters (32 bytes), got ${keyHex.length}. ` +
      'Generate a new key with: openssl rand -hex 32'
    );
  }
  
  return Buffer.from(keyHex, 'hex');
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt plaintext string
 * @param text - Plaintext to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext
 */
export function encrypt(text: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt encrypted string
 * @param encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  const key = getMasterKey();
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected: iv:authTag:ciphertext');
  }
  
  const [ivHex, authTagHex, encrypted] = parts as [string, string, string];
  
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format. Missing components.');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: ${iv.length}, expected: ${IV_LENGTH}`);
  }
  
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: ${authTag.length}, expected: ${AUTH_TAG_LENGTH}`);
  }
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a new master key
 * Use this to generate a key for .env file
 */
export function generateMasterKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Check if a string is already encrypted (heuristic check)
 * This is useful for migration scripts
 */
export function isEncrypted(text: string): boolean {
  // Check if it matches the format iv:authTag:ciphertext
  const parts = text.split(':');
  if (parts.length !== 3) return false;
  
  const [ivHex, authTagHex, ciphertext] = parts as [string, string, string];
  
  if (!ivHex || !authTagHex || !ciphertext) return false;
  
  // Basic hex validation
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(ivHex) || !hexRegex.test(authTagHex) || !hexRegex.test(ciphertext)) {
    return false;
  }
  
  // Length checks (32 hex chars = 16 bytes for IV and auth tag)
  if (ivHex.length !== 32 || authTagHex.length !== 32) {
    return false;
  }
  
  return true;
}
