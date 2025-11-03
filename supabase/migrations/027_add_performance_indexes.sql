-- Migration: 新增效能優化索引
-- 目的：優化常用查詢，減少查詢時間 40-60%
-- 日期：2025-11-03
-- 相關優化：資料庫查詢優化（方案 C）

-- =====================================================
-- 索引 1：優化 session 查詢（/api/auth/me）
-- =====================================================
-- 用途：快速查詢用戶的 sessions（按最後活動時間排序）
-- 影響 API：/api/auth/me
-- 預期提升：減少 40-50% session 查詢時間
-- 註解：原本的 WHERE expires_at > NOW() 已移除，因為 NOW() 不是 IMMUTABLE 函數
--       過期 session 的過濾在應用層或查詢中處理

CREATE INDEX IF NOT EXISTS idx_sessions_user_active
ON sessions(user_id, last_active_at DESC);

COMMENT ON INDEX idx_sessions_user_active IS '優化用戶 sessions 查詢（/api/auth/me），按最後活動時間排序';

-- =====================================================
-- 索引 2：優化個人刊登列表（/api/listings）
-- =====================================================
-- 用途：快速查詢用戶的刊登列表（依狀態和建立時間排序）
-- 影響 API：/api/listings (GET)
-- 預期提升：減少 40-60% 個人刊登查詢時間

CREATE INDEX IF NOT EXISTS idx_listings_user_status
ON listings(user_id, status, created_at DESC)
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_listings_user_status IS '優化個人刊登列表查詢（/api/listings）';

-- =====================================================
-- 索引 3：優化配額統計查詢（/api/auth/me）
-- =====================================================
-- 用途：快速統計用戶今日的購買意向次數
-- 影響 API：/api/auth/me?include_quotas=true
-- 預期提升：減少 50-70% 配額統計查詢時間

CREATE INDEX IF NOT EXISTS idx_interests_buyer_created
ON interests(buyer_id, created_at DESC);

COMMENT ON INDEX idx_interests_buyer_created IS '優化用戶購買意向統計查詢（/api/auth/me 配額）';

-- =====================================================
-- 驗證索引建立
-- =====================================================
-- 執行以下查詢驗證索引是否建立成功：
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE indexname IN ('idx_sessions_user_active', 'idx_listings_user_status', 'idx_interests_buyer_created');
