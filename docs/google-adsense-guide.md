# Google AdSense 廣告類型完整指南

## 目錄

1. [概覽](#概覽)
2. [Display Ads（展示廣告）](#display-ads展示廣告)
3. [Native Ads（原生廣告）](#native-ads原生廣告)
   - [In-feed Ads（動態內廣告）](#in-feed-ads動態內廣告)
   - [In-article Ads（文章內廣告）](#in-article-ads文章內廣告)
   - [Multiplex Ads（多重廣告）](#multiplex-ads多重廣告)
4. [Auto Ads（自動廣告）](#auto-ads自動廣告)
   - [Anchor Ads（錨定廣告）](#anchor-ads錨定廣告)
   - [Vignette Ads（插頁廣告）](#vignette-ads插頁廣告)
5. [廣告尺寸參考](#廣告尺寸參考)
6. [最佳實踐](#最佳實踐)
7. [程式碼範例](#程式碼範例)

---

## 概覽

Google AdSense 提供多種廣告格式，主要分為三大類：

| 類別 | 描述 | 適用場景 |
|------|------|----------|
| **Display Ads** | 傳統橫幅廣告 | 固定位置、側邊欄、頁首頁尾 |
| **Native Ads** | 融入網站風格的原生廣告 | 內容流、文章段落間 |
| **Auto Ads** | Google 自動放置的廣告 | 全站自動優化 |

---

## Display Ads（展示廣告）

傳統的橫幅式廣告，可選擇響應式或固定尺寸。

### 視覺示意

```
┌─────────────────────────────────────────────────────────┐
│                   Leaderboard (728×90)                  │
│                        廣告內容                          │
└─────────────────────────────────────────────────────────┘

┌──────────────┐    ┌────────────────────────────────────┐
│   Medium     │    │                                    │
│  Rectangle   │    │       Large Rectangle              │
│  (300×250)   │    │         (336×280)                  │
│              │    │                                    │
└──────────────┘    └────────────────────────────────────┘

┌─────┐
│     │
│ Sky │
│ scr │
│ aper│
│     │
│160  │
│ ×   │
│600  │
│     │
└─────┘
```

### 類型

| 類型 | 說明 |
|------|------|
| **Responsive（響應式）** | 自動適應容器大小，推薦使用 |
| **Fixed Size（固定尺寸）** | 指定特定寬高，需注意限制 |

### 固定尺寸限制

- 最小寬度：120px
- 最小高度：50px
- **只有一個維度可以超過 450px**

---

## Native Ads（原生廣告）

原生廣告設計為融入網站內容，提供更好的用戶體驗。

---

### In-feed Ads（動態內廣告）

放置在內容列表（Feed）中的廣告，匹配網站的視覺風格。

#### 視覺示意

```
┌─────────────────────────────────────┐
│ 📄 文章標題 1                        │
│    摘要文字...                       │
├─────────────────────────────────────┤
│ 📄 文章標題 2                        │
│    摘要文字...                       │
├─────────────────────────────────────┤
│ 🔷 廣告標題 [Ad]                     │  ← In-feed Ad
│    廣告描述文字...                    │
│    [圖片]                            │
├─────────────────────────────────────┤
│ 📄 文章標題 3                        │
│    摘要文字...                       │
└─────────────────────────────────────┘
```

#### 特點

- ✅ 自訂字體、顏色、樣式以匹配網站
- ✅ 響應式設計，自動適應設備
- ✅ 最小寬度：250px
- ✅ 支援 Google 機器學習自動建立樣式

#### 適用場景

- 文章列表頁
- 產品列表頁
- 新聞動態流
- 搜尋結果頁

#### 實作步驟

1. 在 AdSense 後台建立「Native」→「In-feed」廣告
2. 選擇「Let Google suggest a style」（推薦）
3. 輸入含有 Feed 的頁面 URL
4. 選擇要匹配的 Feed 元素
5. 將生成的程式碼插入 Feed 中

---

### In-article Ads（文章內廣告）

放置在文章段落之間的原生廣告。

#### 視覺示意

```
┌─────────────────────────────────────────┐
│ 文章標題                                 │
│                                         │
│ 第一段落內容...                          │
│ Lorem ipsum dolor sit amet...           │
│                                         │
│ 第二段落內容...                          │
│ Consectetur adipiscing elit...          │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │         In-article Ad [Ad]          │ │  ← 文章內廣告
│ │   ┌─────────┐                       │ │
│ │   │  圖片   │  廣告標題              │ │
│ │   └─────────┘  廣告描述...          │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│                                         │
│ 第三段落內容...                          │
│ Sed do eiusmod tempor...                │
└─────────────────────────────────────────┘
```

#### 特點

- ✅ Google 優化的廣告格式
- ✅ 全寬設計，適合行動裝置
- ✅ 自動適應容器寬度
- ✅ 最小寬度：250px
- ✅ 可選擇同時展示 Display Ads 提高收益

#### 最佳實踐

- 在文章開頭留至少 2 個段落後再放置
- 兩個 In-article Ads 之間保持足夠內容
- 避免過於密集影響閱讀體驗

---

### Multiplex Ads（多重廣告）

以網格形式展示多個廣告，類似「推薦內容」區塊。

#### 視覺示意

```
┌───────────────────────────────────────────────────────┐
│              您可能也會喜歡 [Ad]                        │
├─────────────┬─────────────┬─────────────┬─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │  圖片   │ │ │  圖片   │ │ │  圖片   │ │ │  圖片   │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘ │
│ 廣告標題 1  │ 廣告標題 2  │ 廣告標題 3  │ 廣告標題 4  │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │  圖片   │ │ │  圖片   │ │ │  圖片   │ │ │  圖片   │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘ │
│ 廣告標題 5  │ 廣告標題 6  │ 廣告標題 7  │ 廣告標題 8  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 特點

- ✅ 網格式佈局，展示多個廣告
- ✅ 適合文章結尾或側邊欄
- ✅ 外觀類似「相關內容推薦」
- ✅ 前身為 Matched Content

#### 適用場景

- 文章結尾
- 側邊欄底部
- 頁尾區域

---

## Auto Ads（自動廣告）

Google 使用機器學習自動在網站上放置廣告。

### 視覺示意 - 全頁概覽

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    主要內容                              │
│                                                         │
│     ┌─────────────────────────────────┐                │
│     │   自動插入的 Display Ad          │                │
│     └─────────────────────────────────┘                │
│                                                         │
│                    更多內容...                           │
│                                                         │
│     ┌─────────────────────────────────┐                │
│     │   自動插入的 In-article Ad       │                │
│     └─────────────────────────────────┘                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Footer                                                  │
├─────────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓ Anchor Ad (固定底部) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  [×]│
└─────────────────────────────────────────────────────────┘
```

---

### Anchor Ads（錨定廣告）

固定在螢幕邊緣的廣告，通常在底部或頂部。

#### 視覺示意

```
┌─────────────────────────────────────┐
│                                     │
│           網頁內容                   │
│                                     │
│                                     │
│                                     │
│  (使用者捲動時，Anchor Ad 保持固定)   │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ ████████ 廣告內容 ████████ [×] 關閉  │  ← 錨定在底部
└─────────────────────────────────────┘
```

#### 特點

- ✅ 高可見度
- ✅ 用戶可關閉
- ✅ 不遮擋主要內容
- ✅ 適合行動裝置

---

### Vignette Ads（插頁廣告）

在頁面切換時顯示的全螢幕廣告。

#### 視覺示意

```
用戶點擊連結後：

┌─────────────────────────────────────────┐
│                                         │
│         ┌───────────────────┐           │
│         │                   │           │
│         │   全螢幕廣告       │           │
│         │                   │           │
│         │   [廣告圖片/內容]  │           │
│         │                   │           │
│         │                   │           │
│         └───────────────────┘           │
│                                         │
│            [×] 關閉  或  5 秒後關閉      │
│                                         │
└─────────────────────────────────────────┘

→ 關閉後顯示目標頁面
```

#### 特點

- ✅ 高影響力、高收益
- ✅ 僅在頁面間切換時顯示
- ✅ 用戶可關閉或等待倒數
- ⚠️ 可能影響用戶體驗，需謹慎使用

---

## 廣告尺寸參考

### 桌面版最佳尺寸

| 尺寸 | 名稱 | 推薦位置 | 效能 |
|------|------|----------|------|
| 300×250 | Medium Rectangle | 內容中、側邊欄 | ⭐⭐⭐⭐⭐ |
| 336×280 | Large Rectangle | 內容中 | ⭐⭐⭐⭐⭐ |
| 728×90 | Leaderboard | 頁首、頁尾 | ⭐⭐⭐⭐ |
| 300×600 | Half Page (Large Skyscraper) | 側邊欄 | ⭐⭐⭐⭐⭐ |
| 160×600 | Wide Skyscraper | 側邊欄 | ⭐⭐⭐ |

### 行動版最佳尺寸

| 尺寸 | 名稱 | 效能 |
|------|------|------|
| 300×250 | Medium Rectangle | ⭐⭐⭐⭐⭐ |
| 320×50 | Mobile Leaderboard | ⭐⭐⭐⭐ |
| 320×100 | Large Mobile Banner | ⭐⭐⭐⭐⭐ |
| 250×250 | Square | ⭐⭐⭐ |

### 視覺尺寸對照

```
728×90 Leaderboard
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

300×250 Medium Rectangle          336×280 Large Rectangle
┌──────────────────────┐          ┌───────────────────────────┐
│                      │          │                           │
│                      │          │                           │
│                      │          │                           │
│                      │          │                           │
└──────────────────────┘          └───────────────────────────┘

320×50 Mobile Leaderboard         320×100 Large Mobile Banner
┌──────────────────────────┐      ┌──────────────────────────┐
│                          │      │                          │
└──────────────────────────┘      │                          │
                                  └──────────────────────────┘

160×600                300×600
Skyscraper             Half Page
┌──────┐               ┌────────────┐
│      │               │            │
│      │               │            │
│      │               │            │
│      │               │            │
│      │               │            │
│      │               │            │
│      │               │            │
│      │               │            │
│      │               │            │
└──────┘               │            │
                       │            │
                       └────────────┘
```

---

## 最佳實踐

### 一般原則

| 原則 | 說明 |
|------|------|
| **響應式優先** | 使用響應式廣告以支援各種設備 |
| **Above the Fold** | 將重要廣告放在首屏可見區域 |
| **內容為王** | 確保廣告不會影響內容閱讀體驗 |
| **測試優化** | A/B 測試不同位置和格式 |

### In-feed Ads 最佳實踐

- ✅ 每 3-5 個內容項目插入一個廣告
- ✅ 匹配網站的字體、顏色、樣式
- ✅ 桌面和行動版分別建立不同樣式
- ✅ 使用 Google 自動樣式建議功能

### In-article Ads 最佳實踐

- ✅ 在文章前 2-3 個段落後再放置
- ✅ 兩個廣告間保持足夠內容
- ✅ 考慮啟用 Display Ads 混合顯示以提高收益
- ✅ 監控跳出率和捲動深度

### 避免事項

- ❌ 過度放置廣告影響用戶體驗
- ❌ 誤導性放置（讓廣告看起來像內容）
- ❌ 在彈窗或覆蓋層中放置廣告
- ❌ 自動重新整理廣告

---

## 程式碼範例

### 基本 Display Ad（響應式）

```html
<!-- 響應式 Display Ad -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="1234567890"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

### In-feed Ad

```html
<!-- In-feed Ad -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-format="fluid"
     data-ad-layout-key="-fb+5w+4e-db+86"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="1234567890"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

### In-article Ad

```html
<!-- In-article Ad -->
<ins class="adsbygoogle"
     style="display:block; text-align:center;"
     data-ad-layout="in-article"
     data-ad-format="fluid"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="1234567890"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

### Multiplex Ad

```html
<!-- Multiplex Ad -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-format="autorelaxed"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="1234567890"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

### Auto Ads（整站啟用）

```html
<!-- 放在 <head> 中，整站只需一次 -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

### Next.js / React 元件範例

```tsx
// components/adsense/AdSenseUnit.tsx
'use client';

import { useEffect } from 'react';

interface AdSenseUnitProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid' | 'autorelaxed';
  adLayout?: string;
  adLayoutKey?: string;
  className?: string;
}

export function AdSenseUnit({
  adSlot,
  adFormat = 'auto',
  adLayout,
  adLayoutKey,
  className,
}: AdSenseUnitProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className || ''}`}
      style={{ display: 'block' }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-ad-layout={adLayout}
      data-ad-layout-key={adLayoutKey}
      data-full-width-responsive="true"
    />
  );
}
```

---

## 參考資源

- [Google AdSense Help Center](https://support.google.com/adsense/)
- [In-feed ads - Google AdSense Help](https://support.google.com/adsense/answer/9189557?hl=en)
- [In-article ads - Google AdSense Help](https://support.google.com/adsense/answer/9189562?hl=en)
- [About native ads - Google AdSense Help](https://support.google.com/adsense/answer/7186747?hl=en-GB)
- [Guidelines for fixed-sized display ad units](https://support.google.com/adsense/answer/9185043?hl=en)
- [About the responsive behavior of display ad units](https://support.google.com/adsense/answer/9183362?hl=en)
- [Google Ads Banner Sizes Guide](https://profitspring.agency/posts/the-complete-guide-to-google-ads-banner-sizes-in-2025)
- [Introducing AdSense Native ads](https://blog.google/products/adsense/introducing-adsense-native-ads/)

---

## 廣告類型選擇決策樹

```
開始
  │
  ├─ 是列表頁（文章列表、產品列表）？
  │     └─ 是 → In-feed Ads
  │
  ├─ 是文章內容頁？
  │     └─ 是 → In-article Ads
  │
  ├─ 需要固定位置（側邊欄、頁首）？
  │     └─ 是 → Display Ads（響應式）
  │
  ├─ 想要「推薦內容」風格？
  │     └─ 是 → Multiplex Ads
  │
  └─ 不確定最佳位置？
        └─ 是 → Auto Ads（讓 Google 決定）
```

---

*最後更新：2025-12-16*
