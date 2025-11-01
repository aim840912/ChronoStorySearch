/**
 * Migration: 021_standardize_rpc_error_codes
 *
 * 目的：標準化 RPC 函數錯誤處理，使用 PostgreSQL ERRCODE
 *
 * 背景：
 * - Migration 019 的 create_listing_safe() 使用通用錯誤碼 'check_violation' (23514)
 * - 前端無法區分是「配額超限」還是其他檢查約束違反
 * - 導致錯誤訊息不夠精確，用戶體驗不佳
 *
 * 解決方案：
 * - 使用自訂錯誤碼 'P0001' (QUOTA_EXCEEDED) 替代 'check_violation'
 * - 配合 ErrorFactory.fromSupabaseRpcError() 自動轉換為 ValidationError
 * - 提升錯誤處理的可靠性和一致性
 *
 * 相關文檔：
 * - PostgreSQL Error Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 * - src/lib/errors.ts: POSTGRES_ERROR_CODES.QUOTA_EXCEEDED = 'P0001'
 */

-- ============================================================
-- 1. 刪除舊版本的 create_listing_safe() 函數
-- ============================================================

DROP FUNCTION IF EXISTS create_listing_safe(
  UUID, INT, TEXT, TEXT, BIGINT, INT, TEXT, TEXT, TEXT, JSONB, JSONB, INT
);

-- ============================================================
-- 2. 建立新版本的 create_listing_safe() 函數（使用標準化錯誤碼）
-- ============================================================

CREATE OR REPLACE FUNCTION create_listing_safe(
  p_user_id UUID,
  p_item_id INT,
  p_trade_type TEXT,
  p_discord_contact TEXT,
  p_price BIGINT DEFAULT NULL,
  p_quantity INT DEFAULT 1,
  p_ingame_name TEXT DEFAULT NULL,
  p_seller_discord_id TEXT DEFAULT NULL,
  p_webhook_url TEXT DEFAULT NULL,
  p_item_stats JSONB DEFAULT NULL,
  p_wanted_items JSONB DEFAULT NULL,
  p_max_listings INT DEFAULT 5
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_count INT;
  v_listing_id BIGINT;
  v_wanted_item JSONB;
  v_result JSONB;
BEGIN
  -- ========================================
  -- 步驟 1: 確保用戶配額記錄存在並鎖定
  -- ========================================

  -- 如果配額記錄不存在，先建立
  INSERT INTO user_quotas (user_id, active_listings_count)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- 使用悲觀鎖鎖定配額記錄（阻止其他並發交易讀取）
  SELECT active_listings_count INTO v_active_count
  FROM user_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;  -- ✅ 悲觀鎖：其他交易必須等待此交易完成

  -- ========================================
  -- 步驟 2: 檢查配額限制（使用標準化錯誤碼）
  -- ========================================

  IF v_active_count >= p_max_listings THEN
    -- ✅ 使用自訂錯誤碼 P0001 (QUOTA_EXCEEDED)
    RAISE EXCEPTION '已達到刊登配額上限（% 個），請先刪除或完成現有刊登', p_max_listings
      USING ERRCODE = 'P0001',  -- 自訂錯誤碼（對應 src/lib/errors.ts）
            HINT = '當前刊登數: ' || v_active_count || '，上限: ' || p_max_listings;
  END IF;

  -- ========================================
  -- 步驟 3: 插入刊登記錄
  -- ========================================

  INSERT INTO listings (
    user_id,
    item_id,
    trade_type,
    discord_contact,
    price,
    quantity,
    ingame_name,
    seller_discord_id,
    webhook_url,
    item_stats,
    status,
    view_count,
    interest_count,
    created_at
  ) VALUES (
    p_user_id,
    p_item_id,
    p_trade_type,
    p_discord_contact,
    p_price,
    p_quantity,
    p_ingame_name,
    p_seller_discord_id,
    p_webhook_url,
    p_item_stats,
    'active',
    0,
    0,
    NOW()
  )
  RETURNING id INTO v_listing_id;

  -- ========================================
  -- 步驟 4: 插入 listing_wanted_items（如果是交換類型）
  -- ========================================

  IF p_wanted_items IS NOT NULL THEN
    FOR v_wanted_item IN SELECT * FROM jsonb_array_elements(p_wanted_items)
    LOOP
      INSERT INTO listing_wanted_items (
        listing_id,
        item_id,
        quantity
      ) VALUES (
        v_listing_id,
        (v_wanted_item->>'item_id')::INT,
        (v_wanted_item->>'quantity')::INT
      );
    END LOOP;
  END IF;

  -- ========================================
  -- 步驟 5: 返回結果
  -- ========================================
  -- ⚠️  配額更新由 Migration 018 的觸發器自動處理

  v_result := jsonb_build_object(
    'listing_id', v_listing_id,
    'user_id', p_user_id,
    'active_count', v_active_count + 1  -- 預期值（觸發器會更新）
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. 更新函數註釋
-- ============================================================

COMMENT ON FUNCTION create_listing_safe IS
  '安全建立刊登：使用悲觀鎖確保配額檢查和刊登建立的原子性。配額更新由 Migration 018 觸發器自動管理。錯誤處理使用標準化的 PostgreSQL ERRCODE (P0001 = QUOTA_EXCEEDED)。';

-- ============================================================
-- 完成！migration 說明
-- ============================================================

-- 此 migration 完成以下工作：
-- ✅ 將配額超限錯誤碼從 'check_violation' (23514) 改為 'P0001' (QUOTA_EXCEEDED)
-- ✅ 配合前端 ErrorFactory.fromSupabaseRpcError() 自動轉換錯誤
-- ✅ 提供更精確的錯誤訊息和 HINT
-- ✅ 改善用戶體驗（更友善的錯誤提示）
--
-- 錯誤處理對照表：
-- - P0001 (QUOTA_EXCEEDED) → ValidationError('已達到刊登配額上限')
-- - 23505 (UNIQUE_VIOLATION) → ConflictError('資源已存在')
--   （由 Migration 020 的 unique index 自動觸發）
-- - 23503 (FOREIGN_KEY_VIOLATION) → ValidationError('關聯資源不存在')
-- - 23514 (CHECK_VIOLATION) → ValidationError('資料驗證失敗')
--
-- 回滾方式：
-- 執行 Migration 019 即可恢復舊版本（使用通用錯誤碼）
