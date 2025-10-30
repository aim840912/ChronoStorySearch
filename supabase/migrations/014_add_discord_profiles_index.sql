/**
 * Migration: 014_add_discord_profiles_index
 *
 * 目的：優化 discord_profiles 表的查詢效能
 *
 * 新增索引：
 * 1. idx_discord_profiles_user_id - 優化透過 user_id JOIN 查詢信譽分數
 *
 * 影響範圍：
 * - /api/market/search - JOIN discord_profiles 獲取賣家信譽
 * - /api/market/exchange-matches - JOIN discord_profiles 獲取信譽加分
 * - /api/listings/[id] - JOIN discord_profiles 獲取賣家信譽
 */

-- ================================================
-- 1. 優化 discord_profiles 的 user_id 索引
-- ================================================

-- 檢查索引是否已存在，避免重複建立
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_discord_profiles_user_id'
  ) THEN
    -- 為 user_id 建立索引，優化 JOIN 查詢
    CREATE INDEX idx_discord_profiles_user_id
      ON discord_profiles(user_id)
      WHERE user_id IS NOT NULL;

    RAISE NOTICE 'Created index: idx_discord_profiles_user_id';
  ELSE
    RAISE NOTICE 'Index idx_discord_profiles_user_id already exists, skipping';
  END IF;
END $$;

-- ================================================
-- 2. 分析表以更新統計資訊
-- ================================================

-- 更新統計資訊，幫助查詢優化器選擇最佳執行計劃
ANALYZE discord_profiles;

-- ================================================
-- 3. 註解說明
-- ================================================

COMMENT ON INDEX idx_discord_profiles_user_id IS
  '優化透過 user_id JOIN 查詢 discord_profiles 表（用於獲取使用者信譽分數）';
