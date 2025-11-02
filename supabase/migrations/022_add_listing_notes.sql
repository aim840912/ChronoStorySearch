-- ============================================================
-- Migration: 新增刊登備註欄位
-- Purpose:
--   - 新增 listings.notes 欄位
--   - 讓賣家可以在建立刊登時添加商品說明或交易條件
-- Date: 2025-11-02
-- ============================================================

-- ============================================================
-- 新增 notes 欄位到 listings 表
-- ============================================================

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN listings.notes IS '刊登備註（賣家自訂說明，公開顯示）';

-- ============================================================
-- 更新 create_listing_safe RPC 函數以支援 notes
-- ============================================================

-- 先刪除所有同名的函數（避免函數名稱衝突）
-- 使用 CASCADE 確保依賴也會被處理
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT oid::regprocedure as func_signature
        FROM pg_proc
        WHERE proname = 'create_listing_safe'
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

-- 基於 Migration 021 的函數簽名，新增 p_notes 參數
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
  p_notes TEXT DEFAULT NULL,  -- ✅ 新增 notes 參數
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
  -- 步驟 3: 插入刊登記錄（新增 notes 欄位）
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
    notes,  -- ✅ 新增 notes 欄位
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
    p_notes,  -- ✅ 新增 notes 值
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
-- 更新函數註釋
-- ============================================================

COMMENT ON FUNCTION create_listing_safe IS
  '安全建立刊登：使用悲觀鎖確保配額檢查和刊登建立的原子性。配額更新由 Migration 018 觸發器自動管理。錯誤處理使用標準化的 PostgreSQL ERRCODE (P0001 = QUOTA_EXCEEDED)。支援刊登備註功能 (p_notes)。';

-- ============================================================
-- 完成提示
-- ============================================================

-- Migration 022: Add Listing Notes
-- Created: 2025-11-02
-- Base: Migration 021 (create_listing_safe with standardized error codes)
-- Description:
--   - 新增 listings.notes 欄位（TEXT 類型，允許 NULL）
--   - 更新 create_listing_safe RPC 函數以支援 p_notes 參數
--   - 保留 Migration 021 的所有功能（配額檢查、悲觀鎖、錯誤碼）
--   - 賣家可在建立刊登時添加商品說明或交易條件

-- 函數簽名：
--   create_listing_safe(
--     p_user_id, p_item_id, p_trade_type, p_discord_contact,
--     p_price, p_quantity, p_ingame_name, p_seller_discord_id,
--     p_webhook_url, p_item_stats, p_wanted_items,
--     p_notes,  -- 新增參數
--     p_max_listings
--   )

-- 預期結果：
--   - listings 表包含 notes 欄位
--   - create_listing_safe 函數支援 p_notes 參數
--   - 欄位為選填，預設值為 NULL
--   - 與前端 API (/api/listings POST) 完全兼容
