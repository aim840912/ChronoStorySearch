# MapleStory 物品交易系統實作計畫

**版本**：1.0.0
**建立日期**：2025-10-20
**預估工時**：3-5 天
**技術棧**：Next.js 15 + Supabase + TypeScript

---

## 📋 目錄

1. [專案概述](#專案概述)
2. [技術架構](#技術架構)
3. [Supabase 設定](#supabase-設定)
4. [資料庫設計](#資料庫設計)
5. [TypeScript 型別定義](#typescript-型別定義)
6. [功能模組設計](#功能模組設計)
7. [組件架構](#組件架構)
8. [API 設計](#api-設計)
9. [分階段實作計畫](#分階段實作計畫)
10. [安全性考量](#安全性考量)
11. [效能優化](#效能優化)
12. [測試計畫](#測試計畫)

---

## 📖 專案概述

### 功能目標

建立一個**物品交易資訊看板系統**，讓玩家可以：
- 🏷️ 發布想要出售的物品及價格
- 👀 瀏覽其他玩家的交易資訊
- 💬 留言表達購買意願
- 🔍 搜尋與篩選交易物品
- ⚡ 即時查看新交易和留言

### 核心特性

✅ **零金流**：不涉及真實金錢交易
✅ **輕量認證**：使用暱稱，無需複雜註冊
✅ **即時更新**：Supabase Realtime
✅ **完全免費**：使用 Supabase 免費方案
✅ **整合現有資料**：重用物品資料庫

### 非功能需求

- 🚀 響應式設計（支援手機、平板、桌面）
- 🌙 支援深色模式
- 🌐 多語言支援（繁中/英文）
- ♿ 無障礙設計（ARIA 標籤）

---

## 🏗️ 技術架構

### 技術棧

```
前端：
├── Next.js 15 (App Router)
├── React 19
├── TypeScript
├── Tailwind CSS 4
└── Supabase Client

後端：
├── Supabase (PostgreSQL)
├── Supabase Realtime (WebSocket)
└── Row Level Security (RLS)

部署：
└── Vercel (前端) + Supabase (後端)
```

### 架構圖

```
┌─────────────────────────────────────────────┐
│           User Interface (React)            │
│  ┌──────────┬──────────┬──────────────────┐ │
│  │ 交易看板  │ 發布交易  │ 交易詳情 + 留言 │ │
│  └──────────┴──────────┴──────────────────┘ │
└────────────────────┬────────────────────────┘
                     │
                     ▼
         ┌──────────────────────┐
         │  Supabase Client     │
         │  - CRUD Operations   │
         │  - Realtime Subs     │
         └──────────┬───────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │    Supabase Backend           │
    │  ┌─────────────────────────┐  │
    │  │  PostgreSQL Database    │  │
    │  │  - trade_posts          │  │
    │  │  - trade_messages       │  │
    │  │  - RLS Policies         │  │
    │  └─────────────────────────┘  │
    │  ┌─────────────────────────┐  │
    │  │  Realtime Engine        │  │
    │  │  - WebSocket Server     │  │
    │  └─────────────────────────┘  │
    └───────────────────────────────┘
```

---

## ⚙️ Supabase 設定

### 步驟 1: 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://app.supabase.com/)
2. 點擊 "New Project"
3. 填寫專案資訊：
   ```
   Project Name: maplestory-trade
   Database Password: [產生強密碼]
   Region: Northeast Asia (Seoul) - 選離台灣最近的
   Pricing Plan: Free
   ```
4. 等待專案建立完成（約 2 分鐘）

### 步驟 2: 取得 API 金鑰

1. 進入專案 Settings → API
2. 複製以下資訊：
   ```
   Project URL: https://xxxxx.supabase.co
   anon (public) key: eyJhbGc...
   service_role key: eyJhbGc... (暫時不需要)
   ```

### 步驟 3: 設定環境變數

在專案根目錄的 `.env.local` 新增：

```bash
# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 步驟 4: 安裝 Supabase Client

```bash
npm install @supabase/supabase-js
```

---

## 🗄️ 資料庫設計

### Schema 設計

#### 1. `trade_posts` 表（交易貼文）

```sql
-- 建立交易貼文表
create table public.trade_posts (
  -- 主鍵
  id uuid primary key default gen_random_uuid(),

  -- 物品資訊
  item_id integer not null,
  item_name text not null,
  item_image_url text,

  -- 交易資訊
  price integer not null check (price > 0),
  currency text not null default 'meso' check (currency in ('meso', 'nx')),
  quantity integer not null default 1 check (quantity > 0),

  -- 賣家資訊
  seller_name text not null check (length(seller_name) between 2 and 20),
  contact_method text not null check (contact_method in ('discord', 'line', 'game')),
  contact_info text not null check (length(contact_info) between 3 and 50),

  -- 交易狀態
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),

  -- 額外資訊
  description text check (length(description) <= 500),

  -- 時間戳記
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone default (now() + interval '30 days') not null
);

-- 建立索引以提升查詢效能
create index idx_trade_posts_item_id on public.trade_posts(item_id);
create index idx_trade_posts_status on public.trade_posts(status);
create index idx_trade_posts_created_at on public.trade_posts(created_at desc);
create index idx_trade_posts_seller on public.trade_posts(seller_name);

-- 自動更新 updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_trade_posts_updated_at
  before update on public.trade_posts
  for each row
  execute function update_updated_at_column();

-- 自動過期舊交易（可選）
create or replace function auto_expire_old_trades()
returns void as $$
begin
  update public.trade_posts
  set status = 'cancelled'
  where status = 'active'
  and expires_at < now();
end;
$$ language plpgsql;

-- 建立定時任務（需要在 Supabase Dashboard 手動設定 cron job）
-- 或者在前端查詢時過濾已過期交易
```

#### 2. `trade_messages` 表（買家留言）

```sql
-- 建立交易留言表
create table public.trade_messages (
  -- 主鍵
  id uuid primary key default gen_random_uuid(),

  -- 外鍵關聯
  post_id uuid not null references public.trade_posts(id) on delete cascade,

  -- 買家資訊
  buyer_name text not null check (length(buyer_name) between 2 and 20),
  message text check (length(message) <= 200),

  -- 聯絡資訊（可選）
  contact_method text check (contact_method in ('discord', 'line', 'game')),
  contact_info text check (length(contact_info) <= 50),

  -- 時間戳記
  created_at timestamp with time zone default now() not null
);

-- 建立索引
create index idx_trade_messages_post_id on public.trade_messages(post_id);
create index idx_trade_messages_created_at on public.trade_messages(created_at desc);

-- 確保外鍵約束
alter table public.trade_messages
  add constraint fk_trade_messages_post
  foreign key (post_id)
  references public.trade_posts(id)
  on delete cascade;
```

### Row Level Security (RLS) 政策

```sql
-- 啟用 RLS
alter table public.trade_posts enable row level security;
alter table public.trade_messages enable row level security;

-- trade_posts 政策
-- 1. 所有人都可以讀取 active 狀態的交易
create policy "Anyone can view active trades"
  on public.trade_posts
  for select
  using (status = 'active' and expires_at > now());

-- 2. 任何人都可以建立交易（無需認證，使用暱稱）
create policy "Anyone can create trades"
  on public.trade_posts
  for insert
  with check (true);

-- 3. 只有賣家可以更新自己的交易（使用 seller_name 驗證）
-- 注意：這是簡化版，實際可能需要更安全的機制
create policy "Sellers can update their own trades"
  on public.trade_posts
  for update
  using (true)  -- 暫時允許所有人更新，前端控制
  with check (true);

-- 4. 只有賣家可以刪除自己的交易
create policy "Sellers can delete their own trades"
  on public.trade_posts
  for delete
  using (true);  -- 暫時允許所有人刪除，前端控制

-- trade_messages 政策
-- 1. 所有人都可以讀取留言
create policy "Anyone can view messages"
  on public.trade_messages
  for select
  using (true);

-- 2. 任何人都可以建立留言
create policy "Anyone can create messages"
  on public.trade_messages
  for insert
  with check (true);

-- 3. 只有留言者可以刪除自己的留言（使用 buyer_name 驗證）
create policy "Buyers can delete their own messages"
  on public.trade_messages
  for delete
  using (true);  -- 前端控制
```

### 資料庫初始化腳本

將以上 SQL 儲存為 `supabase/migrations/001_create_trade_tables.sql`，或直接在 Supabase SQL Editor 執行。

---

## 📐 TypeScript 型別定義

在 `src/types/trade.ts` 建立：

```typescript
/**
 * 交易系統型別定義
 */

// 貨幣類型
export type TradeCurrency = 'meso' | 'nx'

// 交易狀態
export type TradeStatus = 'active' | 'sold' | 'cancelled'

// 聯絡方式
export type ContactMethod = 'discord' | 'line' | 'game'

// 交易貼文
export interface TradePost {
  id: string

  // 物品資訊
  item_id: number
  item_name: string
  item_image_url?: string

  // 交易資訊
  price: number
  currency: TradeCurrency
  quantity: number

  // 賣家資訊
  seller_name: string
  contact_method: ContactMethod
  contact_info: string

  // 交易狀態
  status: TradeStatus

  // 額外資訊
  description?: string

  // 時間戳記
  created_at: string
  updated_at: string
  expires_at: string

  // 關聯資料（JOIN 時使用）
  messages?: TradeMessage[]
  message_count?: number
}

// 交易留言
export interface TradeMessage {
  id: string
  post_id: string

  // 買家資訊
  buyer_name: string
  message?: string

  // 聯絡資訊
  contact_method?: ContactMethod
  contact_info?: string

  // 時間戳記
  created_at: string
}

// 建立交易表單資料
export interface CreateTradeFormData {
  item_id: number
  item_name: string
  price: number
  currency: TradeCurrency
  quantity: number
  seller_name: string
  contact_method: ContactMethod
  contact_info: string
  description?: string
}

// 建立留言表單資料
export interface CreateMessageFormData {
  post_id: string
  buyer_name: string
  message?: string
  contact_method?: ContactMethod
  contact_info?: string
}

// 交易篩選條件
export interface TradeFilterOptions {
  item_name?: string          // 物品名稱搜尋
  min_price?: number          // 最低價格
  max_price?: number          // 最高價格
  currency?: TradeCurrency    // 貨幣類型
  seller_name?: string        // 賣家名稱
  sort_by?: 'created_at' | 'price'  // 排序方式
  sort_order?: 'asc' | 'desc'       // 排序順序
}

// API 回應格式
export interface TradeApiResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

// 分頁參數
export interface PaginationParams {
  page: number
  page_size: number
}
```

更新 `src/types/index.ts`：

```typescript
// 在檔案末尾新增
export * from './trade'
```

---

## 🎯 功能模組設計

### 1. 發布交易功能

**使用者故事**：
> 作為賣家，我想要發布一個交易，指定物品、價格和聯絡方式

**功能流程**：
```
1. 點擊「發布交易」按鈕
2. 選擇要賣的物品（從現有物品資料庫）
3. 填寫交易資訊：
   - 價格（數字輸入）
   - 貨幣類型（楓幣/點數）
   - 數量
   - 聯絡方式（Discord/LINE/遊戲內）
   - 聯絡資訊（帳號或角色名）
   - 賣家暱稱
   - 備註（可選）
4. 送出表單
5. 驗證資料
6. 儲存至 Supabase
7. 顯示成功訊息 + 跳轉至交易詳情
```

**驗證規則**：
- 價格 > 0
- 數量 > 0
- 賣家暱稱 2-20 字元
- 聯絡資訊 3-50 字元
- 備註 ≤ 500 字元

---

### 2. 瀏覽交易列表

**使用者故事**：
> 作為買家，我想要瀏覽所有交易，並可以搜尋和篩選

**功能流程**：
```
1. 開啟交易看板
2. 顯示所有 active 狀態的交易
3. 支援搜尋（物品名稱）
4. 支援篩選：
   - 價格範圍
   - 貨幣類型
   - 賣家名稱
5. 支援排序：
   - 最新發布
   - 價格由低到高
   - 價格由高到低
6. 點擊交易卡片查看詳情
```

**UI 元素**：
- 搜尋框
- 篩選器
- 排序下拉選單
- 交易卡片網格

---

### 3. 買家留言系統

**使用者故事**：
> 作為買家，我想要在交易下留言表達購買意願

**功能流程**：
```
1. 在交易詳情頁點擊「我想購買」
2. 填寫留言表單：
   - 買家暱稱（必填）
   - 留言內容（可選）
   - 聯絡方式（可選）
   - 聯絡資訊（可選）
3. 送出表單
4. 即時顯示在留言列表
5. 賣家收到即時通知（透過 Realtime）
```

---

### 4. 即時更新機制

**使用者故事**：
> 作為使用者，我想要即時看到新交易和新留言

**技術實作**：

```typescript
// 訂閱新交易
const subscription = supabase
  .channel('trade_posts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'trade_posts'
  }, (payload) => {
    // 新增交易到列表
    addNewTrade(payload.new as TradePost)
  })
  .subscribe()

// 訂閱交易狀態更新
supabase
  .channel('trade_posts')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'trade_posts'
  }, (payload) => {
    // 更新交易狀態
    updateTrade(payload.new as TradePost)
  })
  .subscribe()

// 訂閱新留言
supabase
  .channel('trade_messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'trade_messages'
  }, (payload) => {
    // 新增留言
    addNewMessage(payload.new as TradeMessage)
  })
  .subscribe()

// 清理訂閱
return () => {
  subscription.unsubscribe()
}
```

---

### 5. 搜尋與篩選

**搜尋實作**：

```typescript
// 使用 Supabase 的全文搜尋
const { data, error } = await supabase
  .from('trade_posts')
  .select('*')
  .eq('status', 'active')
  .ilike('item_name', `%${searchTerm}%`)  // 不區分大小寫搜尋
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })
```

**篩選實作**：

```typescript
let query = supabase
  .from('trade_posts')
  .select('*')
  .eq('status', 'active')

// 價格範圍
if (minPrice) query = query.gte('price', minPrice)
if (maxPrice) query = query.lte('price', maxPrice)

// 貨幣類型
if (currency) query = query.eq('currency', currency)

// 賣家名稱
if (sellerName) query = query.ilike('seller_name', `%${sellerName}%`)

// 排序
query = query.order(sortBy, { ascending: sortOrder === 'asc' })

const { data, error } = await query
```

---

## 🧩 組件架構

### 組件樹狀圖

```
HomePage
└── TradeBoardButton (開啟交易看板的按鈕)

TradeBoardModal (交易看板 Modal)
├── SearchBar (搜尋框)
├── FilterPanel (篩選面板)
│   ├── PriceRangeFilter
│   ├── CurrencyFilter
│   └── SortDropdown
├── CreateTradeButton (發布交易按鈕)
└── TradeGrid (交易網格)
    └── TradeCard[] (交易卡片列表)

CreateTradeModal (發布交易 Modal)
├── ItemSelector (物品選擇器 - 重用現有 ItemModal)
├── TradeForm
│   ├── PriceInput
│   ├── CurrencySelector
│   ├── QuantityInput
│   ├── SellerNameInput
│   ├── ContactMethodSelector
│   ├── ContactInfoInput
│   └── DescriptionTextarea
└── SubmitButton

TradeDetailModal (交易詳情 Modal)
├── TradeInfo (交易資訊卡片)
│   ├── ItemDisplay
│   ├── PriceDisplay
│   ├── SellerInfo
│   └── ContactInfo
├── MessageSection (留言區)
│   ├── MessageList
│   │   └── MessageCard[]
│   └── CreateMessageForm
│       ├── BuyerNameInput
│       ├── MessageTextarea
│       ├── ContactFields (可選)
│       └── SubmitButton
└── ActionButtons
    ├── ContactSellerButton
    └── ReportButton (檢舉 - 可選)
```

### 核心組件設計

#### 1. `TradeBoardModal.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { TradePost, TradeFilterOptions } from '@/types'

interface TradeBoardModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TradeBoardModal({ isOpen, onClose }: TradeBoardModalProps) {
  const { t } = useLanguage()
  const [trades, setTrades] = useState<TradePost[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TradeFilterOptions>({})
  const [searchTerm, setSearchTerm] = useState('')

  // 載入交易列表
  useEffect(() => {
    if (!isOpen) return
    loadTrades()
  }, [isOpen, filters])

  // 即時訂閱
  useEffect(() => {
    if (!isOpen) return

    const subscription = supabase
      .channel('trade_posts_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trade_posts'
      }, (payload) => {
        setTrades(prev => [payload.new as TradePost, ...prev])
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [isOpen])

  async function loadTrades() {
    setLoading(true)
    let query = supabase
      .from('trade_posts')
      .select(`
        *,
        messages:trade_messages(count)
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())

    // 應用篩選...
    if (searchTerm) {
      query = query.ilike('item_name', `%${searchTerm}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (!error && data) {
      setTrades(data)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">{t('trade.title')}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 搜尋與篩選 */}
          {/* 交易網格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trades.map(trade => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 2. `TradeCard.tsx`

```typescript
'use client'

import { getItemImageUrl } from '@/lib/image-utils'
import type { TradePost } from '@/types'

interface TradeCardProps {
  trade: TradePost
  onClick?: () => void
}

export function TradeCard({ trade, onClick }: TradeCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-700 rounded-lg p-4 border cursor-pointer hover:shadow-lg transition"
    >
      {/* 物品圖片 */}
      <img
        src={getItemImageUrl(trade.item_id)}
        alt={trade.item_name}
        className="w-16 h-16 mx-auto"
      />

      {/* 物品名稱 */}
      <h3 className="font-bold text-center mt-2">{trade.item_name}</h3>

      {/* 價格 */}
      <div className="text-2xl font-bold text-purple-600 text-center mt-2">
        {trade.price.toLocaleString()} {trade.currency === 'meso' ? '楓幣' : 'NX'}
      </div>

      {/* 賣家 */}
      <div className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
        賣家：{trade.seller_name}
      </div>

      {/* 留言數 */}
      {trade.message_count > 0 && (
        <div className="text-xs text-gray-500 text-center mt-1">
          💬 {trade.message_count} 則留言
        </div>
      )}

      {/* 發布時間 */}
      <div className="text-xs text-gray-400 text-center mt-1">
        {new Date(trade.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}
```

---

## 🔌 API 設計

### Supabase Client 設定

建立 `src/lib/supabase.ts`：

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false  // 我們不使用認證系統
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
```

### API Service Layer

建立 `src/lib/trade-api.ts`：

```typescript
import { supabase } from './supabase'
import type {
  TradePost,
  TradeMessage,
  CreateTradeFormData,
  CreateMessageFormData,
  TradeFilterOptions,
  TradeApiResponse
} from '@/types'

/**
 * 交易 API 服務
 */
export class TradeAPI {
  /**
   * 建立新交易
   */
  static async createTrade(data: CreateTradeFormData): Promise<TradeApiResponse<TradePost>> {
    const { data: trade, error } = await supabase
      .from('trade_posts')
      .insert({
        item_id: data.item_id,
        item_name: data.item_name,
        price: data.price,
        currency: data.currency,
        quantity: data.quantity,
        seller_name: data.seller_name,
        contact_method: data.contact_method,
        contact_info: data.contact_info,
        description: data.description,
        status: 'active'
      })
      .select()
      .single()

    return {
      data: trade,
      error: error?.message || null
    }
  }

  /**
   * 取得交易列表
   */
  static async getTrades(
    filters?: TradeFilterOptions,
    page = 1,
    pageSize = 20
  ): Promise<TradeApiResponse<TradePost[]>> {
    let query = supabase
      .from('trade_posts')
      .select(`
        *,
        messages:trade_messages(count)
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())

    // 應用篩選
    if (filters?.item_name) {
      query = query.ilike('item_name', `%${filters.item_name}%`)
    }
    if (filters?.min_price !== undefined) {
      query = query.gte('price', filters.min_price)
    }
    if (filters?.max_price !== undefined) {
      query = query.lte('price', filters.max_price)
    }
    if (filters?.currency) {
      query = query.eq('currency', filters.currency)
    }
    if (filters?.seller_name) {
      query = query.ilike('seller_name', `%${filters.seller_name}%`)
    }

    // 排序
    const sortBy = filters?.sort_by || 'created_at'
    const sortOrder = filters?.sort_order === 'asc'
    query = query.order(sortBy, { ascending: sortOrder })

    // 分頁
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    return {
      data,
      error: error?.message || null,
      count: count || undefined
    }
  }

  /**
   * 取得單一交易詳情
   */
  static async getTradeById(id: string): Promise<TradeApiResponse<TradePost>> {
    const { data, error } = await supabase
      .from('trade_posts')
      .select(`
        *,
        messages:trade_messages(*)
      `)
      .eq('id', id)
      .single()

    return {
      data,
      error: error?.message || null
    }
  }

  /**
   * 更新交易狀態
   */
  static async updateTradeStatus(
    id: string,
    status: 'active' | 'sold' | 'cancelled'
  ): Promise<TradeApiResponse<TradePost>> {
    const { data, error } = await supabase
      .from('trade_posts')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    return {
      data,
      error: error?.message || null
    }
  }

  /**
   * 刪除交易
   */
  static async deleteTrade(id: string): Promise<TradeApiResponse<null>> {
    const { error } = await supabase
      .from('trade_posts')
      .delete()
      .eq('id', id)

    return {
      data: null,
      error: error?.message || null
    }
  }

  /**
   * 建立留言
   */
  static async createMessage(data: CreateMessageFormData): Promise<TradeApiResponse<TradeMessage>> {
    const { data: message, error } = await supabase
      .from('trade_messages')
      .insert({
        post_id: data.post_id,
        buyer_name: data.buyer_name,
        message: data.message,
        contact_method: data.contact_method,
        contact_info: data.contact_info
      })
      .select()
      .single()

    return {
      data: message,
      error: error?.message || null
    }
  }

  /**
   * 取得交易的所有留言
   */
  static async getMessages(postId: string): Promise<TradeApiResponse<TradeMessage[]>> {
    const { data, error } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    return {
      data,
      error: error?.message || null
    }
  }

  /**
   * 訂閱交易更新（Realtime）
   */
  static subscribeToTrades(
    callback: (trade: TradePost) => void
  ) {
    return supabase
      .channel('trade_posts_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trade_posts'
      }, (payload) => {
        callback(payload.new as TradePost)
      })
      .subscribe()
  }

  /**
   * 訂閱留言更新（Realtime）
   */
  static subscribeToMessages(
    postId: string,
    callback: (message: TradeMessage) => void
  ) {
    return supabase
      .channel(`trade_messages_${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trade_messages',
        filter: `post_id=eq.${postId}`
      }, (payload) => {
        callback(payload.new as TradeMessage)
      })
      .subscribe()
  }
}
```

---

## 📅 分階段實作計畫

### Day 1: Supabase 設定與資料庫建立

**目標**：完成後端基礎建設

#### 上午（3 小時）
- [ ] 建立 Supabase 專案（15分鐘）
- [ ] 設定環境變數（15分鐘）
- [ ] 執行資料庫 Schema（30分鐘）
- [ ] 設定 RLS 政策（1小時）
- [ ] 測試資料庫連線（30分鐘）

#### 下午（3 小時）
- [ ] 安裝 Supabase Client（10分鐘）
- [ ] 建立 `supabase.ts` Client（30分鐘）
- [ ] 建立型別定義 `trade.ts`（1小時）
- [ ] 建立 API Service `trade-api.ts`（1.5小時）
- [ ] 測試 API 功能（手動測試）

**檢查點**：
```bash
# 測試腳本
node scripts/test-supabase-connection.js
```

---

### Day 2: 基礎 CRUD 功能

**目標**：實作核心資料操作

#### 上午（4 小時）
- [ ] 建立 `CreateTradeModal` 組件（2小時）
  - 表單設計
  - 驗證邏輯
  - 提交處理
- [ ] 整合物品選擇器（1小時）
  - 重用現有 ItemModal
  - 連接到 CreateTrade
- [ ] 測試建立交易功能（1小時）

#### 下午（3 小時）
- [ ] 建立 `TradeCard` 組件（1小時）
- [ ] 建立 `TradeBoardModal` 骨架（1小時）
- [ ] 實作交易列表載入（1小時）
- [ ] 測試瀏覽交易功能

**檢查點**：
- ✅ 可以發布交易
- ✅ 可以看到交易列表

---

### Day 3: UI 組件與互動

**目標**：完善使用者介面

#### 上午（4 小時）
- [ ] 實作搜尋功能（1.5小時）
- [ ] 實作篩選功能（1.5小時）
  - 價格範圍
  - 貨幣類型
  - 排序
- [ ] 優化 UI/UX（1小時）

#### 下午（4 小時）
- [ ] 建立 `TradeDetailModal`（2小時）
  - 交易資訊顯示
  - 賣家聯絡資訊
- [ ] 建立留言功能（2小時）
  - 留言表單
  - 留言列表
  - 留言卡片

**檢查點**：
- ✅ 可以搜尋交易
- ✅ 可以篩選交易
- ✅ 可以查看詳情
- ✅ 可以留言

---

### Day 4: 即時更新與優化

**目標**：實作 Realtime 功能

#### 上午（3 小時）
- [ ] 實作交易列表即時更新（1.5小時）
- [ ] 實作留言即時更新（1.5小時）
- [ ] 測試 Realtime 功能

#### 下午（4 小時）
- [ ] 效能優化（2小時）
  - 分頁載入
  - 無限滾動（可選）
  - 圖片 lazy loading
- [ ] UI/UX 優化（2小時）
  - 載入動畫
  - 錯誤提示
  - 成功訊息

**檢查點**：
- ✅ 新交易即時出現
- ✅ 新留言即時顯示
- ✅ 效能流暢

---

### Day 5: 測試、除錯與部署

**目標**：確保品質並部署

#### 上午（3 小時）
- [ ] 整合測試（1.5小時）
  - 建立交易流程
  - 留言流程
  - 篩選搜尋
- [ ] 除錯與修復（1.5小時）

#### 下午（3 小時）
- [ ] 多語言支援（1小時）
  - 新增翻譯鍵值
- [ ] 無障礙優化（30分鐘）
  - ARIA 標籤
  - 鍵盤導航
- [ ] 文檔撰寫（1小時）
  - 使用說明
  - API 文檔
- [ ] 部署至 Vercel（30分鐘）

**檢查點**：
- ✅ 所有功能正常運作
- ✅ 無嚴重 Bug
- ✅ 已部署上線

---

## 🔒 安全性考量

### 1. 輸入驗證

**前端驗證**：

```typescript
// 驗證函數
export function validateTradeForm(data: CreateTradeFormData): string[] {
  const errors: string[] = []

  // 價格驗證
  if (data.price <= 0) {
    errors.push('價格必須大於 0')
  }
  if (data.price > 999999999) {
    errors.push('價格超過上限')
  }

  // 賣家暱稱
  if (data.seller_name.length < 2 || data.seller_name.length > 20) {
    errors.push('賣家暱稱必須 2-20 字元')
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(data.seller_name)) {
    errors.push('暱稱只能包含文字、數字和底線')
  }

  // 聯絡資訊
  if (data.contact_info.length < 3 || data.contact_info.length > 50) {
    errors.push('聯絡資訊必須 3-50 字元')
  }

  // 備註
  if (data.description && data.description.length > 500) {
    errors.push('備註不能超過 500 字元')
  }

  return errors
}
```

**後端驗證**（Supabase Constraints）：
- 已在資料表中設定 CHECK 約束
- 長度限制
- 數值範圍檢查

---

### 2. XSS 防護

```typescript
// 清理使用者輸入
import DOMPurify from 'isomorphic-dompurify'

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],  // 不允許任何 HTML 標籤
    ALLOWED_ATTR: []
  })
}

// 使用範例
const cleanName = sanitizeInput(userInput.seller_name)
```

安裝套件：
```bash
npm install isomorphic-dompurify
```

---

### 3. 垃圾訊息防範

**頻率限制（Rate Limiting）**：

```typescript
// 使用 localStorage 簡易實作
class RateLimiter {
  private static KEY = 'trade_post_timestamps'
  private static MAX_POSTS = 5  // 最多 5 則
  private static WINDOW = 60 * 60 * 1000  // 1 小時

  static canPost(): boolean {
    const timestamps = this.getTimestamps()
    const now = Date.now()

    // 移除過期記錄
    const valid = timestamps.filter(t => now - t < this.WINDOW)

    if (valid.length >= this.MAX_POSTS) {
      return false
    }

    // 記錄新時間戳
    valid.push(now)
    localStorage.setItem(this.KEY, JSON.stringify(valid))
    return true
  }

  private static getTimestamps(): number[] {
    const stored = localStorage.getItem(this.KEY)
    return stored ? JSON.parse(stored) : []
  }
}

// 使用
if (!RateLimiter.canPost()) {
  alert('發布過於頻繁，請稍後再試')
  return
}
```

**內容過濾**：

```typescript
// 敏感詞過濾
const BLOCKED_WORDS = ['詐騙', '外掛', '代練']

function containsBlockedWords(text: string): boolean {
  return BLOCKED_WORDS.some(word => text.includes(word))
}
```

---

### 4. 聯絡資訊保護

**選項 A：模糊顯示**
```typescript
function maskContact(contact: string, method: ContactMethod): string {
  if (method === 'discord') {
    // Discord: user#1234 → u***#1234
    const parts = contact.split('#')
    return `${parts[0][0]}***#${parts[1]}`
  }

  if (method === 'game') {
    // 遊戲角色名：只顯示前 2 字
    return contact.slice(0, 2) + '***'
  }

  return contact
}
```

**選項 B：點擊後顯示**（推薦）
```typescript
// 初始顯示「點擊查看聯絡方式」
// 點擊後才顯示完整資訊
const [showContact, setShowContact] = useState(false)
```

---

## ⚡ 效能優化

### 1. 資料分頁

```typescript
// 無限滾動分頁
function useInfiniteScroll() {
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [trades, setTrades] = useState<TradePost[]>([])

  async function loadMore() {
    const { data, count } = await TradeAPI.getTrades({}, page, 20)

    if (data) {
      setTrades(prev => [...prev, ...data])
      setHasMore(trades.length < (count || 0))
      setPage(prev => prev + 1)
    }
  }

  return { trades, loadMore, hasMore }
}
```

---

### 2. 快取策略

```typescript
// 使用 SWR 或 React Query
import useSWR from 'swr'

function useTrades(filters: TradeFilterOptions) {
  const { data, error, mutate } = useSWR(
    ['trades', filters],
    () => TradeAPI.getTrades(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,  // 30秒內不重複請求
    }
  )

  return {
    trades: data?.data || [],
    loading: !data && !error,
    error,
    refresh: mutate
  }
}
```

安裝：
```bash
npm install swr
```

---

### 3. 圖片優化

```typescript
// 使用 Next.js Image 組件
import Image from 'next/image'

<Image
  src={getItemImageUrl(trade.item_id)}
  alt={trade.item_name}
  width={64}
  height={64}
  loading="lazy"
  placeholder="blur"
  blurDataURL="/placeholder.png"
/>
```

---

### 4. 索引優化

```sql
-- 在資料庫設定中已包含
-- 常用查詢的欄位都已建立索引
create index idx_trade_posts_item_id on public.trade_posts(item_id);
create index idx_trade_posts_status on public.trade_posts(status);
create index idx_trade_posts_created_at on public.trade_posts(created_at desc);
```

---

## 🧪 測試計畫

### 1. 功能測試清單

**發布交易**：
- [ ] 可以成功發布交易
- [ ] 必填欄位驗證正確
- [ ] 價格不能為負數
- [ ] 暱稱長度驗證
- [ ] 成功後跳轉至詳情

**瀏覽交易**：
- [ ] 可以看到所有 active 交易
- [ ] 搜尋功能正常
- [ ] 價格篩選正常
- [ ] 排序功能正常
- [ ] 點擊卡片開啟詳情

**留言功能**：
- [ ] 可以成功留言
- [ ] 留言即時顯示
- [ ] 暱稱驗證正確
- [ ] 留言數量正確顯示

**即時更新**：
- [ ] 新交易即時出現
- [ ] 新留言即時顯示
- [ ] 交易狀態更新即時反映

---

### 2. 整合測試腳本

建立 `scripts/test-trade-system.ts`：

```typescript
import { TradeAPI } from '../src/lib/trade-api'

async function testTradeSystem() {
  console.log('🧪 開始測試交易系統...\n')

  // 1. 測試建立交易
  console.log('1️⃣ 測試建立交易')
  const createResult = await TradeAPI.createTrade({
    item_id: 1002000,
    item_name: '測試物品',
    price: 1000000,
    currency: 'meso',
    quantity: 1,
    seller_name: '測試賣家',
    contact_method: 'discord',
    contact_info: 'test#1234',
    description: '這是測試交易'
  })

  if (createResult.error) {
    console.error('❌ 建立失敗:', createResult.error)
    return
  }
  console.log('✅ 建立成功:', createResult.data?.id)

  // 2. 測試查詢交易
  console.log('\n2️⃣ 測試查詢交易')
  const listResult = await TradeAPI.getTrades({})
  console.log(`✅ 找到 ${listResult.data?.length} 筆交易`)

  // 3. 測試建立留言
  console.log('\n3️⃣ 測試建立留言')
  const messageResult = await TradeAPI.createMessage({
    post_id: createResult.data!.id,
    buyer_name: '測試買家',
    message: '我想購買'
  })
  console.log('✅ 留言成功')

  // 4. 測試更新狀態
  console.log('\n4️⃣ 測試更新狀態')
  await TradeAPI.updateTradeStatus(createResult.data!.id, 'sold')
  console.log('✅ 狀態更新成功')

  console.log('\n✨ 所有測試通過！')
}

testTradeSystem()
```

執行：
```bash
npx tsx scripts/test-trade-system.ts
```

---

### 3. 使用者情境測試

**情境 1：賣家發布交易**
```
1. 開啟網站
2. 點擊「交易看板」
3. 點擊「發布交易」
4. 選擇物品（例如：屠龍刀）
5. 填寫價格：50000000
6. 選擇貨幣：楓幣
7. 填寫賣家暱稱：TestSeller
8. 選擇聯絡方式：Discord
9. 填寫 Discord：seller#1234
10. 點擊「發布」
11. ✅ 應該看到成功訊息
12. ✅ 應該跳轉至交易詳情
```

**情境 2：買家瀏覽與留言**
```
1. 開啟交易看板
2. 在搜尋框輸入「屠龍刀」
3. ✅ 應該看到剛才發布的交易
4. 點擊交易卡片
5. ✅ 應該看到詳細資訊
6. 點擊「我想購買」
7. 填寫買家暱稱：TestBuyer
8. 填寫留言：「請問還有嗎？」
9. 點擊「送出」
10. ✅ 留言應該即時顯示
```

---

## 📚 附錄

### A. 環境變數清單

```bash
# .env.local

# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Cloudflare R2 (既有設定)
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

### B. package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "test:trade": "tsx scripts/test-trade-system.ts",
    "supabase:types": "supabase gen types typescript --local > src/types/supabase.ts"
  }
}
```

---

### C. Supabase 免費方案限制

```
✅ 資料庫：500MB
✅ 檔案儲存：1GB
✅ 頻寬：5GB/月
✅ Edge Functions：500K 請求/月
✅ Realtime：200 個同時連線
✅ 資料列數：無限制

預估容量：
- 每筆交易約 1KB
- 500MB ≈ 500,000 筆交易
- 完全足夠使用
```

---

### D. 多語言鍵值

在 `src/contexts/LanguageContext.tsx` 新增：

```typescript
const translations = {
  'zh-TW': {
    // 交易系統
    'trade.title': '交易看板',
    'trade.create': '發布交易',
    'trade.search': '搜尋物品...',
    'trade.filter': '篩選',
    'trade.price': '價格',
    'trade.seller': '賣家',
    'trade.contact': '聯絡方式',
    'trade.message': '留言',
    'trade.buy': '我想購買',
    'trade.sold': '已售出',
    'trade.active': '販售中',
    'trade.cancelled': '已取消',
    // ... 更多翻譯
  },
  'en': {
    'trade.title': 'Trade Board',
    'trade.create': 'Create Trade',
    // ... 英文翻譯
  }
}
```

---

### E. 常見問題 (FAQ)

**Q: Supabase 免費方案夠用嗎？**
A: 對於中小型專案完全足夠。500MB 資料庫可以存放約 50 萬筆交易。

**Q: 需要使用者登入嗎？**
A: 不需要。使用暱稱系統，降低使用門檻。

**Q: 如何防止垃圾訊息？**
A: 前端實作頻率限制 + 敏感詞過濾 + 檢舉系統（可選）。

**Q: Realtime 會消耗很多流量嗎？**
A: WebSocket 連線非常高效，正常使用不會超過免費額度。

**Q: 資料會永久保存嗎？**
A: 預設交易 30 天後自動過期，可調整 expires_at 欄位。

---

## ✅ 完成檢查清單

### 開發前
- [ ] 閱讀完整文檔
- [ ] 建立 Supabase 專案
- [ ] 設定環境變數
- [ ] 執行資料庫 Schema

### Day 1-5
- [ ] 完成所有分階段任務
- [ ] 通過所有測試
- [ ] 修復所有已知 Bug

### 部署前
- [ ] 測試所有使用者流程
- [ ] 檢查效能指標
- [ ] 驗證安全性設定
- [ ] 準備使用說明

### 上線後
- [ ] 監控 Supabase 使用量
- [ ] 收集使用者回饋
- [ ] 持續優化改進

---

## 📞 支援資源

- [Supabase 官方文檔](https://supabase.com/docs)
- [Supabase Realtime 指南](https://supabase.com/docs/guides/realtime)
- [Next.js App Router 文檔](https://nextjs.org/docs)
- [MapleStory 專案 CLAUDE.md](./CLAUDE.md)
- [專案優化報告](./OPTIMIZATION_REPORT.md)

---

**祝開發順利！有任何問題隨時詢問。** 🚀
