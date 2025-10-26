-- ============================================================
-- 驗證當前資料庫狀態
-- ============================================================
-- 建立日期：2025-10-27
-- 用途：快速檢查 RLS、外鍵和資料狀態
-- ============================================================

-- ============================================================
-- 1. RLS 狀態檢查
-- ============================================================

SELECT
  'RLS 狀態檢查' AS section,
  tablename AS "Table",
  CASE
    WHEN rowsecurity THEN '✅ 已啟用'
    ELSE '❌ 未啟用'
  END AS "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'sessions',
    'discord_profiles',
    'reputation_history',
    'listings',
    'interests',
    'audit_logs'
  )
ORDER BY tablename;

-- ============================================================
-- 2. 外鍵關係檢查
-- ============================================================

SELECT
  'Foreign Key 檢查' AS section,
  tc.table_name AS "From Table",
  kcu.column_name AS "From Column",
  ccu.table_name AS "To Table",
  ccu.column_name AS "To Column"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('discord_profiles', 'listings', 'interests')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================
-- 3. 測試 JOIN 查詢（listings → users → discord_profiles）
-- ============================================================

SELECT
  'JOIN 測試' AS section,
  l.id AS listing_id,
  u.discord_username,
  COALESCE(dp.reputation_score, 0) AS reputation_score,
  CASE
    WHEN dp.user_id IS NOT NULL THEN '✅ 有 discord_profile'
    ELSE '⚠️  無 discord_profile'
  END AS profile_status
FROM listings l
INNER JOIN users u ON l.user_id = u.id
LEFT JOIN discord_profiles dp ON u.id = dp.user_id
WHERE l.status = 'active'
  AND l.deleted_at IS NULL
LIMIT 5;

-- ============================================================
-- 4. discord_profiles 資料統計
-- ============================================================

SELECT
  'discord_profiles 統計' AS section,
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT dp.user_id) AS users_with_profile,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT dp.user_id) AS users_without_profile,
  ROUND(
    100.0 * COUNT(DISTINCT dp.user_id) / NULLIF(COUNT(DISTINCT u.id), 0),
    2
  ) AS profile_coverage_percentage
FROM users u
LEFT JOIN discord_profiles dp ON u.id = dp.user_id;

-- ============================================================
-- 5. 驗證摘要
-- ============================================================

DO $$
DECLARE
  rls_enabled_count INT;
  total_tables INT := 7; -- users, sessions, discord_profiles, reputation_history, listings, interests, audit_logs
  fk_count INT;
  users_count INT;
  profiles_count INT;
BEGIN
  -- 檢查 RLS
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('users', 'sessions', 'discord_profiles', 'reputation_history', 'listings', 'interests', 'audit_logs')
    AND c.relrowsecurity = true;

  -- 檢查外鍵
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
    AND table_name IN ('discord_profiles', 'listings', 'interests');

  -- 檢查資料
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO profiles_count FROM discord_profiles;

  RAISE NOTICE '========================================';
  RAISE NOTICE '資料庫狀態驗證摘要';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS 狀態：% / % 表已啟用', rls_enabled_count, total_tables;
  RAISE NOTICE '✅ 外鍵關係：% 個外鍵設定', fk_count;
  RAISE NOTICE '📊 資料統計：';
  RAISE NOTICE '  - Users: %', users_count;
  RAISE NOTICE '  - Discord Profiles: %', profiles_count;
  RAISE NOTICE '';

  IF rls_enabled_count = total_tables THEN
    RAISE NOTICE '✅ RLS 完整性檢查通過';
  ELSE
    RAISE WARNING '⚠️  有 % 個表尚未啟用 RLS', (total_tables - rls_enabled_count);
  END IF;

  IF fk_count >= 3 THEN
    RAISE NOTICE '✅ 外鍵關係檢查通過';
  ELSE
    RAISE WARNING '⚠️  外鍵數量少於預期';
  END IF;

  RAISE NOTICE '========================================';
END $$;
