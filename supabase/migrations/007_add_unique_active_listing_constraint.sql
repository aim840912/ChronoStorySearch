-- Migration: 添加唯一性約束，防止用戶重複刊登相同物品
-- 用途：解決競態條件（race condition）導致的重複刊登問題
-- 日期: 2025-10-29
--
-- 問題描述：
-- - 用戶同時發送多個刊登請求時，可能繞過應用層的檢查
-- - Check-Then-Act 反模式導致多個請求同時通過配額檢查
-- - 缺少資料庫層級的約束保護
--
-- 解決方案：
-- - 在資料庫層級添加部分唯一索引（partial unique index）
-- - 防止同一用戶同時擁有多個相同物品的活躍刊登
-- - 不影響已取消、已售出或已過期的刊登

-- ============================================================
-- 1. 添加部分唯一索引：防止重複刊登
-- ============================================================

-- 注意：PostgreSQL 的部分唯一約束需要使用 CREATE UNIQUE INDEX
-- 而不是 ALTER TABLE ADD CONSTRAINT，因為 WHERE 子句只在索引中支援

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_listing_per_user_item
  ON listings(user_id, item_id)
  WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================================
-- 2. 添加註釋說明約束用途
-- ============================================================

COMMENT ON INDEX unique_active_listing_per_user_item IS
  '防止同一用戶同時擁有多個相同物品的活躍刊登。此約束只適用於 status=active 且未刪除的刊登。';

-- ============================================================
-- 完成！migration 說明
-- ============================================================

-- 此 migration 完成以下工作：
-- ✅ 添加部分唯一索引，防止重複刊登
-- ✅ 只約束活躍刊登（status='active' AND deleted_at IS NULL）
-- ✅ 允許同一物品的歷史刊登（已取消、已售出等）
-- ✅ 提供資料庫層級的並發控制保護
--
-- 效果：
-- - 即使應用層有 bug，也無法插入重複的活躍刊登
-- - 並發請求會收到唯一性違反錯誤（23505 error code）
-- - 應用層可以捕獲此錯誤並返回友善的錯誤訊息
--
-- 回滾方式：
-- DROP INDEX IF EXISTS unique_active_listing_per_user_item;
