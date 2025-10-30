/**
 * Migration: 013_optimize_indexes
 *
 * 目的：優化刊登查詢效能
 *
 * 新增索引：
 * 1. idx_listings_active_unexpired - 優化查詢 active 刊登
 *    注意：不在索引層過濾過期時間（NOW() 不是 IMMUTABLE），由查詢層處理
 * 2. idx_listing_wanted_items_item_listing - 優化交換匹配查詢
 */

-- ================================================
-- 1. 優化刊登查詢索引（查詢 active 且未過期的刊登）
-- ================================================

-- 檢查索引是否已存在，避免重複建立
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_listings_active_unexpired'
  ) THEN
    -- 注意：移除 expires_at > NOW() 條件，因為 NOW() 不是 IMMUTABLE 函數
    -- 過期時間過濾由應用層查詢時處理
    CREATE INDEX idx_listings_active_unexpired
      ON listings(status, expires_at NULLS LAST, created_at DESC)
      WHERE status = 'active'
        AND deleted_at IS NULL;

    RAISE NOTICE 'Created index: idx_listings_active_unexpired';
  ELSE
    RAISE NOTICE 'Index idx_listings_active_unexpired already exists, skipping';
  END IF;
END $$;

-- ================================================
-- 2. 優化交換匹配查詢索引
-- ================================================

-- 檢查索引是否已存在，避免重複建立
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_listing_wanted_items_item_listing'
  ) THEN
    CREATE INDEX idx_listing_wanted_items_item_listing
      ON listing_wanted_items(item_id, listing_id)
      WHERE item_id IS NOT NULL;

    RAISE NOTICE 'Created index: idx_listing_wanted_items_item_listing';
  ELSE
    RAISE NOTICE 'Index idx_listing_wanted_items_item_listing already exists, skipping';
  END IF;
END $$;

-- ================================================
-- 3. 分析表以更新統計資訊
-- ================================================

-- 更新統計資訊，幫助查詢優化器選擇最佳執行計劃
ANALYZE listings;
ANALYZE listing_wanted_items;

-- ================================================
-- 4. 註解說明
-- ================================================

COMMENT ON INDEX idx_listings_active_unexpired IS
  '優化查詢 active 刊登（包含狀態、過期時間、建立時間）。注意：過期時間過濾由查詢層處理，因為 NOW() 不是 IMMUTABLE 函數';

COMMENT ON INDEX idx_listing_wanted_items_item_listing IS
  '優化交換匹配查詢（根據想要的物品 ID 查找刊登）';
