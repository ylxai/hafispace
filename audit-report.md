# Hafiportrait Platform - Security & Architecture Audit Report

## 1. Critical Issues

### Insecure Random Token Generation
- **File:** `src/app/api/ably-token/route.ts`, `src/lib/cloudinary-upload.ts`, `src/components/ui/toast.tsx`, `src/components/admin/drag-drop-upload.tsx`
- **Problem:** The codebase uses `Math.random().toString(36)` to generate unique identifiers, including client IDs for Ably and public IDs for Cloudinary.
- **Why it matters:** `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG). Its output is predictable, which could allow an attacker to guess tokens, hijack Ably sessions, or overwrite/access specific Cloudinary assets.
- **Example fix:** Use `node:crypto` or `crypto.randomUUID()` for secure token generation.
```typescript
// Instead of:
// clientId = `client-${gallery.id}-${Math.random().toString(36).slice(2, 8)}`;

// Use:
import { randomBytes } from 'node:crypto';
clientId = `client-${gallery.id}-${randomBytes(4).toString('hex')}`;

// Or for Web Crypto API (Edge Runtime):
clientId = `client-${gallery.id}-${crypto.randomUUID().split('-')[0]}`;
```

## 2. High Risk Issues

### Missing Server-Side MIME Validation
- **File:** `src/app/api/admin/galleries/[id]/route.ts`
- **Problem:** The file upload endpoint `POST /api/admin/galleries/[id]` does not adequately validate the content of the uploaded files, relying only on checking if it's `multipart/form-data` and directly uploading the buffer to Cloudinary.
- **Why it matters:** An attacker could upload malicious files (e.g., HTML with XSS payloads or executable scripts) that might be served to other users if Cloudinary is not configured to strictly sanitize or force image transformations. While `src/app/api/admin/galleries/[id]/upload/route.ts` implements a good magic bytes check (`verifyImageMagicBytes`), the standard route `src/app/api/admin/galleries/[id]/route.ts` bypasses this.
- **Example fix:** Implement the same magic bytes validation in all upload routes, or consolidate the upload logic into a single, secure service function.

## 3. Medium Issues

### Potential Memory Leaks from Global setInterval
- **File:** `src/app/api/public/gallery/[token]/route.ts`, `src/lib/rate-limit.ts`
- **Problem:** Both files use `setInterval` at the module level to clean up in-memory caches (view count deduplication and rate limits).
- **Why it matters:** In a serverless environment (like Vercel functions where Next.js is typically deployed), module-level `setInterval` can cause the function execution to hang or cause unexpected memory growth across multiple warm instances. In Node.js environments, relying on memory for rate limits and deduplication without bounded limits can lead to Out of Memory (OOM) errors if under a sustained DoS attack.
- **Example fix:** For serverless, it's better to clean up probabilistically during requests or use a real distributed cache like Redis (Upstash) which handles TTL natively.
```typescript
// Alternative cleanup on request (Probabilistic)
if (Math.random() < 0.05) {
  // 5% chance to run cleanup during a request
  cleanupViewCache();
}
```

### Next.js 15 Async Params Warning
- **File:** `src/app/api/public/gallery/[token]/route.ts` and others
- **Problem:** While the codebase is correctly typing `params` as a Promise (`{ params }: { params: Promise<{ token: string }> }`) and using `await params`, the Next.js 15 App Router requires that runtime params be treated asynchronously. This is handled correctly in most routes, but the reliance on edge runtime checks (`(globalThis as any).EdgeRuntime`) is fragile.
- **Why it matters:** Relying on undocumented global variables (`EdgeRuntime`) for platform detection can break in future Next.js updates, causing the background intervals to either run incorrectly or crash the application.
- **Example fix:** Use environment variables (e.g., `NEXT_RUNTIME === 'edge'`) instead of `globalThis.EdgeRuntime`.

## 4. Code Quality Improvements

### Missing TypeScript Generics in Recharts Tooltip
- **File:** `src/components/admin/dashboard/revenue-chart.tsx`
- **Problem:** `CustomTooltip` heavily relies on `eslint-disable-next-line @typescript-eslint/no-explicit-any` for the `active`, `payload`, and `label` properties.
- **Why it matters:** Using `any` overrides TypeScript's type-checking, which can lead to runtime errors if the underlying library updates its interfaces. It also violates strict type safety principles expected in Next.js 15 projects.
- **Example fix:** Use `TooltipProps` from Recharts.
```typescript
import { TooltipProps } from 'recharts';

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    // ... JSX
  );
}
```

### Potential Race Conditions in Ably Realtime Event Handlers
- **File:** `src/app/gallery/[token]/page.tsx`, `src/app/gallery/[token]/select/page.tsx`
- **Problem:** Inside `useEffect`, the Ably channel subscription logic relies on `setSelectionCount` or `refetch()` updates, but doesn't implement proper teardown or debounce handling logic consistently. In `select/page.tsx`, the `useEffect` cleans up nothing, causing multiple `ably.channels.get` subscriptions when the component re-renders.
- **Why it matters:** Multiple active subscriptions to the same channel can duplicate UI updates, increase connection usage limits unnecessarily, and leak memory on unmount.
- **Example fix:** Always disconnect or unsubscribe during the cleanup phase.
```typescript
useEffect(() => {
  // ... connection logic ...

  return () => {
    if (ably) {
      channel.unsubscribe();
      ably.close();
    }
  };
}, [data?.gallery?.id]);
```

## 5. Performance Improvements

### Unoptimized Image Configurations
- **File:** `src/components/gallery/lightbox.tsx`, `src/app/gallery/[token]/page.tsx`
- **Problem:** `next/image` is used heavily, but the implementation lacks proper `sizes` attributes for responsive loading. In some places, it forces `width` and `height` without adapting to the viewport dynamically.
- **Why it matters:** Missing `sizes` causes Next.js to serve full-sized images (or unnecessarily large 100vw source sets) to mobile devices. This impacts Core Web Vitals (LCP) and consumes excessive bandwidth.
- **Example fix:** Specify realistic sizes matching your CSS grid breakpoints.
```typescript
<Image
  src={photo.url}
  alt={photo.filename}
  fill
  className="object-cover"
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
/>
```

### Inefficient CSV Generation Method
- **File:** `src/app/api/admin/bookings/export/route.ts`
- **Problem:** The entire dataset is fetched into memory `const rows = bookings.map(...)`, mapped to strings, concatenated with `.join('\n')`, and sent as a single response string.
- **Why it matters:** For a large studio with thousands of bookings, loading all `bookings`, `payments`, and `paket` into memory simultaneously can exceed the Vercel edge/serverless function memory limit (e.g., 512MB-1GB), crashing the export process.
- **Example fix:** Implement streaming for the CSV using the Web Streams API and `Prisma`'s cursor-based pagination or streams (if supported).
```typescript
// Implement response stream using TextEncoderStream
const stream = new TransformStream();
const writer = stream.writable.getWriter();
// loop and write chunks
```

## 6. Suggested Refactoring

### Redundant Route Handler Logic for IDOR Prevention
- **File:** `src/app/api/admin/events/route.ts`, `src/app/api/admin/galleries/route.ts`, `src/app/api/admin/clients/route.ts`
- **Problem:** The pattern of querying a resource and appending `vendorId: session.user.id` to the `where` clause is repeated across all `DELETE` and `PUT` methods independently.
- **Why it matters:** Duplication makes the code harder to maintain and prone to simple oversight errors (e.g., if a new route is added and the `vendorId` check is forgotten).
- **Example fix:** Create a unified service layer or custom middleware functions that automatically validate resource ownership before passing control to the business logic handler.
```typescript
// Create a wrapper:
export const withVendorResource = async (model: any, resourceId: string, vendorId: string) => {
  const resource = await model.findFirst({ where: { id: resourceId, vendorId } });
  if (!resource) throw new Error("Unauthorized or Not Found");
  return resource;
};
```
