#!/bin/bash
# Check listing_id: 14

set -a
source .env.local 2>/dev/null || true
set +a

npx tsx scripts/check-listing-14.ts
