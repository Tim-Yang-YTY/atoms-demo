#!/usr/bin/env bash
# ============================================================
# validate.sh — Pre-commit / CI validation gate
# Run this before declaring any work complete
# Usage:
#   ./scripts/validate.sh          # Auto-fix mode
#   ./scripts/validate.sh --check  # CI mode (no modifications)
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECK_ONLY=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=true
fi

FAILED=0

step() {
  echo -e "\n${YELLOW}→ $1${NC}"
}

pass() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

fail() {
  echo -e "${RED}  ✗ $1${NC}"
  FAILED=1
}

# --- Step 1: TypeScript type checking ---
step "TypeScript type check"
if npx tsc --noEmit 2>/dev/null; then
  pass "No type errors"
else
  fail "Type errors found — run 'npx tsc --noEmit' to see details"
fi

# --- Step 2: ESLint ---
step "ESLint"
if $CHECK_ONLY; then
  if pnpm lint 2>/dev/null; then
    pass "No lint errors"
  else
    fail "Lint errors found — run 'pnpm lint' to see details"
  fi
else
  if pnpm lint --fix 2>/dev/null; then
    pass "Lint passed (auto-fixed if needed)"
  else
    fail "Lint errors remain after auto-fix"
  fi
fi

# --- Step 3: Build ---
step "Next.js build"
if pnpm build 2>/dev/null; then
  pass "Build successful"
else
  fail "Build failed — run 'pnpm build' to see details"
fi

# --- Step 4: Tests ---
step "Tests"
if [ -f "node_modules/.bin/jest" ] || grep -q '"test"' package.json 2>/dev/null; then
  if pnpm test --passWithNoTests 2>/dev/null; then
    pass "Tests passed"
  else
    fail "Tests failed"
  fi
else
  pass "No test runner configured (skipped)"
fi

# --- Summary ---
echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}══════════════════════════════════════${NC}"
  echo -e "${GREEN}  All checks passed ✓${NC}"
  echo -e "${GREEN}══════════════════════════════════════${NC}"
else
  echo -e "${RED}══════════════════════════════════════${NC}"
  echo -e "${RED}  Some checks failed ✗${NC}"
  echo -e "${RED}══════════════════════════════════════${NC}"
  exit 1
fi
