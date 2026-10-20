-- =====================================================
-- ChronoStory Search - Trade & Report Tables
--
-- 內容：trade_listings / trade_favorites / trade_blacklist / reports
--       的表格、約束、索引與 RLS 規則
-- 來源：2026-10-20 從線上資料庫的 pg_catalog 匯出（快照，不是 migration）
--       線上若有改動，請重新匯出並更新此檔
--
-- 執行方式：
-- 1. 前往 Supabase Dashboard
-- 2. 點擊 SQL Editor
-- 3. 貼上此 SQL 並執行（可重複執行：表格與索引用 IF NOT EXISTS，
--    policy 先 DROP 再建立）
-- =====================================================


-- =====================================================
-- 交易刊登
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trade_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- 刊登內容
  type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price BIGINT NOT NULL,
  equipment_stats JSONB,
  note TEXT,

  -- 聯絡方式
  discord_username TEXT NOT NULL,
  character_name TEXT NOT NULL,

  -- 狀態
  status TEXT NOT NULL DEFAULT 'active',
  is_verified BOOLEAN DEFAULT false,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT trade_listings_pkey PRIMARY KEY (id),
  CONSTRAINT trade_listings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT trade_listings_type_check CHECK (type IN ('sell', 'buy')),
  CONSTRAINT trade_listings_status_check
    CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  CONSTRAINT trade_listings_quantity_check CHECK (quantity > 0),
  CONSTRAINT trade_listings_price_check CHECK (price > 0)
);

CREATE INDEX IF NOT EXISTS idx_trade_listings_user_id ON public.trade_listings (user_id);
CREATE INDEX IF NOT EXISTS idx_trade_listings_item_id ON public.trade_listings (item_id);
CREATE INDEX IF NOT EXISTS idx_trade_listings_type ON public.trade_listings (type);
CREATE INDEX IF NOT EXISTS idx_trade_listings_status ON public.trade_listings (status);
CREATE INDEX IF NOT EXISTS idx_trade_listings_expires_at ON public.trade_listings (expires_at);

ALTER TABLE public.trade_listings ENABLE ROW LEVEL SECURITY;

-- 未登入也能看進行中、未過期的刊登
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.trade_listings;
CREATE POLICY "Anyone can view active listings"
ON public.trade_listings FOR SELECT
USING (status = 'active' AND expires_at > NOW());

-- 自己的刊登（含已完成 / 已過期）
DROP POLICY IF EXISTS "Users can view own listings" ON public.trade_listings;
CREATE POLICY "Users can view own listings"
ON public.trade_listings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create listings" ON public.trade_listings;
CREATE POLICY "Users can create listings"
ON public.trade_listings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 未寫 WITH CHECK：Postgres 會沿用 USING 檢查更新後的資料
DROP POLICY IF EXISTS "Users can update own listings" ON public.trade_listings;
CREATE POLICY "Users can update own listings"
ON public.trade_listings FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own listings" ON public.trade_listings;
CREATE POLICY "Users can delete own listings"
ON public.trade_listings FOR DELETE
USING (auth.uid() = user_id);


-- =====================================================
-- 交易收藏（依賴 trade_listings，需在其後建立）
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trade_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT trade_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT trade_favorites_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT trade_favorites_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.trade_listings(id) ON DELETE CASCADE,
  -- 同一則刊登只能收藏一次
  CONSTRAINT trade_favorites_user_id_listing_id_key UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_favorites_user_id ON public.trade_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_trade_favorites_listing_id ON public.trade_favorites (listing_id);

ALTER TABLE public.trade_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.trade_favorites;
CREATE POLICY "Users can view own favorites"
ON public.trade_favorites FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create favorites" ON public.trade_favorites;
CREATE POLICY "Users can create favorites"
ON public.trade_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON public.trade_favorites;
CREATE POLICY "Users can delete own favorites"
ON public.trade_favorites FOR DELETE
USING (auth.uid() = user_id);


-- =====================================================
-- 交易黑名單（以 Discord 帳號封鎖）
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trade_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  blocked_discord_username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT trade_blacklist_pkey PRIMARY KEY (id),
  CONSTRAINT trade_blacklist_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT trade_blacklist_user_id_blocked_discord_username_key
    UNIQUE (user_id, blocked_discord_username)
);

CREATE INDEX IF NOT EXISTS idx_trade_blacklist_user_id ON public.trade_blacklist (user_id);

ALTER TABLE public.trade_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blacklist" ON public.trade_blacklist;
CREATE POLICY "Users can view own blacklist"
ON public.trade_blacklist FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own blacklist" ON public.trade_blacklist;
CREATE POLICY "Users can add to own blacklist"
ON public.trade_blacklist FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from own blacklist" ON public.trade_blacklist;
CREATE POLICY "Users can remove from own blacklist"
ON public.trade_blacklist FOR DELETE
USING (auth.uid() = user_id);


-- =====================================================
-- 檢舉（影片檢舉外掛角色，由 reviewer 審核）
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid(),

  -- 檢舉內容
  video_url TEXT NOT NULL,
  reported_character TEXT NOT NULL,
  description TEXT,
  report_type TEXT DEFAULT 'botting',

  -- 檢舉人（刪除帳號時不連帶刪除檢舉，故無 ON DELETE CASCADE）
  reporter_id UUID,
  reporter_discord TEXT NOT NULL,

  -- 審核
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
  CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports (created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- reviewer 角色存在 app_metadata（只有 service role 能改，使用者無法自行升級）
DROP POLICY IF EXISTS "Reviewers can view all reports" ON public.reports;
CREATE POLICY "Reviewers can view all reports"
ON public.reports FOR SELECT TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer');

DROP POLICY IF EXISTS "Reviewers can update reports" ON public.reports;
CREATE POLICY "Reviewers can update reports"
ON public.reports FOR UPDATE TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer');

-- 註：updated_at 沒有觸發器自動更新（線上匯出時 4 張表皆無 trigger），
--     由應用程式在更新時寫入
