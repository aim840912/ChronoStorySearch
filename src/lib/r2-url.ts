/**
 * Cloudflare R2 public base URL — the single place it is read.
 *
 * Deliberately no hard-coded fallback: the custom domain (cdn.chronostorysearch.com)
 * expired on 2026-10-28, and a fallback to it would fail silently as broken images.
 * A missing value is reported by image-utils.ts (throws in production).
 */
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ''
