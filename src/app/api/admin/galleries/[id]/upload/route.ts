import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import {
  uploadMultipleImages,
  CLOUDINARY_FOLDERS,
} from "@/lib/cloudinary-upload";
import { getCloudinaryAccount } from "@/lib/cloudinary";
import { unauthorizedResponse } from "@/lib/api/response";

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
      return NextResponse.json(
        { error: "Gallery not found or doesn't belong to current vendor" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate number of files
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files per upload` },
        { status: 400 }
      );
    }

    // Validate each file and convert to buffer
    const validatedFiles: Array<{ file: Buffer; filename: string; mimeType: string }> = [];
    
    for (const file of files) {
      if (!file) continue;

      // Validate file size
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

      // Validate file type
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

      // Convert File to Buffer for upload
      const buffer = Buffer.from(await file.arrayBuffer());
      validatedFiles.push({ 
        file: buffer, 
        filename: file.name,
        mimeType: file.type || 'image/jpeg'
      });
    }

    // Prepare Cloudinary folder path
    const folderPath = `${CLOUDINARY_FOLDERS.GALLERIES}/${session.user.id}/${galleryId}`;

    // Upload to Cloudinary with progress tracking
    const uploadResults = await uploadMultipleImages(
      session.user.id,
      validatedFiles,
      {
        accountId: accountId ?? undefined,
        folder: folderPath,
        tags: ['gallery', galleryId, session.user.id],
        context: {
          gallery_id: galleryId,
          vendor_id: session.user.id,
          uploaded_at: new Date().toISOString(),
        },
      }
    );

    // Save successful uploads to database
    const savedPhotos = [];
    const failedUploads = [];

    for (const result of uploadResults) {
      if (result.success && result.data) {
        try {
          const photo = await prisma.photo.create({
            data: {
              galleryId: gallery.id,
              storageKey: result.data.publicId,
              filename: result.filename,
              url: result.data.url,
              thumbnailUrl: result.data.thumbnailUrl,
              width: result.data.width,
              height: result.data.height,
              size: result.data.size,
              mimeType: validatedFiles.find(f => f.filename === result.filename)?.mimeType ?? 'image/jpeg',
              urutan: 0, // Will be sorted later if needed
            },
          });

          savedPhotos.push({
            id: photo.id,
            storageKey: photo.storageKey,
            filename: photo.filename,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl,
            width: photo.width,
            height: photo.height,
            size: photo.size,
          });
        } catch (error) {
          console.error(`Error saving photo ${result.filename} to database:`, error);
          failedUploads.push({
            filename: result.filename,
            error: 'Failed to save to database',
          });
        }
      } else {
        failedUploads.push({
          filename: result.filename,
          error: result.error ?? 'Upload failed',
        });
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
    return NextResponse.json(
      { 
        error: "Failed to upload photos",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    // Sync logic can be implemented here if needed
    return NextResponse.json({
      message: "Sync feature available",
    });
  } catch (error) {
    console.error("Error syncing photos:", error);
    return NextResponse.json(
      { error: "Failed to sync photos" },
      { status: 500 }
    );
  }
}