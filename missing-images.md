# Missing Images Report

Updated: 2026-02-21

## Summary

| Category | Total in Data | Has Image | Missing |
|----------|---------------|-----------|---------|
| Monsters | 255 | 255 | 0 |
| Items | 2107 | 2096 | 8 |

> 46 item images were added on 2026-02-21 via MapleStory.io API (R2 totalItems: 2112).
> 12 monster images were added on 2026-02-21 via MapleStory.io JMS/419 API (R2 monsters: 255).
> 4 Pearl Ring images were added on 2026-02-21 via MapleStory.io JMS/419 API (R2 totalItems: 2116).
> 3 Accessory Scrolls resolved — app uses scroll success rate icon fallback (/images/scrolls/{rate}.png).
> Remaining 8 items (Swimming Equipment) return 404 from all API sources.

## Resolved Items

### Pearl Rings (4) — Added via JMS/419 API

Downloaded from `https://maplestory.io/api/JMS/419/item/{id}/icon` on 2026-02-21.

### Accessory Scrolls (3) — Resolved via fallback

The app displays scroll success rate icons (`10.png`, `30.png`, `100.png`) as fallback when item-specific icons are unavailable. No R2 upload needed.

| ID | Name | Fallback Icon |
|----|------|---------------|
| 2040354 | Scroll for Accessory for INT 10% | /images/scrolls/10.png |
| 2040360 | Dark Scroll for Accessory for LUK 30% | /images/scrolls/30.png |
| 2040364 | Scroll for Accessory for STR 100% | /images/scrolls/100.png |

## Missing Item Images (8)

### Swimming Equipment (8) — MapleStory.io API 404

| ID | Name |
|----|------|
| 6002015 | Red Swimming Goggle |
| 6002070 | Green Swimming Goggle |
| 6002071 | Blue Swimming Goggle |
| 6052017 | Orange Life-Jacket |
| 6052018 | Green Life-Jacket |
| 6052019 | Blue Life-Jacket |
| 6072092 | Yellow Flippers |
| 6072093 | Blue Flippers |
