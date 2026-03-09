import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import {
  uploadMultipleImages,
  CLOUDINARY_FOLDERS,
} from "@/lib/cloudinary-upload";
import { getCloudinaryAccount, deletePhotoFromCloudinary } from "@/lib/cloudinary";
import { unauthorizedResponse, notFoundResponse, validationErrorResponse, internalErrorResponse } from "@/lib/api/response";

// Upload validation constants
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per file (increased for high-res)
const MAX_FILES_PER_UPLOAD = 100; // Increased batch size
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/avif',
];

// Magic bytes signatures untuk validasi file yang sesungguhnya (bukan hanya MIME dari client)
const MAGIC_BYTES: Array<{ bytes: number[]; offset?: number; mime: string }> = [
  { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },           // JPEG
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },      // PNG
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },     // WEBP (RIFF header)
  { bytes: [0x49, 0x49, 0x2A, 0x00], mime: 'image/tiff' },     // TIFF (little-endian)
  { bytes: [0x4D, 0x4D, 0x00, 0x2A], mime: 'image/tiff' },     // TIFF (big-endian)
];

/**
 * Verifikasi file adalah benar-benar image berdasarkan magic bytes
 * Mencegah upload file berbahaya dengan extension/MIME yang dipalsukan
 */
async function verifyImageMagicBytes(file: File): Promise<boolean> {
  // Baca hanya 12 bytes pertama (cukup untuk semua signature)
  const headerSlice = file.slice(0, 12);
  const buffer = new Uint8Array(await headerSlice.arrayBuffer());

  // HEIC/HEIF — cek ftyp box di offset 4
  // Format: ????ftyp (4 bytes size + 'ftyp' magic)
  if (buffer.length >= 8) {
    const ftyp = [buffer[4], buffer[5], buffer[6], buffer[7]];
    if (ftyp[0] === 0x66 && ftyp[1] === 0x74 && ftyp[2] === 0x79 && ftyp[3] === 0x70) {
      return true; // HEIC/HEIF/MP4 container
    }
  }

  // Cek magic bytes lainnya
  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    const match = sig.bytes.every((b, i) => buffer[offset + i] === b);
    if (match) return true;
  }

  return false;
}

