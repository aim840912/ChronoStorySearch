/**
 * Migration 029: 刪除 get_user_info_with_quotas RPC 函數
 *
 * 原因：
 * - Supabase Auth 遷移後不再需要 sessions 表
 * - RPC 函數依賴 sessions 表查詢，導致 API 錯誤
 * - 改為在應用層直接查詢資料庫（更簡單、更易維護）
 *
 * 影響：
 * - /api/market/batch 已更新為直接查詢，不再使用此 RPC
 * - 無其他程式碼依賴此函數
 *
 * 日期：2025-11-05
 * Commit: [將在 commit 時填入]
 */

-- 刪除 get_user_info_with_quotas RPC 函數
DROP FUNCTION IF EXISTS get_user_info_with_quotas(UUID, UUID);

-- 記錄 migration 原因
COMMENT ON SCHEMA public IS
  'Removed get_user_info_with_quotas RPC function due to Supabase Auth migration (2025-11-05)';
