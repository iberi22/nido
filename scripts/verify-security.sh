#!/usr/bin/env bash
# NIDO verify-security.sh — Stage 1: Secrets scan, Stage 2: npm audit, Stage 3: security headers verification
set -euo pipefail

# Navigate to project root
cd "$(dirname "$0")/.."

# Define regex patterns for scanning (split to avoid matching within this script)
PAT_AWS="AKIA[0-9""A-Z]{16}"
PAT_GH="gh[pousr][0-9""A-Za-z]{36}"
PAT_SLACK="xox[baprs]-"
PAT_OPENAI="sk-[a-zA-Z0-9]{20,}"
PAT_BEARER="Bearer [a-zA-Z0-9.-]{20,}"

COMBINED_PAT="${PAT_AWS}|${PAT_GH}|${PAT_SLACK}|${PAT_OPENAI}|${PAT_BEARER}"

# If a custom target path is supplied as the first parameter, scan that path only and exit
if [ -n "${1:-}" ]; then
  echo "Scanning custom target path: $1"
  if [ ! -e "$1" ]; then
    echo "CRITICAL: Custom target path $1 does not exist!"
    exit 1
  fi
  if grep -r -E -n "$COMBINED_PAT" "$1" > grep_results.log 2>&1; then
    echo "CRITICAL: Secret patterns detected in target path!"
    cat grep_results.log
    rm -f grep_results.log
    exit 1
  else
    echo "Target path is clean of secrets."
    rm -f grep_results.log
    exit 0
  fi
fi

echo "==> NIDO Security Hardening Gate — Running Checks"

# Stage 1: Secrets Scan
echo "==> Stage 1: Scanning git-tracked files for secrets..."
# Get all tracked files, or fall back to find if git is not available
files=$(git ls-files 2>/dev/null || find . -type f)

# Exclude node_modules, vendored code, builds, the script itself, and the test file
files_to_scan=$(echo "$files" | grep -vE 'node_modules/|src/lib/vendor/|dist/|scripts/verify-security.sh|test/integration/security-scan.test.ts')

if [ -n "$files_to_scan" ]; then
  # grep -E returns 0 if a match is found, which means we found a secret (failure)
  if echo "$files_to_scan" | xargs grep -E -n "$COMBINED_PAT" > grep_results.log 2>&1; then
    echo "CRITICAL: Secret patterns detected in tracked files!"
    cat grep_results.log
    rm -f grep_results.log
    exit 1
  else
    echo "Secrets scan passed successfully: No secrets detected."
    rm -f grep_results.log
  fi
else
  echo "No tracked files found to scan."
fi

# Stage 2: npm audit
echo "==> Stage 2: Running npm audit --omit=dev..."
# Ensure zero high/critical vulnerabilities
if ! npm audit --omit=dev --audit-level=high; then
  echo "CRITICAL: High or critical vulnerabilities detected in production dependencies!"
  exit 1
fi
echo "npm audit passed successfully."

# Stage 3: Verify Security Headers
echo "==> Stage 3: Verifying security headers..."
HEADERS_FILE="dist/_headers"
if [ ! -f "$HEADERS_FILE" ]; then
  echo "Warning: dist/_headers not found. Falling back to public/_headers."
  HEADERS_FILE="public/_headers"
fi

if [ ! -f "$HEADERS_FILE" ]; then
  echo "CRITICAL: Headers file could not be found!"
  exit 1
fi

echo "Verifying security headers in $HEADERS_FILE..."
if ! grep -q -i "X-Content-Type-Options" "$HEADERS_FILE"; then
  echo "CRITICAL: Missing X-Content-Type-Options header!"
  exit 1
fi

if ! grep -q -i "X-Frame-Options" "$HEADERS_FILE"; then
  echo "CRITICAL: Missing X-Frame-Options header!"
  exit 1
fi

if ! grep -q -i "Referrer-Policy" "$HEADERS_FILE"; then
  echo "CRITICAL: Missing Referrer-Policy header!"
  exit 1
fi

echo "Security headers check passed successfully."
echo "==> All security checks completed successfully!"