// Upload multiple photos to Cloudinary and save to database
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: galleryId } = await params;

  try {
    // Verify that the gallery belongs to the current vendor
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: galleryId,
        vendorId: session.user.id,
      },
      include: {
        vendor: {
          select: {
            cloudinaryCloudName: true,
            cloudinaryApiKey: true,
            cloudinaryApiSecret: true,
          },
        },
      },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found or doesn't belong to current vendor");
    }

    // Get accountId from formData (optional)
    const formData = await request.formData();
    const accountId = formData.get("accountId") as string | null;
    const files = formData.getAll("files") as File[];

    // Check if vendor has any Cloudinary account configured
    try {
      await getCloudinaryAccount(session.user.id, accountId ?? undefined);
    } catch {
      return NextResponse.json(
        { 
          error: "No Cloudinary account configured. Please add a Cloudinary account in Settings first.",
          code: "CLOUDINARY_NOT_CONFIGURED"
        },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return validationErrorResponse("No files provided");
    }

    // Validate number of files
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files per upload` },
        { status: 400 }
      );
    }

    // Validasi metadata dulu (tanpa load ke memory)
    for (const file of files) {
      if (!file) continue;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            fileName: file.name,
            fileSize: file.size,
            code: "FILE_TOO_LARGE"
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `File "${file.name}" has unsupported format. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
            fileName: file.name,
            fileType: file.type,
            code: "UNSUPPORTED_FORMAT"
          },
          { status: 400 }
        );
      }

      // Verifikasi magic bytes — cegah file berbahaya dengan MIME dipalsukan
      const isValidImage = await verifyImageMagicBytes(file);
      if (!isValidImage) {
        return NextResponse.json(
          {
            error: `File "${file.name}" bukan file gambar yang valid`,
            fileName: file.name,
            code: "INVALID_FILE_CONTENT"
          },
          { status: 400 }
        );
      }
    }

    // Prepare Cloudinary folder path
    const folderPath = `${CLOUDINARY_FOLDERS.GALLERIES}/${session.user.id}/${galleryId}`;
    const uploadedAt = new Date().toISOString();

    // Upload dalam batch kecil (5 files per batch) untuk hindari OOM
    const BATCH_SIZE = 5;
    const uploadResults: Awaited<ReturnType<typeof uploadMultipleImages>> = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      // Load buffer satu batch saja, lalu GC bisa reclaim setelah batch selesai
      const batchFiles: Array<{ file: Buffer; filename: string; mimeType: string }> = [];
      for (const file of batch) {
        if (!file) continue;
        const buffer = Buffer.from(await file.arrayBuffer());
        batchFiles.push({
          file: buffer,
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
        });
      }

      const batchResults = await uploadMultipleImages(
        session.user.id,
        batchFiles,
        {
          accountId: accountId ?? undefined,
          folder: folderPath,
          tags: ['gallery', galleryId, session.user.id],
          context: {
            gallery_id: galleryId,
            vendor_id: session.user.id,
            uploaded_at: uploadedAt,
          },
        }
      );

      uploadResults.push(...batchResults);
    }

    // Pisahkan hasil upload yang sukses dan gagal
    const failedUploads: Array<{ filename: string; error: string }> = [];
    const successfulUploads = uploadResults.filter(r => {
      if (r.success && r.data) return true;
      failedUploads.push({ filename: r.filename, error: r.error ?? 'Upload failed' });
      return false;
    });

    // Simpan semua foto yang berhasil upload ke DB sekaligus (1 query, bukan N queries)
    // Jika DB gagal, rollback dengan menghapus file dari Cloudinary (cegah orphan files)
    let savedPhotos: Array<{
      id: string;
      storageKey: string;
      filename: string;
      url: string;
      thumbnailUrl: string | null;
      width: number | null;
      height: number | null;
      size: number | null;
    }> = [];

    if (successfulUploads.length > 0) {
      try {
        // Mapping di dalam try — jika .map() throw, rollback Cloudinary tetap berjalan
        const photoDataList = successfulUploads.map(result => {
          const data = result.data;
          if (!data) throw new Error(`Missing data for ${result.filename}`);
          return {
            galleryId: gallery.id,
            storageKey: data.publicId,
            filename: result.filename,
            url: data.url,
            thumbnailUrl: data.thumbnailUrl,
            width: data.width,
            height: data.height,
            size: data.size,
            mimeType: files.find(f => f?.name === result.filename)?.type ?? 'image/jpeg',
            urutan: 0,
          };
        });

        // createMany — satu round-trip ke DB untuk semua foto
        await prisma.photo.createMany({
          data: photoDataList,
          skipDuplicates: true,
        });

        // Ambil data foto yang baru disimpan untuk response
        savedPhotos = await prisma.photo.findMany({
          where: {
            galleryId: gallery.id,
            storageKey: { in: photoDataList.map(p => p.storageKey) },
          },
          select: {
            id: true,
            storageKey: true,
            filename: true,
            url: true,
            thumbnailUrl: true,
            width: true,
            height: true,
            size: true,
          },
        });
      } catch (dbError) {
        // DB gagal — rollback dengan hapus semua file dari Cloudinary (cegah orphan files)
        console.error("DB write failed after Cloudinary upload — rolling back:", dbError);
        const rollbackResults = await Promise.allSettled(
          successfulUploads
            .filter(r => r.data?.publicId)
            .map(r => deletePhotoFromCloudinary(session.user.id, r.data?.publicId ?? ""))
        );
        rollbackResults.forEach((r, i) => {
          if (r.status === "rejected") {
            console.error(`Rollback failed for upload[${i}]:`, r.reason);
          }
        });
        return internalErrorResponse("Failed to save photos to database. Uploaded files have been cleaned up.");
      }
    }

    // Get updated photo count
    const photoCount = await prisma.photo.count({
      where: { galleryId: gallery.id },
    });

    return NextResponse.json({
      message: `${savedPhotos.length} photo(s) uploaded successfully`,
      photos: savedPhotos,
      failed: failedUploads,
      photoCount,
      stats: {
        total: files.length,
        successful: savedPhotos.length,
        failed: failedUploads.length,
      },
    });
  } catch (error) {
    console.error("Error uploading photos:", error);
    return internalErrorResponse("Failed to upload photos");
  }
}

// Sync photos from Cloudinary (optional feature)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: galleryId } = await params;

  try {
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: galleryId,
        vendorId: session.user.id,
      },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found");
    }

    // Sync logic can be implemented here if needed
    return NextResponse.json({
      message: "Sync feature available",
    });
  } catch (error) {
    console.error("Error syncing photos:", error);
    return internalErrorResponse("Failed to sync photos");
  }
}