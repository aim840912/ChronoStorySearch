-- ============================================================
-- Migration 018: 配額計數器自動同步觸發器
-- ============================================================
--
-- 目的：自動維護 user_quotas.active_listings_count 與實際刊登數同步
--
-- 觸發時機：
-- 1. 新增刊登時（status = 'active'）
-- 2. 刪除刊登時（deleted_at 被設置）
-- 3. 更新刊登狀態時（status 變更）
--
-- 注意：此 migration 為雙重保障機制
-- - 應用層已有配額更新邏輯（主要機制）
-- - 此觸發器作為防護網（防止應用層 bug）
-- ============================================================

-- ============================================================
-- 1. 建立觸發器函數：處理刊登狀態變更
-- ============================================================

CREATE OR REPLACE FUNCTION sync_user_quota_on_listing_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_active BOOLEAN;
  v_new_active BOOLEAN;
  v_delta INT;
BEGIN
  -- 判斷舊狀態是否為活躍
  v_old_active := (
    OLD.status = 'active'
    AND OLD.deleted_at IS NULL
  );

  -- 判斷新狀態是否為活躍
  v_new_active := (
    NEW.status = 'active'
    AND NEW.deleted_at IS NULL
  );

  -- 計算變化量
  IF (TG_OP = 'INSERT') THEN
    -- 新增刊登
    IF v_new_active THEN
      v_delta := 1;
    ELSE
      v_delta := 0;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- 更新刊登
    IF v_old_active = v_new_active THEN
      -- 狀態沒變，不需要更新配額
      RETURN NEW;
    ELSIF v_new_active THEN
      -- 從非活躍變為活躍
      v_delta := 1;
    ELSE
      -- 從活躍變為非活躍
      v_delta := -1;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    -- 刪除刊登（物理刪除，非軟刪除）
    IF v_old_active THEN
      v_delta := -1;
    ELSE
      v_delta := 0;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- 更新配額（如果有變化）
  IF v_delta != 0 THEN
    -- 確保配額記錄存在
    INSERT INTO user_quotas (user_id, active_listings_count)
    VALUES (COALESCE(NEW.user_id, OLD.user_id), 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- 更新配額計數器
    UPDATE user_quotas
    SET
      active_listings_count = GREATEST(active_listings_count + v_delta, 0),
      updated_at = NOW()
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  END IF;

  -- 返回新記錄（INSERT/UPDATE）或舊記錄（DELETE）
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================================
-- 2. 建立觸發器：監聽 listings 表的變更
-- ============================================================

-- 移除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS trg_sync_user_quota ON listings;

-- 建立新觸發器
CREATE TRIGGER trg_sync_user_quota
  AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_quota_on_listing_change();

-- ============================================================
-- 3. 註解說明
-- ============================================================

COMMENT ON FUNCTION sync_user_quota_on_listing_change() IS
  '自動同步用戶配額計數器：當刊登狀態變更時自動更新 user_quotas.active_listings_count';

COMMENT ON TRIGGER trg_sync_user_quota ON listings IS
  '配額自動同步觸發器：確保配額計數器與實際刊登數保持一致';

-- ============================================================
-- 4. 驗證腳本（可選，用於測試）
-- ============================================================

-- 測試步驟：
-- 1. 建立測試刊登 → 配額應該 +1
-- 2. 將刊登標記為 sold → 配額應該 -1
-- 3. 軟刪除刊登 → 配額應該保持不變（已經 -1）

-- 範例（請勿在生產環境執行）：
/*
-- 假設測試用戶 ID 為 'test-user-uuid'
BEGIN;

-- 查詢初始配額
SELECT active_listings_count FROM user_quotas WHERE user_id = 'test-user-uuid';

-- 建立測試刊登（應該 +1）
INSERT INTO listings (user_id, item_id, trade_type, price, status)
VALUES ('test-user-uuid', 1, 'sell', 1000, 'active');

-- 查詢配額（應該 +1）
SELECT active_listings_count FROM user_quotas WHERE user_id = 'test-user-uuid';

-- 標記為已售出（應該 -1）
UPDATE listings SET status = 'sold' WHERE user_id = 'test-user-uuid';

-- 查詢配額（應該回到初始值）
SELECT active_listings_count FROM user_quotas WHERE user_id = 'test-user-uuid';

ROLLBACK;
*/

-- ============================================================
-- Migration 完成
-- ============================================================

-- 此 migration 提供以下保障：
-- ✅ 自動維護配額計數器，無需依賴應用層
-- ✅ 處理 INSERT/UPDATE/DELETE 三種情況
-- ✅ 使用 GREATEST() 確保計數器不會變為負數
-- ✅ 幂等性：重複執行不會產生副作用
--
-- 回滾方式：
-- DROP TRIGGER IF EXISTS trg_sync_user_quota ON listings;
-- DROP FUNCTION IF EXISTS sync_user_quota_on_listing_change();
