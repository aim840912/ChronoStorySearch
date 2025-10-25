-- ============================================================
-- MapleStory Trading System - Row Level Security (RLS)
-- 資料庫層級權限控制，雙重安全防護
-- ============================================================

-- ============================================================
-- 1. users - 用戶表
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 所有認證用戶可以查看用戶基本資訊（信譽、Discord 資訊）
CREATE POLICY "Users can view all user profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- 用戶只能更新自己的資訊
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. sessions - Session 表
-- ============================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看自己的 session
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role 可以插入 session（OAuth callback 使用）
CREATE POLICY "Service role can insert sessions"
  ON sessions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 用戶可以刪除自己的 session（登出功能）
CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. discord_profiles - Discord 詳細資料
-- ============================================================

ALTER TABLE discord_profiles ENABLE ROW LEVEL SECURITY;

-- 所有認證用戶可以查看 Discord 資料（信譽分數顯示）
CREATE POLICY "Users can view all discord profiles"
  ON discord_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Service role 可以更新 Discord 資料（信譽計算、自動更新）
CREATE POLICY "Service role can manage discord profiles"
  ON discord_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. reputation_history - 信譽歷史
-- ============================================================

ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看自己的信譽變動歷史
CREATE POLICY "Users can view own reputation history"
  ON reputation_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role 可以插入信譽變動記錄（自動計算）
CREATE POLICY "Service role can insert reputation history"
  ON reputation_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 5. listings - 物品刊登表
-- ============================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- 所有認證用戶可以查看 active 刊登（市場瀏覽）
CREATE POLICY "Users can view active listings"
  ON listings FOR SELECT
  TO authenticated
  USING (status = 'active' AND deleted_at IS NULL);

-- 用戶可以查看自己的所有刊登（包含非 active）
CREATE POLICY "Users can view own listings"
  ON listings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 用戶只能建立自己的刊登
CREATE POLICY "Users can create own listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 用戶只能更新自己的刊登
CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 用戶只能刪除自己的刊登（軟刪除）
CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. interests - 購買意向表
-- ============================================================

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- 買家可以查看自己的購買意向
CREATE POLICY "Buyers can view own interests"
  ON interests FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- 賣家可以查看自己刊登收到的購買意向
CREATE POLICY "Sellers can view received interests"
  ON interests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = interests.listing_id
        AND listings.user_id = auth.uid()
    )
  );

-- 買家可以建立購買意向
CREATE POLICY "Buyers can create interests"
  ON interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- 買家可以更新自己的購買意向
CREATE POLICY "Buyers can update own interests"
  ON interests FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- 買家可以刪除自己的購買意向
CREATE POLICY "Buyers can delete own interests"
  ON interests FOR DELETE
  TO authenticated
  USING (auth.uid() = buyer_id);

-- ============================================================
-- 7. reports - 舉報表
-- ============================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 用戶可以查看自己提交的舉報
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- 用戶可以提交舉報
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Service role（管理員）可以查看和管理所有舉報
CREATE POLICY "Service role can manage all reports"
  ON reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 8. user_quotas - 用戶配額表
-- ============================================================

ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- 用戶可以查看自己的配額
CREATE POLICY "Users can view own quotas"
  ON user_quotas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role 可以更新配額（自動計算）
CREATE POLICY "Service role can manage quotas"
  ON user_quotas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 9. ip_quotas - IP 配額表
-- ============================================================

ALTER TABLE ip_quotas ENABLE ROW LEVEL SECURITY;

-- Service role 可以管理 IP 配額（防爬蟲系統使用）
CREATE POLICY "Service role can manage ip quotas"
  ON ip_quotas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 說明
-- ============================================================

COMMENT ON POLICY "Users can view active listings" ON listings IS
  '所有認證用戶可瀏覽市場中的 active 刊登';

COMMENT ON POLICY "Sellers can view received interests" ON interests IS
  '賣家可以查看自己刊登收到的購買意向（JOIN listings 檢查所有權）';

-- ============================================================
-- Migration 002: Row Level Security
-- Created: 2025-10-26
-- Description: 設定資料庫層級權限控制，實現雙重安全防護
--
-- 安全原則：
-- 1. 所有表啟用 RLS（除了需要公開存取的表）
-- 2. 用戶只能操作自己的資料（listings, interests, sessions）
-- 3. Service role 用於系統自動化任務（信譽計算、配額管理）
-- 4. 公開查看但有限制更新（users, discord_profiles）
-- ============================================================
