import { NextResponse } from "next/server";
import Ably from "ably";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { randomBytes } from "node:crypto";

export async function GET(request: Request) {
  // Get gallery token from query params (required for both admin and client)
  const { searchParams } = new URL(request.url);
  const galleryToken = searchParams.get("gallery");

  if (!galleryToken) {
    return NextResponse.json(
      { error: "Gallery token required" },
      { status: 400 }
    );
  }

  // Verify gallery exists
  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: galleryToken },
    select: { 
      vendorId: true, 
      id: true,
      status: true 
    },
  });

  if (!gallery) {
    return NextResponse.json(
      { error: "Gallery not found" },
      { status: 404 }
    );
  }

  // Check if gallery is published (not DRAFT)
  if (gallery.status === "DRAFT") {
    return NextResponse.json(
      { error: "Gallery is not published" },
      { status: 403 }
    );
  }

  // Try to get session for admin authentication
  const session = await auth();

  let clientId: string;

  if (session?.user?.id) {
    // Admin/vendor access - verify they own this gallery
    if (gallery.vendorId === session.user.id) {
      clientId = `admin-${session.user.id}-${gallery.id}`;
    } else {
      // Admin trying to access another vendor's gallery
      return NextResponse.json(
        { error: "Access denied - not authorized for this gallery" },
        { status: 403 }
      );
    }
  } else {
    // Client access (no admin session) - this is OK for public gallery access
    // The gallery token itself is the authorization
    // Gunakan randomBytes (CSPRNG) agar client ID tidak bisa ditebak
    clientId = `client-${gallery.id}-${randomBytes(4).toString("hex")}`;
  }

  // Create Ably token with the appropriate client ID
  const ablyKey = process.env.ABLY_API_KEY;
  if (!ablyKey) {
    return NextResponse.json({ error: "Ably not configured" }, { status: 503 });
  }
  const ably = new Ably.Rest({ key: ablyKey });
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId,
    // Restrict capabilities to only subscribe to the gallery channel
    capability: {
      [`gallery:${gallery.id}:selection`]: ["subscribe", "presence"]
    }
  });

  return NextResponse.json(tokenRequest);
}
