-- Migration: 更新維護訊息預設值
-- Purpose: 將硬編碼中文預設值改為空字串，讓前端翻譯系統處理
-- Created: 2025-10-31

-- =====================================================
-- 更新維護訊息預設值
-- =====================================================
-- 只更新值為預設中文訊息的記錄，避免覆蓋管理員自訂的訊息
UPDATE system_settings
SET
  value = '""',  -- 空字串（JSON 格式）
  description = '維護模式顯示訊息（空值時由前端翻譯系統提供預設訊息）'
WHERE
  key = 'maintenance_message'
  AND value = '"系統維護中，請稍後再試"';

-- 說明：
-- 當 maintenance_message 為空字串時：
-- - Admin 頁面會顯示 "尚未設定維護訊息" / "No maintenance message set"
-- - 前端橫幅會使用翻譯系統的預設訊息，根據語言自動切換
--   - 中文：「系統維護中，請稍後再試」
--   - 英文："System under maintenance, please try again later"
