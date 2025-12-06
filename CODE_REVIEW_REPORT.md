# ChronoStory Search 專案程式碼審查報告

**審查日期**: 2025-12-06
**審查範圍**: 完整專案 (`src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/contexts/`, `src/types/`, `src/schemas/`)

---

## 問題總覽

| 嚴重程度 | 數量 |
|----------|------|
| 🔴 Critical | 2 |
| 🟡 Important | 12 |
| 🟢 Minor | 4 |

---

## 🔴 Critical Issues

### 1. Root Layout 使用 'use client' - 影響 SEO 和效能

| 項目 | 內容 |
|------|------|
| **檔案** | `src/app/layout.tsx` |
| **行號** | 1 |
| **信心度** | 95% |

**問題描述**：
根 Layout 標記為 `'use client'`，將整個 Layout 轉為 Client Component，這違反 Next.js 15 App Router 最佳實踐。

**違反規範**：
> CLAUDE.md: "預設 Server Component，只在需要時添加 'use client'"
> "不必要的 'use client' 會導致：增加客戶端 bundle 大小、降低初始載入效能、失去 Server Components 的 SEO 優勢"

**影響**：
1. Layout 本身並未使用任何 React hooks 或瀏覽器 API
2. `<head>` 中的 `<title>` 和 `<meta>` 標籤無法正確用於 SEO
3. 所有子元件預設變成 Client Components，增加 bundle 大小
4. `next/font/google` 字型在 Server Components 中效能最佳

**修復建議**：
移除 `layout.tsx` 的 `'use client'`，將需要客戶端功能的 providers 提取到獨立的 wrapper 元件。

---

### 2. RedisKeys 重複匯出 - 造成混淆

| 項目 | 內容 |
|------|------|
| **檔案** | `src/lib/redis/client.ts` (L47-67) 與 `src/lib/config/cache-config.ts` (L48-70) |
| **信心度** | 95% |

**問題描述**：
`RedisKeys` 從兩個檔案匯出，且包含不同的 key 結構：

- `src/lib/redis/client.ts` 匯出: `SESSION`, `USER_SESSIONS`, `RATE_LIMIT`, `BOT_IP`, `BOT_SCAN`, `BOT_PATHS`, `OAUTH_STATE`, `IP_QUOTA`
- `src/lib/config/cache-config.ts` 匯出: `discordMembership`, `discordProfile`

**修復建議**：
將所有 Redis key 定義整合到單一位置（建議 `src/lib/redis/client.ts`）以維持單一真實來源。

---

## 🟡 Important Issues

### 3. 使用漸層背景 - 違反 UI 規範

| 項目 | 內容 |
|------|------|
| **檔案** | `src/app/page.tsx:339`, `src/app/error.tsx:11`, `src/app/loading.tsx:3` |
| **信心度** | 85% |

**問題描述**：
使用漸層背景如 `bg-gradient-to-br from-blue-50 to-indigo-100`

**違反規範**：
> CLAUDE.md: "禁止使用漸層... 理由：保持視覺簡潔、提升效能、易於維護"

**修復建議**：
```tsx
// 改為：
className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800"

// 使用：
className="bg-blue-50 dark:bg-gray-900"
```

---

### 4. 使用 Emoji - 違反 UI 規範

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/gacha/GachaBrowseContent.tsx` |
| **行號** | 87 |
| **信心度** | 88% |

**問題描述**：
```tsx
<div className="text-6xl mb-4">🔍</div>
```

**違反規範**：
> CLAUDE.md: "禁止使用 Emoji... 理由：emoji 在不同平台顯示不一致、無法精確控制樣式、影響無障礙體驗"

**修復建議**：
使用 lucide-react 的 Search 圖示或 inline SVG 替代。

---

### 5. 元件過長：ItemModal.tsx (590 行)

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/ItemModal.tsx` |
| **行數** | 590 行 |
| **信心度** | 85% |

**違反規範**：
> CLAUDE.md: "元件建議 < 200 行"

**修復建議**：
- 提取 gacha sources 區塊為 `GachaSourcesSection.tsx`
- 提取 merchant sources 區塊為 `MerchantSourcesSection.tsx`
- 提取 monster drops 區塊為 `MonsterDropsSection.tsx`

