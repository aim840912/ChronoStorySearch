-- ============================================================
-- Migration: 驗證外鍵關係設定
-- ============================================================
-- 建立日期：2025-10-27
-- 用途：檢查所有表的外鍵關係是否正確設定
-- ============================================================

-- ============================================================
-- 步驟 1：檢查所有外鍵約束
-- ============================================================

SELECT
  tc.table_name AS "Table",
  kcu.column_name AS "Column",
  ccu.table_name AS "References Table",
  ccu.column_name AS "References Column",
  tc.constraint_name AS "Constraint Name"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;

-- ============================================================
-- 步驟 2：檢查 discord_profiles 表結構
-- ============================================================

SELECT
  column_name AS "Column",
  data_type AS "Type",
  is_nullable AS "Nullable",
  column_default AS "Default"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'discord_profiles'
ORDER BY ordinal_position;

-- ============================================================
-- 步驟 3：檢查 users 表結構
-- ============================================================

SELECT
  column_name AS "Column",
  data_type AS "Type",
  is_nullable AS "Nullable",
  column_default AS "Default"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================
-- 步驟 4：檢查 listings 表結構
-- ============================================================

SELECT
  column_name AS "Column",
  data_type AS "Type",
  is_nullable AS "Nullable",
  column_default AS "Default"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'listings'
ORDER BY ordinal_position;

-- ============================================================
-- 步驟 5：測試 JOIN 路徑
-- ============================================================
-- 這個查詢應該成功執行，測試 listings → users → discord_profiles 的 JOIN

SELECT
  l.id AS listing_id,
  l.item_id,
  l.price,
  u.discord_username,
  dp.reputation_score
FROM listings l
INNER JOIN users u ON l.user_id = u.id
LEFT JOIN discord_profiles dp ON u.id = dp.user_id
WHERE l.status = 'active'
  AND l.deleted_at IS NULL
LIMIT 5;

-- ============================================================
-- 完成通知
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Foreign key verification completed!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Please review the query results above to verify:';
    RAISE NOTICE '  1. All foreign key constraints are properly set';
    RAISE NOTICE '  2. discord_profiles.user_id references users.id';
    RAISE NOTICE '  3. listings.user_id references users.id';
    RAISE NOTICE '  4. JOIN path works correctly';
    RAISE NOTICE '========================================';
END $$;
