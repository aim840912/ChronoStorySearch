-- ============================================================
-- Migration: 新增刊登過期時間功能
-- Purpose:
--   1. 新增 expires_at 欄位到 listings 表
--   2. 為現有刊登設定過期時間（created_at + 30 天）
--   3. 新增索引優化過期查詢效能
-- Date: 2025-10-30
-- ============================================================

-- ============================================================
-- 步驟 1: 新增過期時間欄位
-- ============================================================
ALTER TABLE listings
ADD COLUMN expires_at TIMESTAMPTZ;

COMMENT ON COLUMN listings.expires_at IS '刊登過期時間（NULL 表示永不過期）';

-- ============================================================
-- 步驟 2: 為現有活躍刊登設定過期時間
-- ============================================================
-- 為所有 status='active' 的現有刊登設定過期時間為 created_at + 30 天
UPDATE listings
SET expires_at = created_at + INTERVAL '30 days'
WHERE status = 'active'
  AND expires_at IS NULL;

-- 為已經完成、取消、過期的刊登不設定過期時間（保持 NULL）
-- 這樣它們不會被自動過期檢查影響

-- ============================================================
-- 步驟 3: 新增索引優化過期查詢
-- ============================================================

-- 索引 1: 查詢即將過期的活躍刊登
-- 用途：自動過期檢查、過期警告
CREATE INDEX idx_listings_expires_at
  ON listings(expires_at, status)
  WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

-- 索引 2: 查詢活躍且未過期的刊登（市場搜尋最常用）
CREATE INDEX idx_listings_active_not_expired
  ON listings(status, expires_at, created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

COMMENT ON INDEX idx_listings_expires_at IS '優化過期檢查查詢（過期時間 + 狀態）';
COMMENT ON INDEX idx_listings_active_not_expired IS '優化市場搜尋（活躍 + 未過期 + 建立時間排序）';

-- ============================================================
-- 步驟 4: 建立自動計算過期時間的函數（選用）
-- ============================================================

-- 此函數可在應用層使用，計算新刊登的過期時間
-- 參數：expiration_days（過期天數，預設 30）
-- 返回：過期時間戳

CREATE OR REPLACE FUNCTION calculate_listing_expiration(expiration_days INT DEFAULT 30)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT NOW() + (expiration_days || ' days')::INTERVAL;
$$;

COMMENT ON FUNCTION calculate_listing_expiration IS '計算刊登過期時間（NOW() + N 天）';

-- 使用範例：
-- SELECT calculate_listing_expiration(30); -- 返回 30 天後的時間戳
-- SELECT calculate_listing_expiration(7);  -- 返回 7 天後的時間戳

-- ============================================================
-- 完成提示
-- ============================================================

-- Migration 011: Add Listing Expiration
-- Created: 2025-10-30
-- Description:
--   - 新增 expires_at TIMESTAMPTZ 欄位
--   - 為現有活躍刊登設定過期時間（30 天）
--   - 新增兩個索引優化過期查詢效能
--   - 建立計算過期時間的輔助函數

-- 預期結果：
--   - 所有 status='active' 的刊登都有 expires_at
--   - 已完成/取消的刊登 expires_at 為 NULL
--   - 查詢過期刊登的效能提升
