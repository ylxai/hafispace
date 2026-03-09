# Frontend Code Quality Audit Report

**Date:** Generated from comprehensive review of 10 frontend files  
**Files Audited:** 927 lines (events), 400 lines (galleries), 367 lines (clients), 251 lines (dashboard), plus modals and components

---

## 1. MISSING 'use client' DIRECTIVE

### ✅ PASS
All interactive components correctly have `"use client"` directive:
- `src/app/admin/events/page.tsx` (line 0)
- `src/app/admin/galleries/page.tsx` (line 0)
- `src/app/admin/clients/page.tsx` (line 0)
- `src/app/admin/events/_components/create-booking-modal.tsx` (line 0)
- `src/app/admin/events/_components/payment-modal.tsx` (line 0)
- `src/app/admin/galleries/_components/edit-gallery-modal.tsx` (line 0)
- `src/components/admin/navigation.tsx` (line 0)

### ⚠️ ISSUE
- **`src/components/admin/dashboard/dashboard-content.tsx`** (line 0)
  - Missing `"use client"` directive
  - File uses `async function getDashboardData()` which is correct for server component
  - **HOWEVER:** This is a **Server Component** and should NOT have `"use client"`
  - **Status:** ✅ CORRECT as-is (server component pattern is appropriate)

---

## 2. COMPONENT SIZE VIOLATIONS (>300 lines)

### 🔴 CRITICAL
1. **`src/app/admin/events/page.tsx`** - **927 lines**
   - Contains: AdminEventsContent (lines 32-918) = ~886 lines in single component
   - **Issues:**
     - Bulk selection logic (lines 114-133, 135-167, 169-221)
     - Filter/search logic (lines 55-84)
     - State management: 13 useState hooks (lines 37-51)
     - Desktop table rendering (lines 525-726)
     - Mobile card list rendering (lines 729-915)
   - **Recommendation:** Split into:
     - `EventsTable.tsx` (table with header/pagination)
     - `EventsCardList.tsx` (mobile view)
     - `EventsFilterBar.tsx` (filters)
     - `EventsBulkActionsBar.tsx` (bulk operations)
     - `useEventsBulkActions.ts` (custom hook)

2. **`src/app/admin/galleries/_components/edit-gallery-modal.tsx`** - **499 lines**
   - Contains: EditGalleryModal (lines 26-497) = ~471 lines
   - **Issues:**
     - Token management logic (lines 42-125)
     - Ably realtime setup (lines 128-172)
     - VIESUS integration (lines 174-201)
     - Status save logic (lines 208-240)
     - Gallery delete logic (lines 242-274)
     - Multiple modal state switches (lines 276-282)
   - **Recommendation:** Split into:
     - `TokenManagementSection.tsx`
     - `ViesusPreviewSection.tsx`
     - `GalleryStatusManager.tsx`
     - `useGalleryToken.ts` (custom hook)

3. **`src/app/admin/events/_components/payment-modal.tsx`** - **439 lines**
   - Contains: PaymentModal (lines 48-438) = ~390 lines
   - **Issues:**
     - File upload logic (lines 68-106)
     - Field validation (lines 108-124)
     - Payment summary section (lines 213-231)
     - Payment history section (lines 233-300)
     - Payment form section (lines 302-433)
   - **Recommendation:** Split into:
     - `PaymentSummary.tsx`
     - `PaymentHistory.tsx`
     - `PaymentFormSection.tsx`
     - `usePaymentForm.ts` (custom hook)

---

## 3. MISSING/INCONSISTENT TYPESCRIPT TYPES

### 🟡 WARNINGS

1. **`src/app/admin/galleries/page.tsx`** (line 12-22)
   - Type `AdminGallery` is duplicated:
     - Defined locally (lines 12-22)
     - Also exported from `edit-gallery-modal.tsx` (line 10-21)
   - **Fix:** Create `src/types/gallery.ts` with shared type

2. **`src/app/admin/events/_components/create-booking-modal.tsx`** (line 7-13)
   - `PackageOption` interface only partially typed
   - Missing `createdAt`, `updatedAt`, `kategori` optional fields
   - Line 32: `useQuery<{ packages: PackageOption[] }>` assumes shape without validation

3. **`src/app/admin/clients/page.tsx`** (line 10-18)
   - `AdminClient` type defined locally but could be reused
   - Missing optional contact fields should be explicit: `email?: string | null`

4. **`src/app/admin/events/_components/payment-modal.tsx`** (line 8)
   - `type PaymentType = "DP" | "PELUNASAN" | "LAINNYA"` should use const assertion:
   ```ts
   const PAYMENT_TYPES = ["DP", "PELUNASAN", "LAINNYA"] as const;
   type PaymentType = typeof PAYMENT_TYPES[number];
   ```

