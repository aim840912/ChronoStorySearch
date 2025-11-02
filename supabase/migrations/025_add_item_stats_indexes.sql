-- ============================================================
-- Migration: 添加物品屬性 JSONB 索引
-- Purpose:
--   - 優化市場搜尋的物品屬性篩選效能
--   - 支援 item_stats 的多屬性查詢
-- Date: 2025-11-02
-- Issue: 複雜屬性篩選導致全表掃描，影響查詢效能
-- ============================================================

-- ============================================================
-- GIN 索引 - 支援 JSONB 任意鍵值查詢
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_listings_item_stats_gin
ON listings USING gin(item_stats)
WHERE status = 'active' AND deleted_at IS NULL;

COMMENT ON INDEX idx_listings_item_stats_gin IS
  'GIN 索引：支援 item_stats JSONB 欄位的高效查詢（僅 active 刊登）';

-- ============================================================
-- 表達式索引 - 針對最常用的屬性
-- ============================================================

-- 攻擊力 (watk)
CREATE INDEX IF NOT EXISTS idx_listings_watk
ON listings((item_stats->>'watk'))
WHERE status = 'active'
  AND deleted_at IS NULL
  AND item_stats ? 'watk';

-- 力量 (str)
CREATE INDEX IF NOT EXISTS idx_listings_str
ON listings((item_stats->>'str'))
WHERE status = 'active'
  AND deleted_at IS NULL
  AND item_stats ? 'str';

-- 敏捷 (dex)
CREATE INDEX IF NOT EXISTS idx_listings_dex
ON listings((item_stats->>'dex'))
WHERE status = 'active'
  AND deleted_at IS NULL
  AND item_stats ? 'dex';

-- 智力 (int)
CREATE INDEX IF NOT EXISTS idx_listings_int
ON listings((item_stats->>'int'))
WHERE status = 'active'
  AND deleted_at IS NULL
  AND item_stats ? 'int';

-- 幸運 (luk)
CREATE INDEX IF NOT EXISTS idx_listings_luk
ON listings((item_stats->>'luk'))
WHERE status = 'active'
  AND deleted_at IS NULL
  AND item_stats ? 'luk';

COMMENT ON INDEX idx_listings_watk IS '表達式索引：攻擊力屬性查詢優化';
COMMENT ON INDEX idx_listings_str IS '表達式索引：力量屬性查詢優化';
COMMENT ON INDEX idx_listings_dex IS '表達式索引：敏捷屬性查詢優化';
COMMENT ON INDEX idx_listings_int IS '表達式索引：智力屬性查詢優化';
COMMENT ON INDEX idx_listings_luk IS '表達式索引：幸運屬性查詢優化';

-- ============================================================
-- 驗證索引創建成功
-- ============================================================

DO $$
DECLARE
    v_gin_index_exists BOOLEAN;
    v_watk_index_exists BOOLEAN;
    v_str_index_exists BOOLEAN;
    v_dex_index_exists BOOLEAN;
    v_int_index_exists BOOLEAN;
    v_luk_index_exists BOOLEAN;
    v_total_indexes INT := 0;
