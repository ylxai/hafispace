import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_MAX_SELECTION, GALLERY_VIEW_COOKIE_TTL_SECONDS } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: token },
    include: {
      photos: {
        orderBy: { urutan: "asc" },
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
      },
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
      photos: gallery.photos,
      selectionCount,
      selections: selections.map((s) => s.fileId),
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
