-- ============================================================
-- Migration: 購買意向狀態自動同步刊登狀態
-- Purpose:
--   - 當刊登狀態變更時，自動更新相關購買意向的狀態
--   - 使用 PostgreSQL 觸發器確保資料一致性
-- Date: 2025-11-02
-- Issue: 使用者希望當刊登變為「已售出」或「已取消」時，購買意向自動同步
-- ============================================================

-- ============================================================
-- 觸發器函數：同步購買意向狀態
-- ============================================================

CREATE OR REPLACE FUNCTION sync_interests_on_listing_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ========================================
  -- 規則 1：只在 UPDATE 操作時執行
  -- ========================================
  IF (TG_OP != 'UPDATE') THEN
    RETURN NEW;
  END IF;

  -- ========================================
  -- 規則 2：只在 status 實際變更時執行
  -- ========================================
  IF (OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- ========================================
  -- 規則 3：只在從 active 變為非 active 時同步
  -- ========================================
  -- 當刊登從 active 變為 sold/cancelled/expired/suspended 時
  -- 將所有相關的購買意向（排除已完成和已取消的）標記為已取消
  IF (OLD.status = 'active' AND NEW.status != 'active') THEN
    UPDATE interests
    SET
      status = 'cancelled',
      updated_at = NOW()
    WHERE listing_id = NEW.id
      AND status NOT IN ('completed', 'cancelled');

    -- 記錄同步操作（用於除錯）
    RAISE NOTICE '刊登 % 狀態從 % 變為 %，已同步 % 筆購買意向為 cancelled',
      NEW.id, OLD.status, NEW.status, (
        SELECT COUNT(*)
        FROM interests
        WHERE listing_id = NEW.id
          AND status = 'cancelled'
          AND updated_at = NOW()
      );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_interests_on_listing_status_change IS
  '觸發器函數：當刊登狀態從 active 變為其他狀態時，自動將相關購買意向（排除 completed/cancelled）標記為 cancelled。';

-- ============================================================
-- 建立觸發器
-- ============================================================

CREATE TRIGGER trg_sync_interests_on_listing_status
  AFTER UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_interests_on_listing_status_change();

COMMENT ON TRIGGER trg_sync_interests_on_listing_status ON listings IS
  '當刊登狀態變更時，自動同步相關購買意向的狀態';

-- ============================================================
-- 驗證觸發器創建成功
-- ============================================================

DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- 檢查觸發器是否存在
    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_sync_interests_on_listing_status'
    ) INTO v_trigger_exists;

    -- 檢查函數是否存在
    SELECT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'sync_interests_on_listing_status_change'
    ) INTO v_function_exists;

    IF v_trigger_exists AND v_function_exists THEN
        RAISE NOTICE '✅ 觸發器和函數創建成功';
        RAISE NOTICE '  - 觸發器名稱: trg_sync_interests_on_listing_status';
        RAISE NOTICE '  - 函數名稱: sync_interests_on_listing_status_change()';
        RAISE NOTICE '  - 觸發條件: listings 表 UPDATE 操作';
        RAISE NOTICE '  - 執行時機: AFTER UPDATE (每行觸發)';
    ELSE
        RAISE WARNING '⚠️  觸發器或函數創建失敗';
    END IF;
END $$;

-- ============================================================
-- 回滾腳本（如需要）
-- ============================================================

-- 如果需要回滾此 migration，請執行以下 SQL：
--
-- DROP TRIGGER IF EXISTS trg_sync_interests_on_listing_status ON listings;
-- DROP FUNCTION IF EXISTS sync_interests_on_listing_status_change();

-- ============================================================
-- 完成提示
-- ============================================================

-- Migration 024: Sync Interests on Listing Status Change
-- Created: 2025-11-02
-- Description:
--   - 添加觸發器自動同步購買意向狀態
--   - 當刊登從 active 變為其他狀態時，相關意向自動變為 cancelled
--   - 排除已完成（completed）的意向，保留交易記錄
--   - 使用 PostgreSQL 觸發器確保資料一致性
--
-- 觸發條件：
--   - 操作類型：UPDATE listings
--   - 觸發時機：AFTER (在更新之後)
--   - 觸發範圍：FOR EACH ROW (每行觸發)
--
-- 業務邏輯：
--   active → sold      → 意向變為 cancelled（刊登已售出）
--   active → cancelled → 意向變為 cancelled（刊登已取消）
--   active → expired   → 意向變為 cancelled（刊登已過期）
--   active → suspended → 意向變為 cancelled（刊登已暫停）
--
-- 保留規則：
--   - completed 意向不會被修改（交易已完成）
--   - cancelled 意向不會被重複更新
--   - 只在 active → non-active 時觸發
--
-- 影響範圍：
--   - PATCH /api/listings/[id] - 手動更新刊登狀態
--   - DELETE /api/listings/[id] - 軟刪除刊登（設為 cancelled）
--   - POST /api/cron/cleanup-expired-listings - 定期清理過期刊登
--
-- 性能影響：
--   - 觸發器僅在 status 實際變更時執行
--   - UPDATE 語句使用 WHERE 條件過濾，只更新需要的記錄
--   - 在同一事務中執行，確保原子性
--
-- 回滾方式：
--   執行上方「回滾腳本」區塊中的 SQL