---

### 6. 元件過長：AccuracyCalculatorModal.tsx (473 行)

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/AccuracyCalculatorModal.tsx` |
| **行數** | 473 行 |
| **信心度** | 85% |

**修復建議**：
- 提取 physical mode 表單為 `PhysicalModeFields.tsx`
- 提取 magic mode 表單為 `MagicModeFields.tsx`
- 提取 mode toggle 為獨立元件

---

### 7. 元件過長：ModalManager.tsx (467 行)

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/ModalManager.tsx` |
| **行數** | 467 行 |
| **信心度** | 85% |

**修復建議**：
- 提取浮動按鈕群組為 `FloatingButtonGroup.tsx`
- 提取主題/語言切換按鈕為獨立元件
- 提取隱私按鈕為獨立元件

---

### 8. 元件過長：MonsterModal.tsx (413 行)

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/MonsterModal.tsx` |
| **行數** | 413 行 |
| **信心度** | 85% |

**修復建議**：
- 提取 mobile tab 導航為獨立元件
- 提取截圖按鈕群組為獨立元件
- 提取 drop list 渲染為獨立元件

---

### 9. 元件過長：AdvancedFilterPanel.tsx (355 行)

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/AdvancedFilterPanel.tsx` |
| **行數** | 355 行 |
| **信心度** | 85% |

**修復建議**：
- 提取 item category filter 為 `ItemCategoryFilter.tsx`
- 提取 job class filter 為 `JobClassFilter.tsx`
- 提取 element weakness filter 為 `ElementWeaknessFilter.tsx`
- 提取 level range filter 為 `LevelRangeFilter.tsx`

---

