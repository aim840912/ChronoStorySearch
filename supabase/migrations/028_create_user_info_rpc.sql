-- Migration: 建立 get_user_info_with_quotas RPC 函數
-- 目的：優化 /api/auth/me 的 N+1 查詢問題
-- 日期：2025-11-03
-- 相關優化：N+1 查詢優化（方案 C）

-- =====================================================
-- 函數：get_user_info_with_quotas
-- =====================================================
-- 用途：一次性獲取用戶資訊、session 資訊和配額統計
-- 取代：/api/auth/me 中的 4 次獨立查詢
-- 預期提升：減少 60-75% 查詢時間

CREATE OR REPLACE FUNCTION get_user_info_with_quotas(
  p_user_id UUID,
  p_session_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_profile_data JSON;
  v_session_data JSON;
  v_active_listings_count INT;
  v_interests_today_count INT;
BEGIN
  -- 1. 查詢 Discord 個人資料
  SELECT row_to_json(dp) INTO v_profile_data
  FROM (
    SELECT account_created_at, reputation_score, server_roles, profile_privacy
    FROM discord_profiles
    WHERE user_id = p_user_id
  ) dp;

  -- 如果找不到 profile，返回 NULL（讓 API 處理錯誤）
  IF v_profile_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. 查詢 Session 資訊
  SELECT row_to_json(s) INTO v_session_data
  FROM (
    SELECT id, token_expires_at, last_active_at, created_at
    FROM sessions
    WHERE id = p_session_id
  ) s;

  -- 如果找不到 session，返回 NULL（讓 API 處理錯誤）
  IF v_session_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. 查詢活躍刊登數量
  SELECT COUNT(*) INTO v_active_listings_count
  FROM listings
  WHERE user_id = p_user_id
    AND status = 'active'
    AND deleted_at IS NULL;

  -- 4. 查詢今日表達興趣次數（UTC 時區）
  -- 注意：使用 buyer_id 而非 user_id（正確的欄位名）
  SELECT COUNT(*) INTO v_interests_today_count
  FROM interests
  WHERE buyer_id = p_user_id
    AND created_at >= CURRENT_DATE;

  -- 5. 組合結果
  SELECT json_build_object(
    'profile', v_profile_data,
    'session', v_session_data,
    'quotas', json_build_object(
      'active_listings_count', COALESCE(v_active_listings_count, 0),
      'interests_today_count', COALESCE(v_interests_today_count, 0)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 安全設定
-- =====================================================
-- SECURITY DEFINER：函數以定義者權限執行（可繞過 RLS）
-- 這是必要的，因為 API 使用 supabaseAdmin 客戶端

-- 添加註釋
COMMENT ON FUNCTION get_user_info_with_quotas(UUID, UUID) IS
  '一次性獲取用戶資訊、session 資訊和配額統計，優化 /api/auth/me 查詢效能';

-- =====================================================
-- 使用範例
-- =====================================================
-- SELECT get_user_info_with_quotas(
--   'user-uuid-here'::UUID,
--   'session-uuid-here'::UUID
-- );

-- 預期回應格式：
-- {
--   "profile": {
--     "account_created_at": "2024-01-01T00:00:00Z",
--     "reputation_score": 100,
--     "server_roles": ["Member"],
--     "profile_privacy": "public"
--   },
--   "session": {
--     "id": "session-uuid",
--     "token_expires_at": "2024-12-31T23:59:59Z",
--     "last_active_at": "2024-11-03T12:00:00Z",
--     "created_at": "2024-11-01T00:00:00Z"
--   },
--   "quotas": {
--     "active_listings_count": 3,
--     "interests_today_count": 5
--   }
-- }
