import { z } from "zod";
import { DEFAULT_MAX_SELECTION, MAX_SELECTION_LIMIT } from "@/lib/constants";

export const bookingSchema = z.object({
  namaClient: z.string().min(2, "Client name must be at least 2 characters"),
  hpClient: z.string().min(6, "Phone number must be at least 6 characters"),
  emailClient: z.string().email("Invalid email").optional().or(z.literal("")),
  paketId: z.string().uuid().optional(),
  paketCustom: z.string().min(2).optional(),
  hargaPaket: z.coerce.number().nonnegative().optional(),
  tanggalSesi: z.string().min(1, "Session date is required"),
  lokasiSesi: z.string().min(2, "Location must be at least 2 characters"),
  maxSelection: z.coerce.number().int().positive().min(1).max(MAX_SELECTION_LIMIT).default(DEFAULT_MAX_SELECTION),
  notes: z.string().optional(),
});

export const bookingUpdateSchema = z.object({
  id: z.string().uuid("Booking ID must be a valid UUID"),
  namaClient: z.string().min(2, "Client name must be at least 2 characters").optional(),
  hpClient: z.string().min(6, "Phone number must be at least 6 characters").optional(),
  emailClient: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  paketId: z.string().uuid().optional().nullable(),
  paketCustom: z.string().min(2).optional().nullable(),
  hargaPaket: z.coerce.number().nonnegative().optional().nullable(),
  tanggalSesi: z.string().optional(),
  lokasiSesi: z.string().min(2, "Location must be at least 2 characters").optional(),
  maxSelection: z.coerce.number().int().positive().min(1).max(MAX_SELECTION_LIMIT).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional().nullable(),
});

export const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  instagram: z.string().min(2).optional(),
});

export const gallerySchema = z.object({
  namaProject: z.string().min(2),
  bookingId: z.string().uuid(),
  cloudinaryFolderId: z.string().min(3).optional(),
  maxSelection: z.number().int().positive().optional(),
  enableDownload: z.boolean().optional(),
  enablePrint: z.boolean().optional(),
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "QRIS", "OTHER"]),
  notes: z.string().optional(),
  proofUrl: z.string().url().optional(),
});

export const packageSchema = z.object({
  namaPaket: z.string().min(1, "Nama paket wajib diisi"),
  kategori: z.enum(["PREWED", "WEDDING", "PERSONAL", "EVENT", "LAINNYA"]).default("LAINNYA"),
  harga: z.coerce.number().min(0).default(0),
  deskripsi: z.string().optional(),
  kuotaEdit: z.coerce.number().int().positive().optional().nullable(),
  maxSelection: z.coerce.number().int().min(1).default(40),
  includeCetak: z
    .array(z.object({ nama: z.string(), jumlah: z.coerce.number().int().positive() }))
    .optional()
    .nullable(),
  urutan: z.coerce.number().int().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const cloudinaryAccountSchema = z.object({
  cloudName: z.string().min(1, "Cloud name is required"),
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
  label: z.string().min(1, "Label is required"),
  isDefault: z.boolean().optional(),
});

export const gallerySettingsSchema = z.object({
  enableDownload: z.boolean().optional(),
  enablePrint: z.boolean().optional(),
  enableWatermark: z.boolean().optional(),
  customMessage: z.string().optional(),
  maxSelection: z.coerce.number().int().positive().min(1).max(MAX_SELECTION_LIMIT).optional(),
});

export const deleteResourceSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one ID is required"),
});