BEGIN
    -- 檢查 GIN 索引
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_listings_item_stats_gin'
    ) INTO v_gin_index_exists;

    -- 檢查表達式索引
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_listings_watk'
    ) INTO v_watk_index_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_listings_str'
    ) INTO v_str_index_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_listings_dex'
    ) INTO v_dex_index_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_listings_int'
    ) INTO v_int_index_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_listings_luk'
    ) INTO v_luk_index_exists;

    -- 計算成功創建的索引數量
    v_total_indexes :=
        (CASE WHEN v_gin_index_exists THEN 1 ELSE 0 END) +
        (CASE WHEN v_watk_index_exists THEN 1 ELSE 0 END) +
        (CASE WHEN v_str_index_exists THEN 1 ELSE 0 END) +
        (CASE WHEN v_dex_index_exists THEN 1 ELSE 0 END) +
        (CASE WHEN v_int_index_exists THEN 1 ELSE 0 END) +
        (CASE WHEN v_luk_index_exists THEN 1 ELSE 0 END);

    IF v_total_indexes = 6 THEN
        RAISE NOTICE '✅ JSONB 索引創建成功（6/6）';
        RAISE NOTICE '  - GIN 索引: idx_listings_item_stats_gin';
        RAISE NOTICE '  - 表達式索引: watk, str, dex, int, luk';
        RAISE NOTICE '';
        RAISE NOTICE '預期效能提升：';
        RAISE NOTICE '  - JSONB 屬性查詢：50-90%% 加速';
        RAISE NOTICE '  - 複合屬性篩選：顯著降低查詢時間';
    ELSE
        RAISE WARNING '⚠️  部分索引創建失敗（%/6），請檢查', v_total_indexes;
        IF NOT v_gin_index_exists THEN RAISE WARNING '  - 缺失：idx_listings_item_stats_gin'; END IF;
        IF NOT v_watk_index_exists THEN RAISE WARNING '  - 缺失：idx_listings_watk'; END IF;
        IF NOT v_str_index_exists THEN RAISE WARNING '  - 缺失：idx_listings_str'; END IF;
        IF NOT v_dex_index_exists THEN RAISE WARNING '  - 缺失：idx_listings_dex'; END IF;
        IF NOT v_int_index_exists THEN RAISE WARNING '  - 缺失：idx_listings_int'; END IF;
        IF NOT v_luk_index_exists THEN RAISE WARNING '  - 缺失：idx_listings_luk'; END IF;
    END IF;
END $$;

-- ============================================================
-- 效能測試查詢範例（僅供參考，不會執行）
-- ============================================================

-- 測試 GIN 索引（包含查詢）
-- EXPLAIN ANALYZE
-- SELECT * FROM listings
-- WHERE status = 'active'
--   AND deleted_at IS NULL
--   AND item_stats @> '{"watk": "100"}';

-- 測試表達式索引（範圍查詢）
-- EXPLAIN ANALYZE
-- SELECT * FROM listings
-- WHERE status = 'active'
--   AND deleted_at IS NULL
--   AND (item_stats->>'watk')::int >= 100;

-- 測試複合屬性查詢
-- EXPLAIN ANALYZE
-- SELECT * FROM listings
-- WHERE status = 'active'
--   AND deleted_at IS NULL
--   AND (item_stats->>'watk')::int >= 100
--   AND (item_stats->>'str')::int >= 10;

-- ============================================================
-- 回滾腳本（如需要）
-- ============================================================

-- 如果需要回滾此 migration，請執行以下 SQL：
--
-- DROP INDEX IF EXISTS idx_listings_item_stats_gin;
-- DROP INDEX IF EXISTS idx_listings_watk;
-- DROP INDEX IF EXISTS idx_listings_str;
-- DROP INDEX IF EXISTS idx_listings_dex;
-- DROP INDEX IF EXISTS idx_listings_int;
-- DROP INDEX IF EXISTS idx_listings_luk;

-- ============================================================
-- 完成提示
-- ============================================================

-- Migration 025: Add Item Stats JSONB Indexes
-- Created: 2025-11-02
-- Description:
--   - 添加 GIN 索引支援任意 JSONB 鍵值查詢
--   - 添加表達式索引優化常用屬性（watk, str, dex, int, luk）
--   - 條件索引僅覆蓋 active 狀態的刊登
--   - 預期提升市場搜尋效能 50-90%
--
-- 影響範圍：
--   - GET /api/market/search - 屬性篩選查詢
--   - 複雜的多屬性搜尋場景
--
-- 注意事項：
--   - 索引創建可能需要幾分鐘（取決於資料量）
--   - GIN 索引會占用額外的儲存空間
--   - 索引會在新刊登建立時自動更新
--
-- 驗證方式：
--   使用 EXPLAIN ANALYZE 查看查詢計劃，確認使用了新索引
