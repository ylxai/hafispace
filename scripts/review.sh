#!/bin/bash
# ============================================================
# Hafiportrait Platform - Local Code Review Script
# ============================================================
# Run before creating a PR to catch issues early.
# Usage: bash scripts/review.sh
#
# Checks:
#   1. ESLint (0 errors, 0 warnings)
#   2. TypeScript (0 type errors)
#   3. Unit tests (all passed)
#   4. Custom pattern checks (upload, auth, accessibility)
# ============================================================

set -e  # Exit on first failure

PASS=0
FAIL=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Hafiportrait Platform Code Review    ${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Helper functions
pass() { echo -e "${GREEN}  ✅ $1${NC}"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}  ❌ $1${NC}"; FAIL=$((FAIL+1)); }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; WARNINGS=$((WARNINGS+1)); }
section() { echo -e "\n${BLUE}── $1 ──${NC}"; }

# ─── 1. ESLint ───────────────────────────────────────────────
section "ESLint Check"
if npm run lint -- --max-warnings=0 > /dev/null 2>&1; then
  pass "ESLint: 0 errors, 0 warnings"
else
  fail "ESLint: errors or warnings found"
  echo "  Run: npm run lint -- --fix"
fi

# ─── 2. TypeScript ───────────────────────────────────────────
section "TypeScript Check"
if npx tsc --noEmit > /dev/null 2>&1; then
  pass "TypeScript: 0 type errors"
else
  fail "TypeScript: type errors found"
  echo "  Run: npm run typecheck"
fi

# ─── 3. Unit Tests ───────────────────────────────────────────
section "Unit Tests"
if npm run test:run -- --exclude=".adal/**" > /dev/null 2>&1; then
  pass "Tests: all passed"
else
  fail "Tests: some tests failed"
  echo "  Run: npm test"
fi

# ─── 4. Custom Pattern Checks ────────────────────────────────
section "Custom Pattern Checks"

# 4a. No console.* in server-side code (API routes, lib)
CONSOLE_COUNT=$(grep -r "console\." src/app/api src/lib --include="*.ts" 2>/dev/null | grep -v "// " | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -eq "0" ]; then
  pass "No console.* in server-side code"
else
  fail "Found $CONSOLE_COUNT console.* calls in server-side code (use logger instead)"
fi

# 4b. No 'any' type in TypeScript files
ANY_COUNT=$(grep -r ": any\b\|as any\b\|<any>" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// " | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -eq "0" ]; then
  pass "No 'any' types found"
else
  fail "Found $ANY_COUNT 'any' type usage (use proper types)"
fi

# 4c. No crypto.randomUUID() in upload code (use createFileId)
UUID_COUNT=$(grep -r "crypto\.randomUUID()" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// " | grep -v "upload-types\|middleware" | wc -l | tr -d ' ')
if [ "$UUID_COUNT" -eq "0" ]; then
  pass "Upload IDs use createFileId() (not randomUUID directly)"
else
  warn "Found $UUID_COUNT crypto.randomUUID() calls outside upload-types/middleware (consider createFileId())"
fi

# 4d. No file.name used as identifier in upload hooks
FILENAME_ID=$(grep -r "file\.name.*id\|id.*file\.name\|fs\.file\.name" src/hooks src/components/admin --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// " | wc -l | tr -d ' ')
if [ "$FILENAME_ID" -eq "0" ]; then
  pass "No filename used as upload ID"
else
  fail "Found $FILENAME_ID filename-as-ID patterns (use FileUploadId)"
fi

# 4e. No nested <button> in <button>
NESTED_BTN=$(grep -r "<button" src --include="*.tsx" -l 2>/dev/null | xargs grep -l "role=\"button\"" 2>/dev/null | wc -l | tr -d ' ')
if [ "$NESTED_BTN" -eq "0" ]; then
  pass "No potential nested interactive elements"
else
  warn "$NESTED_BTN file(s) have both <button> and role='button' - verify no nesting"
fi

# 4f. Check auth pattern consistency (no getServerSession in admin routes)
GET_SESSION=$(grep -r "getServerSession" src/app/api/admin --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$GET_SESSION" -eq "0" ]; then
  pass "Auth pattern consistent (all use auth() helper)"
else
  fail "Found $GET_SESSION getServerSession() in admin routes (use auth() helper)"
fi

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "  Results: ${GREEN}$PASS passed${NC} | ${RED}$FAIL failed${NC} | ${YELLOW}$WARNINGS warnings${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

if [ "$FAIL" -gt "0" ]; then
  echo -e "${RED}❌ Review FAILED - fix issues before creating PR${NC}"
  exit 1
elif [ "$WARNINGS" -gt "0" ]; then
  echo -e "${YELLOW}⚠️  Review PASSED with warnings - consider fixing before PR${NC}"
  exit 0
else
  echo -e "${GREEN}🎉 Review PASSED - ready to push!${NC}"
  exit 0
fi
