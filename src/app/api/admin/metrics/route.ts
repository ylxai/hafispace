import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth/options";
import { unauthorizedResponse } from "@/lib/api/response";
import { fetchVendorMetrics } from "@/lib/services/metrics.service";

// Cache TTL 5 menit — cukup fresh untuk dashboard tanpa hammer DB
const METRICS_CACHE_TTL_SECONDS = 300;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const vendorId = session.user.id;

  // Cached per vendorId — revalidate setiap 5 menit
  const getCachedMetrics = unstable_cache(
    () => fetchVendorMetrics(vendorId),
    [`metrics-${vendorId}`],
    { revalidate: METRICS_CACHE_TTL_SECONDS, tags: [`metrics-${vendorId}`] }
  );

  const data = await getCachedMetrics();
  return NextResponse.json(data);
}
