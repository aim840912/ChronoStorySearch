-- Migration: 新增 seller_discord_id 欄位到 listings 表
-- Purpose: 支援 Discord 一鍵私訊功能
-- Date: 2025-10-28

-- 1. 新增 seller_discord_id 欄位
ALTER TABLE listings
ADD COLUMN seller_discord_id TEXT;

-- 2. 為現有資料填充 discord_id（從 users 表）
UPDATE listings l
SET seller_discord_id = u.discord_id
FROM users u
WHERE l.user_id = u.id
  AND l.contact_method = 'discord'
  AND l.seller_discord_id IS NULL;

-- 3. 添加註解說明
COMMENT ON COLUMN listings.seller_discord_id IS '賣家的 Discord User ID，用於 Deep Link 私訊功能';
