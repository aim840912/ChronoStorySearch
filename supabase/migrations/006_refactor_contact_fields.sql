-- ============================================================
-- Migration: 重構聯絡方式欄位為「Discord 必填 + 遊戲內選填」
-- Purpose:
--   1. Discord 聯絡方式改為必填（來自 OAuth 登入）
--   2. 遊戲內角色名改為選填
--   3. 移除 contact_method 選擇器，改用雙欄位模式
-- Date: 2025-10-29
-- ============================================================

-- ============================================================
-- 步驟 1: 新增遊戲內角色名欄位（選填）
-- ============================================================
ALTER TABLE listings
ADD COLUMN ingame_name TEXT;

COMMENT ON COLUMN listings.ingame_name IS '遊戲內角色名（選填）';

-- ============================================================
-- 步驟 2: 資料遷移 - 將 ingame 類型的聯絡資訊移到新欄位
-- ============================================================
-- 對於 contact_method = 'ingame' 的刊登：
--   - 將 contact_info 的值移到 ingame_name
--   - 從 users 表取得 discord_username 填入 contact_info
UPDATE listings l
SET ingame_name = l.contact_info,
    contact_info = u.discord_username
FROM users u
WHERE l.user_id = u.id
  AND l.contact_method = 'ingame'
  AND u.discord_username IS NOT NULL;

-- 處理沒有 discord_username 的情況（使用 discord_id 作為備援）
UPDATE listings l
SET contact_info = COALESCE(u.discord_username, u.discord_id)
FROM users u
WHERE l.user_id = u.id
  AND l.contact_method = 'ingame'
  AND l.contact_info IS NULL;

-- ============================================================
-- 步驟 3: 重新命名 contact_info 為 discord_contact
-- ============================================================
ALTER TABLE listings
RENAME COLUMN contact_info TO discord_contact;

COMMENT ON COLUMN listings.discord_contact IS 'Discord 聯絡方式（必填，來自 OAuth 登入）';

-- ============================================================
-- 步驟 4: 設定 discord_contact 為 NOT NULL
-- ============================================================
-- 先確保所有現有資料都有值（以防萬一）
UPDATE listings l
SET discord_contact = COALESCE(u.discord_username, u.discord_id)
FROM users u
WHERE l.user_id = u.id
  AND l.discord_contact IS NULL;

-- 設定 NOT NULL 約束
ALTER TABLE listings
ALTER COLUMN discord_contact SET NOT NULL;

-- ============================================================
-- 步驟 5: 移除 contact_method 欄位及其約束
-- ============================================================
-- 先移除 CHECK 約束
ALTER TABLE listings
DROP CONSTRAINT IF EXISTS valid_contact_method;

-- 移除欄位
ALTER TABLE listings
DROP COLUMN contact_method;

-- ============================================================
-- 完成提示
-- ============================================================
-- Migration 006: Refactor Contact Fields
-- Created: 2025-10-29
-- Description:
--   - 新增 ingame_name 欄位（選填）
--   - contact_info → discord_contact（必填）
--   - 移除 contact_method 欄位
--   - 所有刊登現在都必須有 Discord 聯絡方式
--   - 遊戲內角色名為額外的選填資訊
