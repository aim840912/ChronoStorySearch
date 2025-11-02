-- ============================================================
-- Migration: 添加購買意向 status 欄位
-- Purpose:
--   - 添加 status 欄位（如果不存在）
--   - 將所有現有記錄的 status 設為 'pending'
--   - 確保所有購買意向都有正確的狀態值
-- Date: 2025-11-02
-- Issue: 所有購買意向的狀態標籤顯示為灰色（status = undefined）
-- ============================================================

-- ============================================================
-- 添加 status 和 updated_at 欄位（如果不存在）
-- ============================================================

-- 添加 status 欄位，預設值為 'pending'
ALTER TABLE interests
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 添加 updated_at 欄位（如果不存在）
ALTER TABLE interests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 更新現有資料：將 NULL status 設為 'pending'
UPDATE interests
SET status = 'pending'
WHERE status IS NULL;

-- ============================================================
-- 驗證更新結果
-- ============================================================

-- 查詢更新後的狀態分佈（用於 log）
DO $$
DECLARE
    v_pending_count INT;
    v_contacted_count INT;
    v_completed_count INT;
    v_cancelled_count INT;
    v_total_count INT;
BEGIN
    SELECT COUNT(*) INTO v_pending_count FROM interests WHERE status = 'pending';
    SELECT COUNT(*) INTO v_contacted_count FROM interests WHERE status = 'contacted';
    SELECT COUNT(*) INTO v_completed_count FROM interests WHERE status = 'completed';
    SELECT COUNT(*) INTO v_cancelled_count FROM interests WHERE status = 'cancelled';
    SELECT COUNT(*) INTO v_total_count FROM interests;

    RAISE NOTICE '購買意向狀態分佈：';
    RAISE NOTICE '  - Pending: % 筆', v_pending_count;
    RAISE NOTICE '  - Contacted: % 筆', v_contacted_count;
    RAISE NOTICE '  - Completed: % 筆', v_completed_count;
    RAISE NOTICE '  - Cancelled: % 筆', v_cancelled_count;
    RAISE NOTICE '  - Total: % 筆', v_total_count;
END $$;

-- ============================================================
-- 初始數據同步：根據刊登狀態更新購買意向
-- ============================================================

-- 將所有「刊登非 active」對應的「意向非 completed/cancelled」設為 cancelled
-- 這確保歷史數據的一致性
DO $$
DECLARE
    v_synced_count INT;
BEGIN
    UPDATE interests
    SET
      status = 'cancelled',
      updated_at = NOW()
    WHERE status NOT IN ('completed', 'cancelled')
      AND listing_id IN (
        SELECT id FROM listings
        WHERE status != 'active'
      );

    GET DIAGNOSTICS v_synced_count = ROW_COUNT;
    RAISE NOTICE '初始數據同步完成：% 筆購買意向已根據刊登狀態更新為 cancelled', v_synced_count;
END $$;

-- ============================================================
-- 添加約束和索引
-- ============================================================

-- 添加 CHECK 約束（確保 status 值有效）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_interest_status'
        AND conrelid = 'interests'::regclass
    ) THEN
        ALTER TABLE interests
        ADD CONSTRAINT valid_interest_status CHECK (
            status IN ('pending', 'contacted', 'completed', 'cancelled')
        );
    END IF;
END $$;

-- 添加 NOT NULL 約束（確保未來不會再出現 NULL 值）
ALTER TABLE interests
ALTER COLUMN status SET NOT NULL;

-- 添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_interests_status
ON interests(buyer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interests_listing_status
ON interests(listing_id, status, created_at DESC);

COMMENT ON COLUMN interests.status IS '意向狀態：pending、contacted、completed、cancelled（NOT NULL，預設 pending）';

-- ============================================================
-- 完成提示
-- ============================================================

-- Migration 023: Add Interests Status Column
-- Created: 2025-11-02
-- Description:
--   - 添加 interests.status 欄位（如果不存在）
--   - 將所有現有記錄的 status 設為 'pending'（預設狀態）
--   - 添加 CHECK 約束（確保值為 pending/contacted/completed/cancelled）
--   - 添加 NOT NULL 約束（防止未來出現 NULL 值）
--   - 添加索引優化查詢效能
--
-- 預期結果：
--   - interests 表包含 status 欄位
--   - 所有購買意向都有有效的 status 值（預設為 'pending'）
--   - 前端狀態標籤將正確顯示顏色（黃色、藍色、綠色、灰色）
--   - status 欄位永遠不會是 NULL
--   - 查詢效能得到優化（透過索引）
--
-- 注意：
--   此 migration 修復了 Migration 001 中定義但未實際執行的 status 欄位
