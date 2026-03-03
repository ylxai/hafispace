import { z } from "zod";

export const bookingSchema = z.object({
  namaClient: z.string().min(2, "Client name must be at least 2 characters"),
  hpClient: z.string().min(6, "Phone number must be at least 6 characters"),
  emailClient: z.string().email("Invalid email").optional().or(z.literal("")),
  paketId: z.string().uuid().optional(),
  paketCustom: z.string().min(2).optional(),
  hargaPaket: z.coerce.number().nonnegative().optional(),
  tanggalSesi: z.string().min(1, "Session date is required"),
  lokasiSesi: z.string().min(2, "Location must be at least 2 characters"),
  maxSelection: z.coerce.number().int().positive().min(1).max(200).default(40),
  notes: z.string().optional(),
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
