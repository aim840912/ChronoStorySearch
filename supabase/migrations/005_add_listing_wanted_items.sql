-- Migration: 新增 listing_wanted_items 關聯表，支援多個想要物品
-- 用途：將交換刊登從單一想要物品改為支援最多 3 個想要物品
-- 日期：2025-10-28

-- ============================================================
-- 1. 建立關聯表：listing_wanted_items
-- ============================================================

CREATE TABLE listing_wanted_items (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  item_id INT NOT NULL,
  quantity INT DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 防止同一個 listing 重複添加相同物品
  UNIQUE(listing_id, item_id)
);

-- ============================================================
-- 2. 建立索引：加速查詢效能
-- ============================================================

-- 索引：根據 listing_id 查詢（刊登詳情）
CREATE INDEX idx_listing_wanted_items_listing
  ON listing_wanted_items(listing_id);

-- 索引：根據 item_id 查詢（交換匹配）
CREATE INDEX idx_listing_wanted_items_item
  ON listing_wanted_items(item_id)
  WHERE item_id IS NOT NULL;

-- ============================================================
-- 3. 設定 Row Level Security (RLS) 政策
-- ============================================================

-- 啟用 RLS
ALTER TABLE listing_wanted_items ENABLE ROW LEVEL SECURITY;

-- 政策 1：任何人可以查看活躍刊登的想要物品
CREATE POLICY "Anyone can view wanted items of active listings"
  ON listing_wanted_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_wanted_items.listing_id
        AND listings.status = 'active'
    )
  );

-- 政策 2：刊登擁有者可以管理自己的想要物品
CREATE POLICY "Users can manage their own listing wanted items"
  ON listing_wanted_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_wanted_items.listing_id
        AND listings.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. 移除舊的約束條件
-- ============================================================

-- 移除「交換類型必須提供 wanted_item_id」的約束
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS exchange_requires_wanted_item;

-- ============================================================
-- 5. 標記舊欄位為 DEPRECATED（保留欄位以便回滾）
-- ============================================================

COMMENT ON COLUMN listings.wanted_item_id IS 'DEPRECATED: Use listing_wanted_items table instead. Will be removed in future migration.';
COMMENT ON COLUMN listings.wanted_quantity IS 'DEPRECATED: Use listing_wanted_items table instead. Will be removed in future migration.';

-- ============================================================
-- 6. 資料遷移：將現有資料遷移到新表
-- ============================================================

-- 將現有的 wanted_item_id 遷移到 listing_wanted_items 表
INSERT INTO listing_wanted_items (listing_id, item_id, quantity)
SELECT
  id,
  wanted_item_id,
  COALESCE(wanted_quantity, 1)
FROM listings
WHERE wanted_item_id IS NOT NULL
  AND trade_type = 'exchange'
  AND status = 'active';

-- ============================================================
-- 7. 清空舊欄位資料（但保留欄位結構）
-- ============================================================

-- 清空舊欄位的資料，但保留欄位定義以便需要時回滾
UPDATE listings
SET
  wanted_item_id = NULL,
  wanted_quantity = NULL
WHERE wanted_item_id IS NOT NULL;

-- ============================================================
-- 完成！migration 說明
-- ============================================================

-- 此 migration 完成以下工作：
-- ✅ 建立 listing_wanted_items 關聯表（一對多）
-- ✅ 設定適當的索引和約束
-- ✅ 配置 RLS 安全政策
-- ✅ 遷移現有資料到新表
-- ✅ 標記舊欄位為 deprecated（暫時保留以便回滾）
--
-- 注意事項：
-- - 舊欄位 wanted_item_id 和 wanted_quantity 暫時保留
-- - 未來可以透過新的 migration 移除這些欄位
-- - 如需回滾，可以將資料從 listing_wanted_items 遷移回去
