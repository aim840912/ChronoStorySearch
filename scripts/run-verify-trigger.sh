#!/bin/bash
# Wrapper script to load .env.local and run verify-quota-trigger.ts

# Load environment variables from .env.local
set -a
source .env.local 2>/dev/null || true
set +a

# Run the TypeScript script
npx tsx scripts/verify-quota-trigger.ts
