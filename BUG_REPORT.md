# Bug Analysis Report

This report outlines bugs and potential issues identified in the codebase, categorized by their nature.

## 1. Confirmed Bugs

### A. Memory Leaks (URL.createObjectURL)
- **Location:**
  - `src/components/admin/image-editor.tsx`
  - `src/app/admin/events/_components/payment-modal.tsx`
  - `src/components/admin/drag-drop-upload.tsx`
- **Issue:** `URL.createObjectURL(file)` is used to generate preview URLs for uploaded files. However, `URL.revokeObjectURL()` is not consistently called when the component unmounts or when the URL is no longer needed (e.g., in `payment-modal.tsx` and `image-editor.tsx`).
- **Impact:** Memory leaks. The browser retains the file in memory until the document is unloaded, potentially causing performance degradation or crashing on mobile devices.

### B. React Hook Misuse / Unstable Context Value
- **Location:** `src/components/ui/toast.tsx`
- **Issue:** The `ToastProvider` passes an inline object as its value (`value={{ showToast, success, error, info, warning, dismiss }}`).
- **Impact:** Every time `ToastProvider` re-renders (e.g., when a toast is added or removed), a new context object is created. Any component consuming `useToast()` will unnecessarily re-render. If a toast function is used in a `useEffect` dependency array (as seen in multiple admin pages), it could trigger an infinite render loop.

### C. SSR vs Client Mismatch (Hydration Issue)
- **Location:** `src/app/admin/galleries/_components/edit-gallery-modal.tsx`
- **Issue:** `galleryUrl` is initialized with `typeof window !== "undefined" ? window.location.origin : ""`.
- **Impact:** During SSR, this evaluates to an empty string. On the client, it evaluates to the actual origin. This mismatch triggers a React hydration error, causing the client to discard the server-rendered DOM and re-render from scratch, which is bad for performance and user experience.

### D. Serverless Environment Constraints (`setInterval`)
- **Location:**
  - `src/app/api/public/gallery/[token]/route.ts`
  - `src/lib/rate-limit.ts`
- **Issue:** `setInterval` is used to clean up in-memory caches.
- **Impact:** While guarded against Vercel's `EdgeRuntime`, running background intervals in standard Node.js serverless functions (e.g., Vercel Node Serverless, AWS Lambda) is an anti-pattern. The interval may keep the process alive longer than intended, potentially leading to billing issues, exhaustion of connection pools, or the interval not running reliably.

## 2. Potential Bugs & Edge Cases

### A. Weak Random Number Generation (Math.random)
- **Location:**
  - `src/app/api/ably-token/route.ts`
  - `src/lib/cloudinary-upload.ts`
  - `src/components/ui/toast.tsx`
- **Issue:** `Math.random().toString(36)` is used to generate IDs, including client IDs for Ably authentication.
- **Impact:** `Math.random()` is not cryptographically secure. While acceptable for UI elements (like toast IDs), it poses a security risk when used for authentication tokens or unpredictable IDs (like Ably client IDs or Cloudinary public IDs).

### B. Race Conditions in State Updates
- **Location:** `src/components/admin/selections-modal.tsx` (and potentially others)
- **Issue:** State updates relying on previous state (like toggling a selection in a `Set`) read directly from the current state variable rather than using the functional updater (`setState(prev => ...)`).
- **Impact:** If a user clicks rapidly, React's state batching might cause race conditions where only the final click is registered correctly.

### C. Unhandled Promise Rejections (Fire-and-Forget)
- **Location:** `src/app/api/public/booking/route.ts`
- **Issue:** `sendBookingConfirmationEmail` is called without `await` and uses a `.catch(console.error)` pattern.
- **Impact:** In a serverless environment, the function execution finishes as soon as a response is returned. The background promise may be forcefully terminated before the email is sent, resulting in lost emails.

## 3. Suggested Fixes

1. **Memory Leaks:**
   - Implement `useEffect` cleanup functions that call `URL.revokeObjectURL()` for any generated object URLs.
2. **Context Stability:**
   - Wrap the context value in `src/components/ui/toast.tsx` with `useMemo` to ensure reference equality across renders unless dependencies change.
3. **Hydration Mismatches:**
   - Use a `useEffect` hook to set the `window.location.origin` value after the initial client render, or rely on a deterministic environment variable (e.g., `process.env.NEXT_PUBLIC_APP_URL`).
4. **Serverless Intervals:**
   - Replace `setInterval` with lazy cleanup strategies. Expired cache entries should be removed when the cache is accessed (e.g., during the next request).
5. **Secure Randomness:**
   - Replace `Math.random()` with `randomBytes(4).toString('hex')` (from `node:crypto`) for generating secure, unpredictable IDs on the server side.
6. **State Updates:**
   - Update `Set` modifications to use the functional state updater pattern: `setSelectedSelectionIds((prev) => { const newSet = new Set(prev); ... return newSet; })`.
7. **Async Execution:**
   - Use `await` for critical background tasks like sending emails, or utilize Next.js's `waitUntil()` if supported by the deployment platform to ensure background execution completes.