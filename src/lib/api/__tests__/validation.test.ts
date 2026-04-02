import { describe, expect,it } from 'vitest';

import { bookingSchema } from '../validation';

describe('Zod Validation Schemas', () => {
  describe('bookingSchema', () => {
    it('should validate a valid booking', () => {
      const validBooking = {
        namaClient: 'John Doe',
        hpClient: '081234567890',
        emailClient: 'john@example.com',
        tanggalSesi: '2026-03-20',
        lokasiSesi: 'Jakarta',
      };
      const result = bookingSchema.safeParse(validBooking);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number (too short)', () => {
      const invalidBooking = {
        namaClient: 'John Doe',
        hpClient: '123', // too short
        tanggalSesi: '2026-03-20',
        lokasiSesi: 'Jakarta',
      };
      const result = bookingSchema.safeParse(invalidBooking);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalidBooking = {
        namaClient: 'John Doe',
        hpClient: '081234567890',
        emailClient: 'not-an-email',
        tanggalSesi: '2026-03-20',
        lokasiSesi: 'Jakarta',
      };
      const result = bookingSchema.safeParse(invalidBooking);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidBooking = {
        namaClient: 'John Doe',
        // hpClient required
        // tanggalSesi required
        // lokasiSesi required
      };
      const result = bookingSchema.safeParse(invalidBooking);
      expect(result.success).toBe(false);
    });

    it('should accept optional email as empty string', () => {
      const validBooking = {
        namaClient: 'John Doe',
        hpClient: '081234567890',
        emailClient: '',
        tanggalSesi: '2026-03-20',
        lokasiSesi: 'Jakarta',
      };
      const result = bookingSchema.safeParse(validBooking);
      expect(result.success).toBe(true);
    });
  });
});