5. **`src/components/admin/dashboard/dashboard-content.tsx`** (line 9-207)
   - Return type of `getDashboardData()` is implicit (inferred)
   - **Recommendation:** Add explicit return type annotation
   ```ts
   async function getDashboardData(vendorId: string): Promise<{
     overview: {...};
     topPackages: {...}[];
     // ... etc
   }>
   ```

---

## 4. HARDCODED STRINGS (SHOULD BE CONSTANTS)

### 🟡 HIGH PRIORITY

**`src/app/admin/events/page.tsx`**
- Line 24-28: DP_STATUS_MAP hardcoded (should be in `src/lib/constants.ts`)
- Line 312: Hardcoded URL `/api/admin/bookings/export`
- Line 364: Hardcoded placeholder "Nama, kode, HP..."
- Line 436-440: Status filter options (duplicate of booking schema)
- Line 589-592: "No bookings yet" message
- Line 788-790: Mobile "No bookings yet" message (duplicated)

**`src/app/admin/galleries/page.tsx`**
- Line 274-276: "Belum ada gallery" message (Indonesian hardcoded)
- Line 288: "Gallery dibuat otomatis dari booking"

**`src/app/admin/clients/page.tsx`**
- Line 261-263: "Belum ada klien" message
- Line 273: "Buat Booking Baru"

**`src/app/admin/events/_components/create-booking-modal.tsx`**
- Line 154: "Create New Booking" (English, inconsistent with Indonesian UI)
- Line 289: "-- Pilih Paket --" (mixed language)
- Line 308: "Atau Nama Paket Custom"

**`src/app/admin/events/_components/payment-modal.tsx`**
- Line 204: "Riwayat Pembayaran"
- Line 217-228: Status labels ("Total Tagihan", "Terbayar", "Sisa Tagihan")
- Line 241: "Belum ada pembayaran dicatat"

**Recommendation:** Create `src/lib/constants/messages.ts`:
```ts
export const MESSAGES = {
  BOOKINGS_EMPTY: "No bookings yet",
  GALLERIES_EMPTY: "Belum ada gallery",
  // ... etc
};
```

---

## 5. PROP DRILLING / MISSING CONTEXT

### 🟡 MODERATE ISSUES

1. **`src/app/admin/events/page.tsx`** (lines 32-918)
   - `toast` hook instantiated at component level (line 52)
   - Passed implicitly through closure to nested handlers
   - **Better approach:** Use context provider or create toast utility module
   - Bulk action state (selectedBookingIds, showBulkActions) could use custom hook

2. **`src/app/admin/galleries/_components/edit-gallery-modal.tsx`** (line 26)
   - Props: `{ gallery, onClose }`
   - Receives full `AdminGallery` object but only uses specific fields
   - **Recommendation:** Be explicit about what data is needed
   ```ts
   export function EditGalleryModal({ 
     galleryId: string, 
     onClose: () => void 
   }) {
     // fetch full gallery inside component
   }
   ```

3. **`src/components/admin/navigation.tsx`** (line 5)
   - Uses `usePathname()` from next/navigation
   - Component is already client-side, no issues
   - **Status:** ✅ GOOD

---

## 6. MISSING ERROR BOUNDARIES

### 🔴 CRITICAL

No Error Boundary components detected in:
- `src/app/admin/events/page.tsx` - Wraps with Suspense (line 920-926) ✅ but no ErrorBoundary
- `src/app/admin/galleries/page.tsx` - Only shows error state conditionally (line 219-223)
- `src/app/admin/clients/page.tsx` - Only shows error state conditionally (line 225-229)

**Recommendation:**
1. Create `src/components/error-boundary.tsx`:
```tsx
'use client';
import { ReactNode } from 'react';

export class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState message="Something went wrong" />;
    }
    return this.props.children;
  }
}
```

2. Wrap pages:
```tsx
<ErrorBoundary>
  <Suspense fallback={<LoadingUI />}>
    <AdminEventsContent />
  </Suspense>
</ErrorBoundary>
```

---

## 7. INCONSISTENT NAMING CONVENTIONS

### 🟡 WARNINGS

1. **File naming:**
   - `src/components/admin/navigation.tsx` ✅ kebab-case
   - `src/components/admin/dashboard/dashboard-content.tsx` ✅ kebab-case
   - ALL files follow convention correctly

2. **Variable/Function naming:**
   - ✅ camelCase used consistently throughout
   - Example: `handleSelectBooking`, `formatRupiah`, `validateField`

