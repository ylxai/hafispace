import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_MAX_SELECTION, GALLERY_VIEW_COOKIE_TTL_SECONDS } from "@/lib/constants";

const PHOTOS_PER_PAGE = 50;

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

  // Ambil photos dengan pagination
  const photos = await prisma.photo.findMany({
    where: { galleryId: gallery.id },
    orderBy: { urutan: "asc" },
    take: limit + 1, // ambil 1 extra untuk detect apakah ada halaman berikutnya
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      storageKey: true,
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

  // Increment view count hanya sekali per session (cek cookie)
  const viewedCookieKey = `viewed_${gallery.id}`;
  const alreadyViewed = _request.headers.get("cookie")?.includes(viewedCookieKey);

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
