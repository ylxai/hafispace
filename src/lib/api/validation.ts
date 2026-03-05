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
