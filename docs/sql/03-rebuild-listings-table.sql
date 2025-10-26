-- ============================================================
-- Migration: 重建 Listings 和 Interests 表
-- ============================================================
-- 建立日期：2025-10-26
-- 用途：修復 listings 表缺少 trade_type 等欄位的問題
-- 警告：此腳本會刪除 listings 和 interests 表的所有資料
-- ============================================================

-- ============================================================
-- 步驟 1：刪除現有表（含 CASCADE 刪除依賴）
-- ============================================================

DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS listings CASCADE;

-- ============================================================
-- 步驟 2：重新建立 Listings 表（完整版本）
-- ============================================================

CREATE TABLE listings (
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

-- 建立索引
CREATE INDEX idx_active_listings ON listings(status, created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX idx_item_search ON listings(item_id, price)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX idx_trade_type ON listings(trade_type, created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX idx_wanted_item ON listings(wanted_item_id)
  WHERE wanted_item_id IS NOT NULL AND status = 'active';

CREATE INDEX idx_user_listings ON listings(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 添加註解
COMMENT ON TABLE listings IS '物品刊登表';
COMMENT ON COLUMN listings.trade_type IS '交易類型（sell/buy/exchange）';

-- ============================================================
-- 步驟 3：重新建立 Interests 表
-- ============================================================

CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,

  -- 防止重複意向
  UNIQUE(listing_id, buyer_id)
);

-- 建立索引
CREATE INDEX idx_listing_interests ON interests(listing_id, created_at DESC);
CREATE INDEX idx_buyer_interests ON interests(buyer_id, created_at DESC);

-- 添加註解
COMMENT ON TABLE interests IS '購買意向表';
COMMENT ON COLUMN interests.notified_at IS 'Webhook 通知時間';

-- ============================================================
-- 步驟 4：啟用 RLS（Row Level Security）
-- ============================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 完成通知
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Listings and Interests tables rebuilt successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Completed actions:';
    RAISE NOTICE '  ✅ Dropped old listings and interests tables';
    RAISE NOTICE '  ✅ Created new listings table with all fields';
    RAISE NOTICE '  ✅ Created new interests table';
    RAISE NOTICE '  ✅ Applied indexes and constraints';
    RAISE NOTICE '  ✅ Enabled RLS on both tables';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table structure:';
    RAISE NOTICE '  - trade_type: TEXT (sell/buy/exchange)';
    RAISE NOTICE '  - wanted_item_id: INT (for exchange)';
    RAISE NOTICE '  - wanted_quantity: INT (for exchange)';
    RAISE NOTICE '  - All constraints and indexes applied';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next step:';
    RAISE NOTICE '  Test the listing creation API at /api/listings';
    RAISE NOTICE '========================================';
END $$;
