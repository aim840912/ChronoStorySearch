/**
 * Migration: 015_fix_create_listing_safe_discord_contact
 *
 * 目的：修復 create_listing_safe() 函數，添加 discord_contact 參數
 *
 * 問題描述：
 * - Migration 006 將 contact_info 改名為 discord_contact（NOT NULL）
 * - Migration 008 建立的 RPC 函數未包含 discord_contact 參數
 * - 導致建立刊登時違反 NOT NULL 約束
 *
 * 解決方案：
 * - 重新建立 create_listing_safe() 函數，添加 p_discord_contact 參數
 * - 在 INSERT 語句中包含 discord_contact 欄位
 */

-- ============================================================
-- 1. 刪除舊版本的 create_listing_safe() 函數
-- ============================================================

DROP FUNCTION IF EXISTS create_listing_safe(
  UUID, INT, TEXT, BIGINT, INT, TEXT, TEXT, TEXT, JSONB, JSONB, INT
);

-- ============================================================
-- 2. 建立新版本的 create_listing_safe() 函數（添加 p_discord_contact）
-- ============================================================

CREATE OR REPLACE FUNCTION create_listing_safe(
  p_user_id UUID,
  p_item_id INT,
  p_trade_type TEXT,
  p_discord_contact TEXT,                -- ✅ 新增：Discord 聯絡方式（必填）
  p_price BIGINT DEFAULT NULL,
  p_quantity INT DEFAULT 1,
  p_ingame_name TEXT DEFAULT NULL,
  p_seller_discord_id TEXT DEFAULT NULL,
  p_webhook_url TEXT DEFAULT NULL,
  p_item_stats JSONB DEFAULT NULL,
  p_wanted_items JSONB DEFAULT NULL,    -- 格式: [{"item_id": 123, "quantity": 1}, ...]
  p_max_listings INT DEFAULT 5          -- 配額上限（可調整）
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- 以函數擁有者權限執行（繞過 RLS）
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
  -- 步驟 2: 檢查配額限制
  -- ========================================

  IF v_active_count >= p_max_listings THEN
    RAISE EXCEPTION '已達到刊登配額上限（% 個），請先刪除或完成現有刊登', p_max_listings
      USING ERRCODE = 'check_violation',
            HINT = '當前刊登數: ' || v_active_count;
  END IF;

  -- ========================================
  -- 步驟 3: 插入刊登記錄
  -- ========================================

  INSERT INTO listings (
    user_id,
    item_id,
    trade_type,
    discord_contact,      -- ✅ 新增欄位
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
    p_discord_contact,    -- ✅ 新增參數
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
  -- 步驟 5: 更新配額計數器（遞增 1）
  -- ========================================

  UPDATE user_quotas
  SET active_listings_count = active_listings_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- ========================================
  -- 步驟 6: 返回結果
  -- ========================================

  v_result := jsonb_build_object(
    'listing_id', v_listing_id,
    'user_id', p_user_id,
    'active_count', v_active_count + 1
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. 註解說明
-- ============================================================

COMMENT ON FUNCTION create_listing_safe IS
  '安全建立刊登：使用悲觀鎖確保配額檢查和刊登建立的原子性（修復版：包含 discord_contact）';
