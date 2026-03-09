import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { DEFAULT_MAX_SELECTION, GALLERY_VIEW_COOKIE_TTL_SECONDS } from "@/lib/constants";

const PHOTOS_PER_PAGE = 50;
const FINGERPRINT_TTL_SECONDS = 24 * 60 * 60; // 24 jam

// Fallback in-memory cache jika Redis tidak tersedia
const viewFingerprintCache = new Map<string, number>();
const FINGERPRINT_TTL_MS = FINGERPRINT_TTL_SECONDS * 1000;

const cleanupViewCache = () => {
  const cutoff = Date.now() - FINGERPRINT_TTL_MS;
  for (const [key, ts] of viewFingerprintCache.entries()) {
    if (ts < cutoff) viewFingerprintCache.delete(key);
  }
};
if (typeof setInterval !== "undefined" && typeof (globalThis as Record<string, unknown>).EdgeRuntime === "undefined") {
  setInterval(cleanupViewCache, 60 * 60 * 1000); // setiap 1 jam
}

/**
 * Cek apakah fingerprint sudah view dalam 24 jam.
 * Prioritas: Redis → fallback in-memory Map.
 * Returns true jika sudah viewed (skip increment).
 */
async function isAlreadyViewed(fingerprintHash: string): Promise<boolean> {
  if (redis) {
    const key = `view:${fingerprintHash}`;
    // SET key 1 EX 86400 NX — hanya set jika belum ada, return null jika sudah ada
    const result = await redis.set(key, 1, { ex: FINGERPRINT_TTL_SECONDS, nx: true });
    // result === "OK" berarti baru pertama kali (belum viewed)
    // result === null berarti sudah ada key (sudah viewed)
    return result === null;
  }

  // Fallback: in-memory Map
  if (viewFingerprintCache.has(fingerprintHash)) return true;
  viewFingerprintCache.set(fingerprintHash, Date.now());
  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Parse pagination params
  const url = new URL(_request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? String(PHOTOS_PER_PAGE), 10),
    100 // max 100 per request
  );

  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: token },
    include: {
      settings: {
        select: {
          enableDownload: true,
          welcomeMessage: true,
          thankYouMessage: true,
          bannerClientName: true,
          bannerEventDate: true,
          bannerMessage: true,
        },
      },
      booking: {
        select: {
          maxSelection: true,
        },
      },
      vendor: {
        select: {
          namaStudio: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!gallery) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Gallery not found" },
      { status: 404 }
    );
  }

  if (gallery.status === "DRAFT") {
    return NextResponse.json(
      { code: "NOT_PUBLISHED", message: "Gallery is not published yet" },
      { status: 403 }
    );
  }

  // Cek apakah token sudah expired
  if (gallery.tokenExpiresAt && gallery.tokenExpiresAt < new Date()) {
    return NextResponse.json(
      { code: "TOKEN_EXPIRED", message: "Link galeri ini sudah tidak aktif. Hubungi fotografer untuk mendapatkan link baru." },
      { status: 410 }
    );
  }

  // Ambil photos dengan pagination
  const photos = await prisma.photo.findMany({
    where: { galleryId: gallery.id },
    orderBy: { urutan: "asc" },
    take: limit + 1, // ambil 1 extra untuk detect apakah ada halaman berikutnya
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      filename: true,
      url: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      urutan: true,
    },
  });

  const hasNextPage = photos.length > limit;
  const paginatedPhotos = hasNextPage ? photos.slice(0, limit) : photos;
  const nextCursor = hasNextPage ? paginatedPhotos[paginatedPhotos.length - 1]?.id : null;

  // Total count hanya pada request pertama (tanpa cursor)
  const totalPhotos = !cursor
    ? await prisma.photo.count({ where: { galleryId: gallery.id } })
    : undefined;

  // Increment view count hanya sekali per session
  // Gunakan cookie + IP+UA fingerprint sebagai double check (cegah cookie bypass)
  const viewedCookieKey = `viewed_${gallery.id}`;
  const hasCookie = _request.headers.get("cookie")?.includes(viewedCookieKey) ?? false;

  // Buat fingerprint dari IP + User-Agent (non-PII, hanya hash)
  const ip = _request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? _request.headers.get("x-real-ip")
    ?? "unknown";
  const ua = _request.headers.get("user-agent") ?? "unknown";
  const rawFingerprint = `${gallery.id}:${ip}:${ua.slice(0, 100)}`;

  // Hash fingerprint dengan Web Crypto API (tersedia di Edge runtime)
  const fingerprintHash = await crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(rawFingerprint))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 16) // Ambil 16 hex char (64-bit) — cukup untuk dedup
    );

  // Cek apakah fingerprint ini sudah view dalam 24 jam via Redis (atau in-memory fallback)
  const alreadyViewed = hasCookie || await isAlreadyViewed(fingerprintHash);

  if (!alreadyViewed) {
    await prisma.gallery.update({
      where: { id: gallery.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  // Ambil selections sekaligus — count dihitung dari hasil query (1 query, bukan 2)
  const selections = await prisma.photoSelection.findMany({
    where: { galleryId: gallery.id },
    select: {
      fileId: true,
      selectionType: true,
      isLocked: true,
    },
  });

  const selectionCount = selections.filter((s) => !s.isLocked).length;

  const response = NextResponse.json({
    gallery: {
      id: gallery.id,
      namaProject: gallery.namaProject,
      status: gallery.status,
      clientToken: gallery.clientToken,
      viewCount: gallery.viewCount,
      vendor: gallery.vendor,
      settings: {
        maxSelection: gallery.booking?.maxSelection ?? DEFAULT_MAX_SELECTION,
        enableDownload: gallery.settings?.enableDownload ?? true,
        welcomeMessage: gallery.settings?.welcomeMessage ?? null,
        thankYouMessage: gallery.settings?.thankYouMessage ?? null,
        bannerClientName: gallery.settings?.bannerClientName ?? null,
        bannerEventDate: gallery.settings?.bannerEventDate ?? null,
        bannerMessage: gallery.settings?.bannerMessage ?? null,
      },
      photos: paginatedPhotos,
      selectionCount,
      selections: selections.map((s) => s.fileId),
    },
    pagination: {
      hasNextPage,
      nextCursor,
      ...(totalPhotos !== undefined ? { totalPhotos } : {}),
    },
  });

  // Set cookie agar view count tidak diincrement lagi pada request berikutnya
  if (!alreadyViewed) {
    response.cookies.set(viewedCookieKey, "1", {
      httpOnly: true,
      maxAge: GALLERY_VIEW_COOKIE_TTL_SECONDS,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
