-- Migration: 新增登入使用者公告 Banner 設定
-- Date: 2025-11-03
-- Description: 新增系統設定項目，用於控制登入使用者的全域公告訊息

-- 新增登入使用者公告設定
INSERT INTO system_settings (key, value, description, updated_at)
VALUES
  ('login_banner_enabled', 'true', '登入使用者公告 Banner 是否啟用', NOW()),
  ('login_banner_message', '"市場功能還在測試中，流量爆掉隨時會關"', '登入使用者公告訊息', NOW())
ON CONFLICT (key) DO NOTHING;
