import { describe, expect, it } from "vitest";

import {
  bookingUpdateSchema,
  bulkDeleteSchema,
  bulkPhotoDeleteSchema,
  bulkSelectionDeleteSchema,
  clientSchema,
  deleteResourceSchema,
  gallerySchema,
  gallerySettingsSchema,
  packageSchema,
  paymentSchema,
} from "@/lib/api/validation";

describe("bookingUpdateSchema", () => {
  it("should validate update with only id", () => {
    const result = bookingUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID for id", () => {
    const result = bookingUpdateSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("should accept valid status values", () => {
    const statuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    statuses.forEach(status => {
      const result = bookingUpdateSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        status,
      });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid status", () => {
    const result = bookingUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });
});

describe("clientSchema", () => {
  it("should validate valid client", () => {
    const result = clientSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      phone: "081234567890",
    });
    expect(result.success).toBe(true);
  });

  it("should reject name shorter than 2 chars", () => {
    const result = clientSchema.safeParse({ name: "J" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = clientSchema.safeParse({ name: "John", email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("should allow optional fields to be absent", () => {
    const result = clientSchema.safeParse({ name: "John Doe" });
    expect(result.success).toBe(true);
  });
});

describe("gallerySchema", () => {
  it("should validate valid gallery", () => {
    const result = gallerySchema.safeParse({
      namaProject: "Wedding John & Jane",
      bookingId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid bookingId UUID", () => {
    const result = gallerySchema.safeParse({
      namaProject: "Wedding",
      bookingId: "not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject namaProject shorter than 2 chars", () => {
    const result = gallerySchema.safeParse({
      namaProject: "W",
      bookingId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});

describe("paymentSchema", () => {
  it("should validate valid payment", () => {
    const result = paymentSchema.safeParse({
      amount: 500000,
      paymentMethod: "TRANSFER",
    });
    expect(result.success).toBe(true);
  });

  it("should reject zero or negative amount", () => {
    expect(paymentSchema.safeParse({ amount: 0, paymentMethod: "CASH" }).success).toBe(false);
    expect(paymentSchema.safeParse({ amount: -100, paymentMethod: "CASH" }).success).toBe(false);
  });

  it("should accept all payment methods", () => {
    const methods = ["CASH", "TRANSFER", "QRIS", "OTHER"];
    methods.forEach(paymentMethod => {
      const result = paymentSchema.safeParse({ amount: 100000, paymentMethod });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid payment method", () => {
    const result = paymentSchema.safeParse({ amount: 100000, paymentMethod: "BITCOIN" });
    expect(result.success).toBe(false);
  });

  it("should coerce string amount to number", () => {
    const result = paymentSchema.safeParse({ amount: "500000", paymentMethod: "CASH" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(500000);
  });
});

describe("packageSchema", () => {
  it("should validate valid package", () => {
    const result = packageSchema.safeParse({
      namaPaket: "Paket Wedding Basic",
      kategori: "WEDDING",
      harga: 5000000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept all valid kategori values", () => {
    const kategories = ["PREWED", "WEDDING", "PERSONAL", "EVENT", "LAINNYA"];
    kategories.forEach(kategori => {
      const result = packageSchema.safeParse({ namaPaket: "Test", kategori });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid kategori", () => {
    const result = packageSchema.safeParse({ namaPaket: "Test", kategori: "MATERNITY" });
    expect(result.success).toBe(false);
  });

  it("should default kategori to LAINNYA", () => {
    const result = packageSchema.safeParse({ namaPaket: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kategori).toBe("LAINNYA");
  });

  it("should accept valid status values", () => {
    expect(packageSchema.safeParse({ namaPaket: "Test", status: "active" }).success).toBe(true);
    expect(packageSchema.safeParse({ namaPaket: "Test", status: "inactive" }).success).toBe(true);
  });

  it("should reject UPPERCASE status (must be lowercase)", () => {
    const result = packageSchema.safeParse({ namaPaket: "Test", status: "ACTIVE" });
    expect(result.success).toBe(false);
  });

  it("should default status to active", () => {
    const result = packageSchema.safeParse({ namaPaket: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("active");
  });
});

describe("gallerySettingsSchema", () => {
  it("should validate with all optional fields", () => {
    const result = gallerySettingsSchema.safeParse({
      enableDownload: true,
      enablePrint: false,
      enableWatermark: true,
      maxSelection: 50,
    });
    expect(result.success).toBe(true);
  });

  it("should validate empty object (all optional)", () => {
    const result = gallerySettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject maxSelection over limit", () => {
    const result = gallerySettingsSchema.safeParse({ maxSelection: 10000 });
    expect(result.success).toBe(false);
  });
});

describe("deleteResourceSchema", () => {
  it("should validate valid UUID", () => {
    const result = deleteResourceSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-UUID id", () => {
    const result = deleteResourceSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("should reject missing id", () => {
    const result = deleteResourceSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("bulkDeleteSchema", () => {
  it("should validate array of UUIDs", () => {
    const result = bulkDeleteSchema.safeParse({
      ids: [
        "550e8400-e29b-41d4-a716-446655440000",
        "550e8400-e29b-41d4-a716-446655440001",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty array", () => {
    const result = bulkDeleteSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });

  it("should reject non-UUID in array", () => {
    const result = bulkDeleteSchema.safeParse({ ids: ["not-a-uuid"] });
    expect(result.success).toBe(false);
  });
});

describe("bulkPhotoDeleteSchema", () => {
  it("should validate valid bulk photo delete", () => {
    const result = bulkPhotoDeleteSchema.safeParse({
      photoIds: ["550e8400-e29b-41d4-a716-446655440000"],
      action: "delete",
    });
    expect(result.success).toBe(true);
  });

  it("should reject wrong action value", () => {
    const result = bulkPhotoDeleteSchema.safeParse({
      photoIds: ["550e8400-e29b-41d4-a716-446655440000"],
      action: "update",
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkSelectionDeleteSchema", () => {
  it("should validate valid bulk selection delete", () => {
    const result = bulkSelectionDeleteSchema.safeParse({
      selectionIds: ["550e8400-e29b-41d4-a716-446655440000"],
      action: "delete",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty selectionIds", () => {
    const result = bulkSelectionDeleteSchema.safeParse({
      selectionIds: [],
      action: "delete",
    });
    expect(result.success).toBe(false);
  });
});
