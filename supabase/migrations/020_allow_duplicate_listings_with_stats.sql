/**
 * Migration: 020_allow_duplicate_listings_with_stats
 *
 * 目的：允許相同物品但不同屬性的刊登
 *
 * 業務需求：
 * - 用戶希望能夠刊登同一物品的不同版本（例如：同一把武器但攻擊力不同）
 * - 在 MapleStory 中，同一物品可能因為升級卷軸而有不同的屬性
 *
 * 問題描述：
 * - Migration 007 的 unique_active_listing_per_user_item 索引只檢查 (user_id, item_id)
 * - 不考慮 item_stats（物品屬性），導致無法創建同一物品但不同屬性的刊登
 *
 * 用戶需求：
 * 1. 有屬性的刊登：完全無限制（即使屬性相同也可以創建多個）
 * 2. 無屬性的刊登：每個用戶每個物品只能有一個活躍刊登
 *
 * 解決方案：
 * - 移除舊的 unique index（限制所有刊登）
 * - 創建新的條件式 unique index（只限制無屬性刊登）
 */

-- ============================================================
-- 1. 移除舊的 unique index
-- ============================================================

-- 移除 Migration 007 創建的索引（限制所有相同物品的刊登）
DROP INDEX IF EXISTS unique_active_listing_per_user_item;

COMMENT ON TABLE listings IS
  '已移除索引: unique_active_listing_per_user_item（原限制所有相同物品刊登）';

-- ============================================================
-- 2. 創建新的條件式 unique index
-- ============================================================

-- 只對無屬性刊登（item_stats IS NULL）進行唯一性檢查
-- 有屬性的刊登完全不受限制，可以創建任意多個
CREATE UNIQUE INDEX unique_active_listing_per_user_item_no_stats
  ON listings(user_id, item_id)
  WHERE status = 'active' AND deleted_at IS NULL AND item_stats IS NULL;

-- ============================================================
-- 3. 添加註釋說明
-- ============================================================

COMMENT ON INDEX unique_active_listing_per_user_item_no_stats IS
  '防止同一用戶對同一物品創建多個無屬性刊登。有 item_stats 的刊登不受此限制，可創建任意多個。';

-- ============================================================
-- 完成！migration 說明
-- ============================================================

-- 此 migration 完成以下工作：
-- ✅ 移除舊的 unique index（限制所有刊登）
-- ✅ 創建新的條件式 unique index（只限制無屬性刊登）
-- ✅ 允許相同物品但不同屬性的刊登
-- ✅ 允許相同物品且相同屬性的多個刊登
-- ✅ 保持無屬性刊登的唯一性限制（避免垃圾信息）
--
-- 效果：
-- - 有屬性刊登：完全無限制，可創建任意多個
--   例如：屠龍者 92攻、屠龍者 97攻、屠龍者 92攻（第二把）
-- - 無屬性刊登：每個用戶每個物品只能有一個活躍刊登
--   例如：Blue Bandana（無屬性）只能有一個
--
-- 回滾方式：
-- DROP INDEX IF EXISTS unique_active_listing_per_user_item_no_stats;
-- CREATE UNIQUE INDEX unique_active_listing_per_user_item
--   ON listings(user_id, item_id)
--   WHERE status = 'active' AND deleted_at IS NULL;
