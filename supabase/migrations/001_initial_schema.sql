-- ============================================================
-- MapleStory Trading System - Initial Schema
-- Discord OAuth 交易系統資料庫結構
-- ============================================================

-- ============================================================
-- 1. 用戶表 (users)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id VARCHAR(20) UNIQUE NOT NULL,
  discord_username VARCHAR(100) NOT NULL,
  discord_discriminator VARCHAR(4),
  discord_avatar VARCHAR(200),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,

  CONSTRAINT valid_discord_id CHECK (discord_id ~ '^[0-9]{17,20}$')
);

CREATE INDEX idx_discord_id ON users(discord_id);
CREATE INDEX idx_banned_users ON users(banned) WHERE banned = TRUE;

COMMENT ON TABLE users IS '用戶基本資訊表';
COMMENT ON COLUMN users.discord_id IS 'Discord 用戶 ID（Snowflake）';
COMMENT ON COLUMN users.banned IS '封禁狀態';

-- ============================================================
-- 2. Session 表 (sessions)
-- ============================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_ip INET NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions ON sessions(user_id, created_at DESC);

COMMENT ON TABLE sessions IS 'OAuth Session 記錄（加密 token 存儲）';
COMMENT ON COLUMN sessions.access_token IS 'Discord Access Token（AES-256-GCM 加密）';
COMMENT ON COLUMN sessions.refresh_token IS 'Discord Refresh Token（AES-256-GCM 加密）';

-- ============================================================
-- 3. Discord 詳細資料表 (discord_profiles)
-- ============================================================

CREATE TABLE discord_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_created_at TIMESTAMPTZ NOT NULL,
  server_member_since TIMESTAMPTZ,
  server_roles TEXT[],
  verified BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  reputation_last_updated TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reputation ON discord_profiles(reputation_score DESC);

COMMENT ON TABLE discord_profiles IS 'Discord 帳號詳細資料與信譽';
COMMENT ON COLUMN discord_profiles.reputation_score IS '信譽分數（0-100）';

-- ============================================================
-- 4. 信譽歷史表 (reputation_history)
-- ============================================================

CREATE TABLE reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score_change INTEGER NOT NULL,
  reason VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_reputation_history ON reputation_history(user_id, created_at DESC);

COMMENT ON TABLE reputation_history IS '信譽變動歷史記錄';
COMMENT ON COLUMN reputation_history.score_change IS '分數變動（可正可負）';

-- ============================================================
-- 5. 物品刊登表 (listings)
-- ============================================================

CREATE TABLE listings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INT NOT NULL,
  quantity INT DEFAULT 1 CHECK (quantity > 0),
  price BIGINT NOT NULL CHECK (price > 0),
  contact_method TEXT NOT NULL,
  contact_info TEXT,
  webhook_url TEXT,
  status TEXT DEFAULT 'active',
  view_count INT DEFAULT 0,
  interest_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_contact_method CHECK (
    contact_method IN ('discord', 'ingame')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('active', 'sold', 'cancelled', 'expired', 'suspended')
  )
);

CREATE INDEX idx_active_listings ON listings(status, created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_item_search ON listings(item_id, price)
  WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_user_listings ON listings(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE listings IS '虛擬物品刊登';
COMMENT ON COLUMN listings.contact_method IS '聯絡方式：discord（Discord DM）、ingame（遊戲內）';
COMMENT ON COLUMN listings.status IS '刊登狀態：active、sold、cancelled、expired、suspended';

-- ============================================================
-- 6. 購買意向表 (interests)
-- ============================================================

CREATE TABLE interests (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  contacted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_interest UNIQUE (listing_id, buyer_id),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'contacted', 'completed', 'cancelled')
  )
);

CREATE INDEX idx_listing_interests ON interests(listing_id, status, created_at DESC);
CREATE INDEX idx_buyer_interests ON interests(buyer_id, status, created_at DESC);

COMMENT ON TABLE interests IS '購買意向記錄';
COMMENT ON COLUMN interests.status IS '意向狀態：pending、contacted、completed、cancelled';

-- ============================================================
-- 7. 舉報表 (reports)
-- ============================================================

CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'reviewing', 'resolved', 'dismissed')
  )
);

CREATE INDEX idx_pending_reports ON reports(status, created_at DESC)
  WHERE status IN ('pending', 'reviewing');

COMMENT ON TABLE reports IS '刊登舉報記錄';
COMMENT ON COLUMN reports.status IS '處理狀態：pending、reviewing、resolved、dismissed';

-- ============================================================
-- 8. 用戶配額表 (user_quotas)
-- ============================================================

CREATE TABLE user_quotas (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_listings_count INT DEFAULT 0 CHECK (active_listings_count >= 0),
  total_interests_count INT DEFAULT 0 CHECK (total_interests_count >= 0),
  interests_today INT DEFAULT 0 CHECK (interests_today >= 0),
  last_interest_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT quota_listings CHECK (active_listings_count <= 50),
  CONSTRAINT quota_interests CHECK (total_interests_count <= 100),
  CONSTRAINT quota_interests_daily CHECK (interests_today <= 20)
);

COMMENT ON TABLE user_quotas IS '用戶配額限制';
COMMENT ON COLUMN user_quotas.active_listings_count IS '當前刊登數（上限 50）';
COMMENT ON COLUMN user_quotas.interests_today IS '今日購買意向數（上限 20）';

-- ============================================================
-- 9. IP 配額表 (ip_quotas)
-- ============================================================

CREATE TABLE ip_quotas (
  ip_address INET PRIMARY KEY,
  contact_views_today INT DEFAULT 0 CHECK (contact_views_today >= 0),
  last_contact_view_date DATE,
  total_contact_views INT DEFAULT 0 CHECK (total_contact_views >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT quota_contact_views_daily CHECK (contact_views_today <= 30)
);

CREATE INDEX idx_ip_contact_views ON ip_quotas(contact_views_today DESC)
  WHERE contact_views_today > 20;

COMMENT ON TABLE ip_quotas IS 'IP 查看聯絡資訊配額（防止爬蟲）';
COMMENT ON COLUMN ip_quotas.contact_views_today IS '今日查看次數（上限 30）';

-- ============================================================
-- 完成提示
-- ============================================================

-- Migration 001: Initial Schema
-- Created: 2025-10-26
-- Updated: 2025-10-26 - 修正 idx_expires 索引錯誤（移除 NOW() 函數）
-- Description: 建立 Discord OAuth 交易系統的核心資料庫結構
--
-- 變更記錄：
-- v1.1 (2025-10-26): 移除 sessions 表的 idx_expires 索引
--   原因：PostgreSQL partial index 不支援 NOW() 函數（非 IMMUTABLE）
--   影響：使用 idx_user_sessions 索引已足夠支援查詢需求