3. **Component naming:**
   - ✅ PascalCase used consistently
   - Example: `EditGalleryModal`, `CreateBookingModal`, `AdminNavigation`

4. **Type naming:**
   - ⚠️ Inconsistent capitalization for type exports:
     - `type AdminGallery` (lines 12-22 in galleries/page.tsx)
     - `type AdminClient` (lines 10-18 in clients/page.tsx)
     - `interface PackageOption` (lines 7-13 in create-booking-modal.tsx)
   - **Fix:** Use consistent `type` (prefer) over `interface` for data structures

**Status:** ✅ MOSTLY GOOD, minor standardization needed

---

## 8. DUPLICATE UI LOGIC ACROSS COMPONENTS

### 🔴 HIGH PRIORITY

1. **Bulk Actions Bar** (repeated in 3 files)
   - `src/app/admin/events/page.tsx` (lines 234-293)
   - `src/app/admin/galleries/page.tsx` (lines 154-201)
   - `src/app/admin/clients/page.tsx` (lines 178-207)
   - **Duplication:** Select count, cancel button, action buttons, styling
   - **Fix:** Create `src/components/bulk-actions-bar.tsx`

2. **Modal Header Pattern** (repeated in 2 modals)
   - `src/app/admin/events/_components/create-booking-modal.tsx` (lines 147-163)
   - `src/app/admin/events/_components/payment-modal.tsx` (lines 196-210)
   - **Duplication:** Handle bar, header, close button
   - **Fix:** Create `src/components/modal-header.tsx`

3. **Empty State UI** (repeated 4+ times)
   - `src/app/admin/events/page.tsx` (lines 568-595, 771-792)
   - `src/app/admin/galleries/page.tsx` (lines 266-291)
   - `src/app/admin/clients/page.tsx` (lines 254-277)
   - **Duplication:** Icon, heading, description, CTA button
   - **Fix:** Create `src/components/empty-state.tsx` with configurable props

4. **Select/Checkbox Logic** (repeated 3 times)
   - `src/app/admin/events/page.tsx` (lines 114-133)
   - `src/app/admin/galleries/page.tsx` (lines 48-67)
   - `src/app/admin/clients/page.tsx` (lines 106-125)
   - **Duplication:** Select single, select all, tracking with Set
   - **Fix:** Create `src/hooks/use-selection.ts`

5. **Status Badge Display** (reused ✅)
   - Uses `<StatusBadge />` component consistently (good)
   - Line 6 in events/page.tsx: `import { StatusBadge }`

---

## 9. MISSING LOADING/ERROR STATES

### 🟡 MODERATE

1. **`src/app/admin/events/_components/create-booking-modal.tsx`**
   - ✅ Shows "Creating..." button state (line 381)
   - ✅ Error display (lines 166-169)
   - ✅ Validation errors per field
   - **Status:** GOOD

2. **`src/app/admin/events/_components/payment-modal.tsx`**
   - ✅ Shows "Menyimpan..." state (line 430)
   - ✅ Shows "Mengupload..." overlay (line 381)
   - ✅ Error display per field
   - **Status:** GOOD

3. **`src/app/admin/events/page.tsx`**
   - ✅ Skeleton loading for table (line 566)
   - ✅ Mobile skeleton (lines 730-770)
   - ✅ Error boundary (lines 495-499)
   - **Status:** GOOD
   - **Missing:** No loading state for bulk operations (just disabled button)
     - Line 277: `disabled={!bulkActionStatus || isBulkProcessing}`
     - Should show spinner or "Memproses..." text

4. **`src/app/admin/galleries/_components/edit-gallery-modal.tsx`**
   - ✅ Loading state for token operations (line 364)
   - ⚠️ **Missing:** No skeleton/loader for initial gallery data fetch
   - ⚠️ **Missing:** Error state display for API failures (line 32: just sets error)

5. **`src/components/admin/dashboard/dashboard-content.tsx`**
   - ✅ Error state for session failure (lines 212-218)
   - ✅ Error state for data fetch failure (lines 224-230)
   - **Status:** GOOD

---

## 10. STATE MANAGEMENT PATTERNS - INCONSISTENCIES

### 🟡 ISSUES

1. **Form State Patterns:**
   - `create-booking-modal.tsx`: Uses `useState` for form object + individual error state
     ```ts
     const [formData, setFormData] = useState({...}); // line 22
     const [errors, setErrors] = useState<Record<string, string>>({}); // line 18
     ```
   - `payment-modal.tsx`: Similar pattern (lines 51-52)
   - **Recommendation:** Create reusable `useFormState` hook:
     ```ts
     const [form, errors, setField, setError, clearErrors] = useFormState({...});
     ```

