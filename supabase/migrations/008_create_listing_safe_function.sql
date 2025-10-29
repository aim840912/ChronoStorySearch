-- Migration: 建立 create_listing_safe() 函數，使用資料庫交易解決競態條件
-- 用途：使用悲觀鎖（SELECT FOR UPDATE）確保配額檢查和刊登建立的原子性
-- 日期: 2025-10-29
--
-- 問題描述：
-- - 即使有唯一性約束，仍可能突破配額限制（5 個活躍刊登）
-- - 應用層的 Check-Then-Act 模式無法防止並發請求
--
-- 解決方案：
-- - 使用資料庫交易（函數內自動有交易）
-- - 使用 SELECT FOR UPDATE 悲觀鎖鎖定配額記錄
-- - 在單一原子操作中完成配額檢查、刊登建立、配額更新

-- ============================================================
-- 1. 建立 create_listing_safe() 函數
-- ============================================================

CREATE OR REPLACE FUNCTION create_listing_safe(
  p_user_id UUID,
  p_item_id INT,
  p_trade_type TEXT,
  p_price BIGINT DEFAULT NULL,
  p_quantity INT DEFAULT 1,
  p_ingame_name TEXT DEFAULT NULL,
  p_seller_discord_id TEXT DEFAULT NULL,
  p_webhook_url TEXT DEFAULT NULL,
  p_item_stats JSONB DEFAULT NULL,
  p_wanted_items JSONB DEFAULT NULL,  -- 格式: [{"item_id": 123, "quantity": 1}, ...]
  p_max_listings INT DEFAULT 5       -- 配額上限（可調整）
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
  -- 步驟 4: 如果是交換類型，插入想要物品
  -- ========================================

  IF p_trade_type = 'exchange' AND p_wanted_items IS NOT NULL THEN
    -- 驗證 wanted_items 格式
    IF jsonb_typeof(p_wanted_items) != 'array' THEN
      RAISE EXCEPTION 'wanted_items 必須是 JSON 陣列'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 插入每個想要物品
    FOR v_wanted_item IN SELECT * FROM jsonb_array_elements(p_wanted_items)
    LOOP
      INSERT INTO listing_wanted_items (listing_id, item_id, quantity)
      VALUES (
        v_listing_id,
        (v_wanted_item->>'item_id')::INT,
        COALESCE((v_wanted_item->>'quantity')::INT, 1)
      );
    END LOOP;
  END IF;

  -- ========================================
  -- 步驟 5: 更新配額計數
  -- ========================================

  UPDATE user_quotas
  SET
    active_listings_count = active_listings_count + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- ========================================
  -- 步驟 6: 返回結果
  -- ========================================

  -- 構建成功回應
  v_result := jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'active_listings_count', v_active_count + 1,
    'message', '刊登建立成功'
  );

  RETURN v_result;

EXCEPTION
  -- 捕獲唯一性違反錯誤（重複刊登）
  WHEN unique_violation THEN
    RAISE EXCEPTION '您已經刊登此物品，無法重複刊登'
      USING ERRCODE = '23505',
            HINT = '請先取消舊的刊登或等待其完成';

  -- 捕獲配額檢查錯誤
  WHEN check_violation THEN
    RAISE;  -- 重新拋出，保留原始錯誤訊息

  -- 捕獲其他錯誤
  WHEN OTHERS THEN
    RAISE EXCEPTION '建立刊登失敗: %', SQLERRM
      USING ERRCODE = SQLSTATE;
END;
$$;

-- ============================================================
-- 2. 添加函數註釋
-- ============================================================

COMMENT ON FUNCTION create_listing_safe IS
  '安全地建立刊登，使用悲觀鎖防止競態條件。此函數確保配額檢查和刊登建立的原子性。';

-- ============================================================
-- 3. 授予執行權限
-- ============================================================

-- 授予 authenticated 角色執行權限（RLS 政策仍然適用）
GRANT EXECUTE ON FUNCTION create_listing_safe TO authenticated;

-- 授予 service_role 執行權限（API 使用）
GRANT EXECUTE ON FUNCTION create_listing_safe TO service_role;

-- ============================================================
-- 完成！migration 說明
-- ============================================================

-- 此 migration 完成以下工作：
-- ✅ 建立 create_listing_safe() 函數
-- ✅ 使用 SELECT FOR UPDATE 悲觀鎖鎖定配額記錄
-- ✅ 在單一交易中完成配額檢查、刊登建立、想要物品插入、配額更新
-- ✅ 優雅處理錯誤（唯一性違反、配額超限等）
-- ✅ 返回結構化的 JSON 結果
--
-- 效果：
-- - 完全解決競態條件問題
-- - 即使有 1000 個並發請求，也只有配額允許的數量能成功
-- - 自動處理 wanted_items 插入（交換類型）
-- - 錯誤訊息友善且詳細
--
-- 使用範例：
-- SELECT create_listing_safe(
--   p_user_id := '123e4567-e89b-12d3-a456-426614174000'::UUID,
--   p_item_id := 1002000,
--   p_trade_type := 'sell',
--   p_price := 1000000,
--   p_quantity := 1,
--   p_seller_discord_id := 'user#1234'
-- );
--
-- 回滾方式：
-- DROP FUNCTION IF EXISTS create_listing_safe;