### 10. 元件過長：AllItemsView.tsx (336 行)

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/lists/AllItemsView.tsx` |
| **行數** | 336 行 |
| **信心度** | 85% |

**修復建議**：
- 提取 history view 為 `HistoryViewSection.tsx`
- 提取 mixed cards 為 `MixedCardsSection.tsx`
- 提取 infinite scroll 區塊為獨立元件

---

### 11. 元件過長：MerchantShopModal.tsx (240 行)

| 項目 | 內容 |
|------|------|
| **檔案** | `src/components/MerchantShopModal.tsx` |
| **行數** | 240 行 |
| **信心度** | 85% |

**修復建議**：
提取 map item list 為 `MerchantMapItem.tsx`

---

### 12. Type 與 Schema 不一致

| 項目 | 內容 |
|------|------|
| **檔案** | `src/schemas/items.schema.ts:83-85` vs `src/types/item-equipment.ts:134-135` |
| **信心度** | 82% |

**問題描述**：
Zod schema 定義 `req_str`, `req_dex`, `req_int`, `req_luk` 為 optional/nullable：
```typescript
// Schema
req_str: z.number().int().nonnegative().optional().nullable(),
```

但 TypeScript type 定義為 required numbers：
```typescript
// Type
req_str: number
req_dex: number
req_int: number
req_luk: number
```

**修復建議**：
將 TypeScript types 與 Zod schema 對齊，將這些欄位改為 `number | null`，或使用 Zod 的 inferred types。

---

### 13. useEntityCard 可能導致不必要 re-render

| 項目 | 內容 |
|------|------|
| **檔案** | `src/hooks/useEntityCard.ts` |
| **行號** | 62 |
| **信心度** | 85% |

**問題描述**：
```typescript
useEffect(() => {
  const stored = getEntities()
  setFavorites(stored)
}, [getEntities])
```

`getEntities` 作為 dependency 傳入，但如果呼叫端未 memoize，可能在每次 render 時變更。

**修復建議**：
在 hook 的 JSDoc 中說明 `getEntities` 和 `setEntities` 應為穩定的 references，或使用 `useRef` 儲存這些函數。

---

### 14. useGachaMachine Event Listener 管理可優化

| 項目 | 內容 |
|------|------|
| **檔案** | `src/hooks/useGachaMachine.ts` |
| **行號** | 281-294 |
| **信心度** | 81% |

**問題描述**：
Event listener 的註冊依賴 `handleDrawOnce`，當 `drawCount` 變更時會重新建立，導致 listener 重複移除和添加。

**修復建議**：
考慮使用 `useRef` 儲存 draw handler 或對 listener 設置進行 debounce。

---

## 🟢 Minor Issues

### 15. 空目錄應移除

| 項目 | 內容 |
|------|------|
| **路徑** | `src/app/enhance/` |
| **信心度** | 82% |

**問題描述**：
空目錄，可能是未完成功能的殘留。

**修復建議**：
移除空目錄或實作計劃中的功能。

---

### 16. Context Providers 缺少 localStorage 錯誤處理

| 項目 | 內容 |
|------|------|
| **檔案** | `src/contexts/LanguageContext.tsx`, `ThemeContext.tsx`, `ImageFormatContext.tsx` |
| **信心度** | 80% |

**問題描述**：
Context providers 從 localStorage 讀取資料，但未優雅處理格式錯誤的資料。

**修復建議**：
在 localStorage 讀取周圍添加 try-catch，並在錯誤時使用預設值。

---

### 17. filter-utils.ts 多餘的 null 檢查

| 項目 | 內容 |
|------|------|
| **檔案** | `src/lib/filter-utils.ts` |
| **行號** | 187-192 |

**問題描述**：
檢查 `if (reqLevel === null || reqLevel === undefined)` 後又有 `if (reqLevel === null)` 是不可達的。

---

### 18. Logger 在 production 中將 logs 存入 localStorage

| 項目 | 內容 |
|------|------|
| **檔案** | `src/lib/logger.ts` |

**問題描述**：
Logger 將 logs 存入 localStorage，長時間運行的 session 可能造成無限增長（雖有 MAX_LOGS 限制）。

---

## ✅ 值得肯定的良好實踐

1. **'use client' 使用正確**：所有使用 hooks（useState, useEffect, useContext 等）或 event handlers 的元件都正確標記

2. **React.memo 使用得當**：效能關鍵元件如 `MonsterCard`, `ItemCard`, `ContentDisplay`, `BaseCard`, `ModalManager` 正確使用 `React.memo`

3. **Hooks 使用正確**：所有 hook 呼叫遵循 React 的 hooks 規則 - 在頂層呼叫且不在條件中

4. **useCallback 使用**：程式碼正確使用 custom hooks 返回 memoized functions（如 `useLazyData`, `useToast`, `useScreenshot`）

5. **Props 類型定義完整**：所有元件都有清楚的 TypeScript interface 定義

6. **一致的設計模式**：
   - Modal 結構（header, content, actions）
   - Card 佈局（image, title, badges）
   - 語言切換和主題處理

7. **無障礙支援**：元件包含 `aria-label` 屬性用於按鈕和互動元素

8. **良好的類型系統**：Types 正確分離到 domain-specific 模組，有良好的 barrel exports

9. **完善的錯誤處理**：`BaseError` 類別層級和 `ErrorFactory` 提供穩固的錯誤管理基礎

10. **良好使用泛型**：`useEntityCard` hook 展示正確使用 TypeScript 泛型以重用程式碼

11. **適當的 Zod schema**：Schemas 定義良好，有適當的驗證規則

12. **清晰的 Context 模式**：三個 Context providers 遵循一致的模式，有適當的 SSR 處理

13. **良好的 Redis 抽象**：安全的 Redis 操作，有適當的錯誤處理和 fallbacks

---

## 修復優先順序建議

### 第一優先（影響大、修復簡單）
1. 🔴 `src/app/layout.tsx` 移除 'use client' → 影響整站 SEO 和效能
2. 🔴 統一 `RedisKeys` 定義位置 → 避免開發混淆
3. 🟡 移除漸層背景 → 簡單的 className 替換

### 第二優先（提升可維護性）
4. 🟡 拆分大型 Modal 元件（ItemModal, AccuracyCalculatorModal, ModalManager）
5. 🟡 對齊 Type 與 Schema 定義

### 第三優先（優化）
6. 🟡 優化 hooks 的 dependency 管理
7. 🟢 移除空目錄和多餘程式碼
8. 🟢 加強 Context 錯誤處理

---

*報告由 Claude Code code-reviewer agent 自動生成*
