# Next.js Codebase Performance Analysis

Based on a thorough review of the repository, here are the identified performance issues and optimization strategies.

## 1. Critical Performance Bottlenecks

*   **Next.js Image Unoptimized Usage:** Several critical client-facing components (`src/components/gallery/lightbox.tsx`, `src/app/gallery/[token]/page.tsx`, `src/app/gallery/[token]/select/page.tsx`) explicitly bypass Next.js image optimization by passing the `unoptimized` prop. While Cloudinary urls are whitelisted in `next.config.ts`, forcing `unoptimized` causes the client bundle to load original resolution assets, severely impacting LCP (Largest Contentful Paint) and memory on mobile.
*   **Unnecessary Re-renders via Recharts:** The custom tooltip in `src/components/admin/dashboard/revenue-chart.tsx` was typed with `any` (`{ active, payload, label }: any`). This causes React to fail to properly memoize the props. This causes the tooltip, and consequently the chart to unnecessarily re-render on hover.

## 2. Medium Issues

*   **Client-Side Overfetching in Dashboard:** `src/components/admin/dashboard/dashboard-content.tsx` is a Client Component (`"use client"`) that fetches all dashboard data at once using React Query (`/api/admin/metrics`). This forces the client to download extra JavaScript (React Query) and wait for the hydration cycle before initiating the data request, leading to poor initial load times (TTFB + LCP).
*   **Missing Server Actions:** For administrative mutations (e.g., adding a package, creating a booking), the application heavily relies on API Routes and Client Components calling `fetch`. This could be simplified and made more performant by using React Server Actions to handle mutations server-side.
*   **Excessive `"use client"` Directives:** Several UI components that do not manage state or utilize React hooks are marked with `"use client"`. This prevents them from being rendered as Server Components, increasing the size of the JavaScript bundle shipped to the browser. Examples include `src/components/admin/status-badge.tsx` (if it has it, or similar stateless UI pieces) and layout wrappers.

## 3. Optimization Suggestions

*   **Implement Cloudinary Loader:** Instead of bypassing Next.js Image optimization with `unoptimized` (or relying solely on the default loader which might incur Vercel optimization costs), configure a custom loader in `next.config.ts` or use the existing `src/lib/image-loader.ts` for all Cloudinary assets to perform transformations at the edge.
*   **Shift Dashboard Fetching to Server Components:** Move the data fetching logic for the Admin Dashboard to the Server Component (`src/app/admin/page.tsx`) and pass the resulting data as props to the client components. This ensures the data is ready upon the first HTML response.
*   **Strict Typing for Recharts:** Always use the generic `TooltipProps<ValueType, NameType>` provided by Recharts for custom components to guarantee proper React reconciliation and type safety.
*   **Audit `"use client"` boundaries:** Push the `"use client"` directive down the tree as far as possible. Only interactive leaves (buttons, forms, charts) should be client components; their wrappers and layouts should remain server components.

## 4. Example Fixes

### A. Fixing Unnecessary Re-renders (Recharts Tooltip)
I have applied this fix to the codebase in `src/components/admin/dashboard/revenue-chart.tsx`. We replaced `any` with the proper generic type:

```tsx
import type { TooltipProps } from "recharts";

// Before: function CustomTooltip({ active, payload, label }: any) {
// After:
function CustomTooltip({ active, payload, label }: TooltipProps<number, string> & { payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  // ...
}
```

### B. Moving Data Fetching to Server Components (Dashboard)
To fix the client-side overfetching, you should refactor `src/app/admin/page.tsx` and `dashboard-content.tsx`:

**`src/app/admin/page.tsx` (Server Component):**
```tsx
import { getCachedVendorMetrics } from "@/lib/services/metrics.service";
import { DashboardContent } from "@/components/admin/dashboard/dashboard-content";

export default async function AdminHomePage() {
  const session = await auth();
  const metricsData = await getCachedVendorMetrics(session.user.id);

  return (
    <section>
      {/* Pass pre-fetched data directly to the client component */}
      <DashboardContent initialData={metricsData} />
    </section>
  );
}
```

**`src/components/admin/dashboard/dashboard-content.tsx` (Client Component):**
```tsx
"use client";

// Remove useQuery and fetch inside the component. Just use the props.
export function DashboardContent({ initialData }: { initialData: MetricsData }) {
  return (
    <div className="space-y-5">
      <MetricsCards overview={initialData.overview} />
      {/* ... other components */}
    </div>
  );
}
```

### C. Leveraging Cloudinary Image Optimization
Instead of `<Image ... unoptimized />`, use the built-in loader if configured, or remove the flag to let Next.js handle it (ensuring the domains are in `next.config.ts`).

```tsx
// src/components/gallery/lightbox.tsx
<Image
  src={photo.url} // Ensure this is a raw URL, not a pre-transformed one if Next.js is optimizing
  alt="Gallery Image"
  fill
  className="object-contain"
  sizes="100vw"
  priority={i === currentIndex}
  // Removed: unoptimized
/>
```
*Note: If you remove `unoptimized`, make sure that your Cloudinary domains (e.g., `res.cloudinary.com`) are correctly whitelisted in `next.config.ts` under `images.remotePatterns`.*
