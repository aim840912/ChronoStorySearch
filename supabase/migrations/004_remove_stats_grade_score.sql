-- ============================================================
-- MapleStory Trading System - Remove Stats Grade & Score
-- 移除 listings 表中的素質等級和分數欄位
-- ============================================================

-- Migration 004: Remove stats_grade and stats_score columns
-- Created: 2025-10-28
-- Description: 完全移除市場刊登系統中的素質等級（stats_grade）和素質分數（stats_score）功能
--
-- 變更內容：
-- 1. 移除 stats_grade 欄位（VARCHAR 類型，用於儲存 S/A/B/C/D/F 等級）
-- 2. 移除 stats_score 欄位（INTEGER 類型，用於儲存素質分數）
-- 3. 移除相關索引（idx_listings_stats_grade、idx_listings_stats_score、idx_listings_stats_grade_score）
--
-- 原因：
-- - 簡化市場篩選功能
-- - 移除複雜的素質計算邏輯
-- - 提升系統維護性

-- ============================================================
-- 1. 移除相關索引（如果存在）
-- ============================================================

-- 移除素質等級索引
DROP INDEX IF EXISTS idx_listings_stats_grade;

-- 移除素質分數索引
DROP INDEX IF EXISTS idx_listings_stats_score;

-- 移除複合索引（等級+分數）
DROP INDEX IF EXISTS idx_listings_stats_grade_score;

COMMENT ON TABLE listings IS '已移除索引: idx_listings_stats_grade, idx_listings_stats_score';

-- ============================================================
-- 2. 移除欄位（如果存在）
-- ============================================================

-- 移除素質等級欄位
ALTER TABLE listings
DROP COLUMN IF EXISTS stats_grade;

-- 移除素質分數欄位
ALTER TABLE listings
DROP COLUMN IF EXISTS stats_score;

COMMENT ON TABLE listings IS '已移除欄位: stats_grade (素質等級), stats_score (素質分數)';

-- ============================================================
-- 3. 驗證變更
-- ============================================================

-- 檢查欄位是否已被移除（此查詢應該返回 0 行）
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'listings'
--   AND column_name IN ('stats_grade', 'stats_score');

-- 檢查索引是否已被移除（此查詢應該返回 0 行）
-- SELECT indexname
-- FROM pg_indexes
-- WHERE tablename = 'listings'
--   AND indexname LIKE '%stats_%';

-- ============================================================
-- 完成提示
-- ============================================================

-- Migration 004: Remove stats_grade and stats_score
-- Status: Complete
-- Affected Table: listings
-- Removed Columns: stats_grade, stats_score
-- Removed Indexes: idx_listings_stats_grade, idx_listings_stats_score, idx_listings_stats_grade_score
