-- =====================================================
-- ChronoStory Search - User Preferences Table
--
-- 執行方式：
-- 1. 前往 Supabase Dashboard
-- 2. 點擊 SQL Editor
-- 3. 貼上此 SQL 並執行
-- =====================================================

-- 建立 user_preferences 表格
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本設定
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'zh-TW')),
  image_format TEXT DEFAULT 'png' CHECK (image_format IN ('png', 'stand', 'hit', 'die')),

  -- 收藏資料（使用 JSONB 儲存陣列）
  favorite_monsters JSONB DEFAULT '[]'::jsonb,
  favorite_items JSONB DEFAULT '[]'::jsonb,

  -- 怪物屬性顯示設定
  monster_stats_view_mode TEXT DEFAULT 'grid',
  monster_stats_order JSONB DEFAULT '[]'::jsonb,
  monster_stats_visible JSONB DEFAULT '[]'::jsonb,

  -- 物品屬性顯示設定
  item_stats_view_mode TEXT DEFAULT 'grid',
  item_stats_order JSONB DEFAULT '[]'::jsonb,
  item_stats_visible JSONB DEFAULT '[]'::jsonb,
  item_stats_show_max_only BOOLEAN DEFAULT false,

  -- 物品掉落來源顯示設定
  item_sources_view_mode TEXT DEFAULT 'grid',

  -- 怪物掉落顯示設定
  monster_drops_view_mode TEXT DEFAULT 'grid',
  monster_drops_show_max_only BOOLEAN DEFAULT false,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 確保每個用戶只有一筆記錄
  UNIQUE(user_id)
);

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- 啟用 Row Level Security (RLS)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS 規則：用戶只能存取自己的資料
CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON user_preferences FOR DELETE
USING (auth.uid() = user_id);

-- 自動更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 驗證表格建立成功
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

-- =====================================================
-- Migration: 新增怪物/物品屬性顯示設定欄位
-- 執行時機：已有 user_preferences 表時執行
-- =====================================================

-- ALTER TABLE user_preferences
-- ADD COLUMN IF NOT EXISTS monster_stats_view_mode TEXT DEFAULT 'grid',
-- ADD COLUMN IF NOT EXISTS monster_stats_order JSONB DEFAULT '[]'::jsonb,
-- ADD COLUMN IF NOT EXISTS monster_stats_visible JSONB DEFAULT '[]'::jsonb,
-- ADD COLUMN IF NOT EXISTS item_stats_view_mode TEXT DEFAULT 'grid',
-- ADD COLUMN IF NOT EXISTS item_stats_order JSONB DEFAULT '[]'::jsonb,
-- ADD COLUMN IF NOT EXISTS item_stats_visible JSONB DEFAULT '[]'::jsonb,
-- ADD COLUMN IF NOT EXISTS item_stats_show_max_only BOOLEAN DEFAULT false;

-- =====================================================
-- Migration: 新增掉落來源顯示設定欄位
-- 執行時機：已有 user_preferences 表時執行
-- =====================================================

-- ALTER TABLE user_preferences
-- ADD COLUMN IF NOT EXISTS item_sources_view_mode TEXT DEFAULT 'grid',
-- ADD COLUMN IF NOT EXISTS monster_drops_view_mode TEXT DEFAULT 'grid',
-- ADD COLUMN IF NOT EXISTS monster_drops_show_max_only BOOLEAN DEFAULT false;