2. **Selection State:**
   - Using `Set<string>` for selected IDs in 3 components
   - No shared hook across components
   - **Recommendation:** Extract to `src/hooks/use-selection.ts`

3. **Modal State Management:**
   - Multiple `useState` for modal visibility:
     - `showUploadModal` (line 33)
     - `showSelections` (line 34)
     - `showViesus` (line 35)
   - Should use reducer or compound pattern for cleaner logic

4. **Query Invalidation:**
   - Inconsistent invalidation patterns:
     - Line 161: `queryClient.invalidateQueries({ queryKey: ["admin-bookings"] })`
     - Line 71: `queryClient.invalidateQueries({ queryKey: ["admin-galleries"] })`
   - **Better:** Create typed query keys constant

---

## 11. ADDITIONAL CODE QUALITY ISSUES

### 🔴 CRITICAL

1. **Image Elements Without Alt Text**
   - `src/app/admin/events/_components/payment-modal.tsx` (line 274)
     ```tsx
     <img src={p.buktiBayar} alt="Bukti transfer" /> // ✅ HAS alt
     ```
   - `src/app/admin/events/_components/payment-modal.tsx` (line 374)
     ```tsx
     <img src={previewUrl} alt="Preview bukti" /> // ✅ HAS alt
     ```
   - **Status:** ✅ Good - all images have alt text

2. **NextJS Image Component**
   - Using `<img>` tags instead of `<Image>` from next/image
   - Lines 274, 374 in payment-modal.tsx use native `<img>`
   - **Recommendation:** Migrate to `next/image` for optimization:
     ```tsx
     import Image from 'next/image';
     <Image src={p.buktiBayar} alt="..." width={400} height={300} />
     ```

3. **CSS Class String Concatenation**
   - Line 25-29 in `src/components/admin/navigation.tsx` uses template literal with ternary
   - **Better:** Use `clsx` or `cn` utility
     ```tsx
     className={cn(
       "rounded-full border px-4 py-2 transition",
       isActive ? "border-slate-900 bg-slate-900 text-white" : "..."
     )}
     ```

4. **Unused Imports/Variables**
   - `src/app/admin/events/page.tsx` (line 2): `useMemo` imported
     - Actually used (lines 55, 94, 112) ✅
   - No obvious unused imports detected ✅

5. **Magic Numbers**
   - `src/app/admin/events/page.tsx` line 20, 35: `20` (items per page)
   - `src/app/admin/galleries/page.tsx` line 31: `20` (items per page)
   - **Fix:** Extract to constant
     ```ts
     const PAGE_SIZE = 20;
     ```

6. **Unnecessary API Calls**
   - `src/app/admin/events/_components/create-booking-modal.tsx` (line 32-39)
     ```ts
     const { data: packagesData } = useQuery<{ packages: PackageOption[] }>({
       queryKey: ['admin-packages'],
       queryFn: async () => { ... },
       staleTime: 60_000,
     });
     ```
   - Every time modal opens, queries packages (good caching with 60s staleTime)
   - **Status:** ✅ OK

---

## SUMMARY TABLE

| Category | Status | Count | Severity |
|----------|--------|-------|----------|
| Missing 'use client' | ✅ Pass | 0 | - |
| Components >300 lines | 🔴 Critical | 3 files | HIGH |
| Missing TypeScript types | 🟡 Warning | 5 issues | MEDIUM |
| Hardcoded strings | 🟡 High | 15+ strings | MEDIUM |
| Prop drilling | 🟡 Moderate | 2 cases | LOW |
| Missing error boundaries | 🔴 Critical | All pages | HIGH |
| Naming convention | ✅ Good | 0 issues | - |
| Duplicate UI logic | 🔴 High | 5 patterns | HIGH |
| Missing loading states | 🟡 Minor | 1-2 issues | LOW |
| State management | 🟡 Inconsistent | 3 patterns | MEDIUM |
| Next.js best practices | 🟡 Minor | 5 issues | LOW |

---

## PRIORITY RECOMMENDATIONS

### Tier 1 (Do First)
1. Extract 3 oversized components into smaller pieces
2. Create Error Boundary component and wrap pages
3. Extract duplicate bulk-actions-bar, modal-header, empty-state UI
4. Create shared selection hook
5. Create constants file for hardcoded messages

### Tier 2 (Do Next)
1. Create shared type definitions file
2. Add explicit return type annotations
3. Migrate `<img>` to `<Image>` from next/image
4. Implement typed query keys
5. Extract form state logic to custom hook

### Tier 3 (Nice to Have)
1. Use `clsx`/`cn` for className management
2. Extract magic numbers to constants
3. Add comprehensive error logging
4. Create storybook stories for reusable components
