-- ===================================================================
-- 物品屬性系統 - SQL Migration
-- ===================================================================
-- 目的：為 listings 表新增物品屬性欄位，支援記錄物品素質
-- 日期：2025-10-27
-- ===================================================================

-- ===================================================================
-- 第 1 步：新增欄位
-- ===================================================================

-- 新增物品屬性欄位（JSONB 格式，支援靈活查詢）
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS item_stats JSONB DEFAULT NULL;

-- 新增素質等級欄位（S/A/B/C/D/F）
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS stats_grade VARCHAR(1) CHECK (stats_grade IN ('S', 'A', 'B', 'C', 'D', 'F'));

-- 新增素質分數欄位（0-100）
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS stats_score INTEGER CHECK (stats_score >= 0 AND stats_score <= 100);

-- 新增註釋
COMMENT ON COLUMN listings.item_stats IS '物品實際屬性（JSONB格式，包含 watk, matk, str 等）';
COMMENT ON COLUMN listings.stats_grade IS '素質等級（S=完美, A=極品, B=優秀, C=中等, D=普通, F=極差）';
COMMENT ON COLUMN listings.stats_score IS '素質分數（0-100，根據實際值/最大值計算）';

-- ===================================================================
-- 第 2 步：建立索引
-- ===================================================================

-- 1. GIN 索引：支援 JSONB 全文查詢
CREATE INDEX IF NOT EXISTS idx_listings_item_stats_gin
ON listings USING GIN (item_stats);

-- 2. 部分索引：加速高攻擊力武器查詢（watk >= 80）
CREATE INDEX IF NOT EXISTS idx_listings_high_watk
ON listings (CAST(item_stats->>'watk' AS INTEGER))
WHERE CAST(item_stats->>'watk' AS INTEGER) >= 80;

-- 3. 部分索引：加速高魔攻武器查詢（matk >= 80）
CREATE INDEX IF NOT EXISTS idx_listings_high_matk
ON listings (CAST(item_stats->>'matk' AS INTEGER))
WHERE CAST(item_stats->>'matk' AS INTEGER) >= 80;

-- 4. 複合索引：加速素質等級 + 分數排序查詢
CREATE INDEX IF NOT EXISTS idx_listings_grade_score
ON listings (stats_grade, stats_score DESC)
WHERE stats_grade IS NOT NULL;

-- 5. 部分索引：加速極品物品查詢（S/A 等級）
CREATE INDEX IF NOT EXISTS idx_listings_high_grade
ON listings (stats_grade, created_at DESC)
WHERE stats_grade IN ('S', 'A');

-- ===================================================================
-- 第 3 步：範例資料（可選，用於測試）
-- ===================================================================

-- 範例 1：極品屠龍者（攻擊 95/97）
COMMENT ON TABLE listings IS '
範例物品屬性格式:
{
  "watk": 95,           // 實際物理攻擊
  "watk_max": 97,       // 最大物理攻擊
  "str": 5,             // 實際力量
  "str_max": 5,         // 最大力量
  "dex": 5,             // 實際敏捷
  "dex_max": 5,         // 最大敏捷
  "slots": 7,           // 可升級次數
  "scrolled": 0,        // 已使用次數
  "notes": "已打 10% 攻擊卷"  // 備註
}
';

-- ===================================================================
-- 第 4 步：驗證與測試
-- ===================================================================

-- 測試 1：查詢所有有屬性的刊登
-- SELECT id, item_id, item_stats, stats_grade, stats_score
-- FROM listings
-- WHERE item_stats IS NOT NULL;

-- 測試 2：查詢攻擊力 >= 90 的武器
-- SELECT id, item_id,
--        item_stats->>'watk' as watk,
--        item_stats->>'watk_max' as watk_max,
--        stats_grade
-- FROM listings
-- WHERE CAST(item_stats->>'watk' AS INTEGER) >= 90;

-- 測試 3：查詢 S/A 等級物品，依分數排序
-- SELECT id, item_id, stats_grade, stats_score, created_at
-- FROM listings
-- WHERE stats_grade IN ('S', 'A')
-- ORDER BY stats_score DESC, created_at DESC;

-- 測試 4：統計各等級物品數量
-- SELECT stats_grade, COUNT(*) as count
-- FROM listings
-- WHERE stats_grade IS NOT NULL
-- GROUP BY stats_grade
-- ORDER BY stats_grade;

-- ===================================================================
-- 第 5 步：效能驗證
-- ===================================================================

-- 查詢計劃分析（確認索引被使用）
-- EXPLAIN ANALYZE
-- SELECT * FROM listings
-- WHERE CAST(item_stats->>'watk' AS INTEGER) >= 90
-- ORDER BY stats_score DESC
-- LIMIT 20;

-- ===================================================================
-- Rollback（如需回滾）
-- ===================================================================

-- 警告：以下指令會刪除所有屬性資料，僅在測試環境執行！
/*
DROP INDEX IF EXISTS idx_listings_item_stats_gin;
DROP INDEX IF EXISTS idx_listings_high_watk;
DROP INDEX IF EXISTS idx_listings_high_matk;
DROP INDEX IF EXISTS idx_listings_grade_score;
DROP INDEX IF EXISTS idx_listings_high_grade;

ALTER TABLE listings DROP COLUMN IF EXISTS item_stats;
ALTER TABLE listings DROP COLUMN IF EXISTS stats_grade;
ALTER TABLE listings DROP COLUMN IF EXISTS stats_score;
*/

-- ===================================================================
-- 完成
-- ===================================================================
-- ✅ 欄位新增完成
-- ✅ 索引建立完成
-- ✅ 註釋新增完成
-- ✅ 測試查詢準備完成
--
-- 下一步：執行此 SQL 到 Supabase SQL Editor
-- ===================================================================
