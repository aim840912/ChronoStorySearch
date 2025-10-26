-- ============================================================
-- MapleStory Trading System - 完整資料庫 Schema
-- ============================================================
-- 建立日期：2025-10-26
-- 用途：從零開始建立完整的資料庫結構
-- 注意：僅用於全新安裝，若已有資料請使用 migration 檔案
-- ============================================================

-- ============================================================
-- 1. Users 表（用戶基本資料）
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_banned_users ON users(banned) WHERE banned = TRUE;

COMMENT ON TABLE users IS '用戶基本資料表';
COMMENT ON COLUMN users.discord_id IS 'Discord 用戶 ID（17-20 位數字）';
COMMENT ON COLUMN users.banned IS '封禁狀態';

-- ============================================================
-- 2. Sessions 表（會話管理）
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_ip INET NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions ON sessions(user_id, created_at DESC);
-- 注意：移除 WHERE 條件中的 NOW()（PostgreSQL 要求 IMMUTABLE 函數）
CREATE INDEX IF NOT EXISTS idx_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token_expiry ON sessions(user_id, token_expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE sessions IS 'Session 會話管理表';
COMMENT ON COLUMN sessions.token_expires_at IS 'Discord access_token 過期時間';
COMMENT ON COLUMN sessions.revoked_at IS 'Session 撤銷時間（登出）';

-- ============================================================
-- 3. Discord Profiles 表（Discord 詳細資料）
-- ============================================================

CREATE TABLE IF NOT EXISTS discord_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_created_at TIMESTAMPTZ NOT NULL,
  server_member_since TIMESTAMPTZ,
  server_roles TEXT[],
  verified BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  reputation_last_updated TIMESTAMPTZ,
  profile_privacy TEXT DEFAULT 'public' NOT NULL CHECK (profile_privacy IN ('public', 'friends_only', 'private')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation ON discord_profiles(reputation_score DESC);

COMMENT ON TABLE discord_profiles IS 'Discord 用戶詳細資料';
COMMENT ON COLUMN discord_profiles.reputation_score IS '信譽分數（0-100）';
COMMENT ON COLUMN discord_profiles.profile_privacy IS '隱私設定（public/friends_only/private）';

-- ============================================================
-- 4. Reputation History 表（信譽歷史記錄）
-- ============================================================

CREATE TABLE IF NOT EXISTS reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score_change INTEGER NOT NULL,
  reason VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reputation_history ON reputation_history(user_id, created_at DESC);

COMMENT ON TABLE reputation_history IS '信譽變更歷史記錄';

-- ============================================================
-- 5. Listings 表（物品刊登）
-- ============================================================

CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 交易類型：sell(出售), buy(收購), exchange(交換)
  trade_type TEXT DEFAULT 'sell' NOT NULL,

  -- 出售/收購/交換的物品
  item_id INT NOT NULL,
  quantity INT DEFAULT 1 CHECK (quantity > 0),

  -- 價格 (sell/buy 使用, exchange 不使用)
  price BIGINT CHECK (price > 0),

  -- 想要的物品 (僅 exchange 使用)
  wanted_item_id INT,
  wanted_quantity INT DEFAULT 1 CHECK (wanted_quantity > 0),

  -- 聯絡方式
  contact_method TEXT NOT NULL,
  contact_info TEXT,
  webhook_url TEXT,

  -- 狀態與統計
  status TEXT DEFAULT 'active',
  view_count INT DEFAULT 0,
  interest_count INT DEFAULT 0,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- 約束條件
  CONSTRAINT valid_trade_type CHECK (
    trade_type IN ('sell', 'buy', 'exchange')
  ),
  CONSTRAINT valid_contact_method CHECK (
    contact_method IN ('discord', 'ingame')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('active', 'sold', 'cancelled', 'expired', 'suspended')
  ),
  -- 交換類型必須提供 wanted_item_id
  CONSTRAINT exchange_requires_wanted_item CHECK (
    (trade_type = 'exchange' AND wanted_item_id IS NOT NULL) OR
    (trade_type != 'exchange')
  ),
  -- 買賣類型必須提供 price
  CONSTRAINT trade_requires_price CHECK (
    (trade_type IN ('sell', 'buy') AND price IS NOT NULL) OR
    (trade_type = 'exchange')
  )
);

CREATE INDEX IF NOT EXISTS idx_active_listings ON listings(status, created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_search ON listings(item_id, price)
  WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trade_type ON listings(trade_type, created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wanted_item ON listings(wanted_item_id)
  WHERE wanted_item_id IS NOT NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_listings ON listings(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE listings IS '物品刊登表';
COMMENT ON COLUMN listings.trade_type IS '交易類型（sell/buy/exchange）';

-- ============================================================
-- 6. Interests 表（購買意向）
-- ============================================================

CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,

  -- 防止重複意向
  UNIQUE(listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_interests ON interests(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_interests ON interests(buyer_id, created_at DESC);

COMMENT ON TABLE interests IS '購買意向表';
COMMENT ON COLUMN interests.notified_at IS 'Webhook 通知時間';

-- ============================================================
-- 7. Audit Logs 表（操作審計記錄）
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

COMMENT ON TABLE audit_logs IS '操作審計記錄表';

-- ============================================================
-- 完成通知
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database schema initialized successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - users (用戶基本資料)';
    RAISE NOTICE '  - sessions (會話管理，含 token_expires_at, revoked_at)';
    RAISE NOTICE '  - discord_profiles (Discord 詳細資料，含 profile_privacy)';
    RAISE NOTICE '  - reputation_history (信譽歷史)';
    RAISE NOTICE '  - listings (物品刊登)';
    RAISE NOTICE '  - interests (購買意向)';
    RAISE NOTICE '  - audit_logs (審計記錄)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Set up Row Level Security (RLS) policies';
    RAISE NOTICE '  2. Configure environment variables';
    RAISE NOTICE '  3. Test Discord OAuth login flow';
    RAISE NOTICE '========================================';
END $$;
