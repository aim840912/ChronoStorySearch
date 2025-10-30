/**
 * Migration: 016_add_discord_membership_cache
 *
 * 目的：修復缺失的 Discord 伺服器成員快取欄位
 *
 * 問題描述：
 * - discord-verification.ts 程式碼使用了 is_server_member 和 server_member_checked_at 欄位
 * - 但這些欄位在資料庫 schema 中不存在（只有 server_member_since）
 * - 導致資料庫查詢可能失敗
 *
 * 解決方案：
 * - 新增 is_server_member (BOOLEAN) 欄位 - 快取使用者是否為伺服器成員
 * - 新增 server_member_checked_at (TIMESTAMPTZ) 欄位 - 記錄最後檢查時間
 * - 新增索引以優化快取查詢效能（24 小時 TTL 檢查）
 */

-- ============================================================
-- 1. 新增 is_server_member 欄位（快取成員狀態）
-- ============================================================

-- 檢查欄位是否已存在，避免重複新增
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discord_profiles'
    AND column_name = 'is_server_member'
  ) THEN
    -- 新增欄位：是否為伺服器成員（快取用）
    ALTER TABLE discord_profiles
      ADD COLUMN is_server_member BOOLEAN DEFAULT NULL;

    RAISE NOTICE 'Added column: is_server_member';
  ELSE
    RAISE NOTICE 'Column is_server_member already exists, skipping';
  END IF;
END $$;

-- ============================================================
-- 2. 新增 server_member_checked_at 欄位（快取檢查時間）
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discord_profiles'
    AND column_name = 'server_member_checked_at'
  ) THEN
    -- 新增欄位：最後檢查成員資格的時間（快取用）
    ALTER TABLE discord_profiles
      ADD COLUMN server_member_checked_at TIMESTAMPTZ DEFAULT NULL;

    RAISE NOTICE 'Added column: server_member_checked_at';
  ELSE
    RAISE NOTICE 'Column server_member_checked_at already exists, skipping';
  END IF;
END $$;

-- ============================================================
-- 3. 新增索引以優化快取查詢
-- ============================================================

-- 檢查索引是否已存在，避免重複建立
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_discord_profiles_membership_cache'
  ) THEN
    -- 建立複合索引：優化快取有效性查詢
    -- 用於快速檢查快取是否在 24 小時內有效
    CREATE INDEX idx_discord_profiles_membership_cache
      ON discord_profiles(user_id, server_member_checked_at)
      WHERE server_member_checked_at IS NOT NULL;

    RAISE NOTICE 'Created index: idx_discord_profiles_membership_cache';
  ELSE
    RAISE NOTICE 'Index idx_discord_profiles_membership_cache already exists, skipping';
  END IF;
END $$;

-- ============================================================
-- 4. 更新現有資料（遷移 server_member_since 資料）
-- ============================================================

-- 如果已有 server_member_since 資料，推斷為成員並設定檢查時間
UPDATE discord_profiles
SET
  is_server_member = TRUE,
  server_member_checked_at = updated_at  -- 使用 updated_at 作為檢查時間
WHERE server_member_since IS NOT NULL
  AND is_server_member IS NULL;  -- 只更新尚未設定的記錄

-- ============================================================
-- 5. 分析表以更新統計資訊
-- ============================================================

-- 更新統計資訊，幫助查詢優化器選擇最佳執行計劃
ANALYZE discord_profiles;

-- ============================================================
-- 6. 註解說明
-- ============================================================

COMMENT ON COLUMN discord_profiles.is_server_member IS
  '快取：使用者是否為 Discord 伺服器成員（24 小時 TTL）';

COMMENT ON COLUMN discord_profiles.server_member_checked_at IS
  '快取：最後檢查成員資格的時間（用於判斷快取是否過期）';

COMMENT ON INDEX idx_discord_profiles_membership_cache IS
  '優化 Discord 成員快取查詢（user_id + server_member_checked_at 複合索引）';
