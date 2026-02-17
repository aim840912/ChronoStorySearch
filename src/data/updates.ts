export interface UpdateEntry {
  /** Display date, e.g. '2026-02' */
  date: string
  /** Category tag */
  tag: 'new' | 'improve' | 'fix'
  /** Bilingual title */
  title: { 'zh-TW': string; en: string }
  /** Bilingual short description */
  desc: { 'zh-TW': string; en: string }
}

/**
 * 10 most recent user-facing updates, newest first.
 * Curated from git log — only significant features/improvements.
 */
export const SITE_UPDATES: UpdateEntry[] = [
  {
    date: '2026-02',
    tag: 'new',
    title: {
      'zh-TW': 'PWA 支援 — 安裝為 App',
      en: 'PWA Support — Install as App',
    },
    desc: {
      'zh-TW': '可以將 ChronoStory 安裝到手機或桌面，像原生 App 一樣使用。',
      en: 'Install ChronoStory on your phone or desktop for a native app-like experience.',
    },
  },
  {
    date: '2026-01',
    tag: 'new',
    title: {
      'zh-TW': '怪物 / 物品獨立頁面',
      en: 'Monster & Item Detail Pages',
    },
    desc: {
      'zh-TW': '每個怪物和物品都有專屬頁面，可直接分享連結，支援搜尋引擎收錄。',
      en: 'Every monster and item has its own page with a shareable URL, optimized for search engines.',
    },
  },
  {
    date: '2026-02',
    tag: 'new',
    title: {
      'zh-TW': '命中率計算機',
      en: 'Hit Rate Calculator',
    },
    desc: {
      'zh-TW': '點擊怪物迴避屬性，即可計算對該怪物所需的命中率。',
      en: 'Click on a monster\'s evasion stat to calculate the accuracy needed to hit it.',
    },
  },
  {
    date: '2026-01',
    tag: 'new',
    title: {
      'zh-TW': '物品詳細彈窗',
      en: 'Item Detail Modal',
    },
    desc: {
      'zh-TW': '在怪物掉落列表中直接預覽物品屬性，無需離開當前頁面。',
      en: 'Preview item stats directly from monster drop lists without leaving the page.',
    },
  },
  {
    date: '2025-12',
    tag: 'new',
    title: {
      'zh-TW': '卷軸兌換查詢',
      en: 'Scroll Exchange Lookup',
    },
    desc: {
      'zh-TW': '搜尋和比較卷軸兌換匯率，支援排序和篩選。',
      en: 'Search and compare scroll exchange rates with sorting and filtering.',
    },
  },
  {
    date: '2025-12',
    tag: 'new',
    title: {
      'zh-TW': '怪物出沒地點',
      en: 'Monster Spawn Locations',
    },
    desc: {
      'zh-TW': '在怪物視窗中查看怪物出現的地圖位置。',
      en: 'View map locations where monsters spawn in the monster modal.',
    },
  },
  {
    date: '2025-11',
    tag: 'new',
    title: {
      'zh-TW': '扭蛋機掉落表',
      en: 'Gacha Machine Drop Tables',
    },
    desc: {
      'zh-TW': '查看各城鎮扭蛋機的完整掉落物品列表。',
      en: 'Browse complete drop tables for gacha machines in each town.',
    },
  },
  {
    date: '2026-01',
    tag: 'improve',
    title: {
      'zh-TW': '分享功能',
      en: 'Share Feature',
    },
    desc: {
      'zh-TW': '一鍵分享怪物或物品資訊給朋友，取代舊版截圖功能。',
      en: 'Share monster or item info with one tap, replacing the old screenshot feature.',
    },
  },
  {
    date: '2026-01',
    tag: 'improve',
    title: {
      'zh-TW': '掉落物品分類篩選',
      en: 'Drop Category Filters',
    },
    desc: {
      'zh-TW': '在怪物掉落列表中按裝備、卷軸、其他分類篩選物品。',
      en: 'Filter monster drops by equipment, scrolls, and other categories.',
    },
  },
  {
    date: '2026-02',
    tag: 'improve',
    title: {
      'zh-TW': '深色 / 淺色主題 + 語言切換',
      en: 'Dark / Light Theme + Language Toggle',
    },
    desc: {
      'zh-TW': '全站支援深色與淺色主題切換，所有頁面支援中英文即時切換。',
      en: 'Full dark/light theme support across all pages, with instant language switching.',
    },
  },
]
