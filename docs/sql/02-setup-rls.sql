-- ============================================================
-- MapleStory Trading System - Row Level Security (RLS)
-- ============================================================
-- 建立日期：2025-10-26
-- 架構：Service Role + 自定義 Session 管理
--
-- 安全策略：
-- 1. 啟用所有表的 RLS
-- 2. 不授予 anon/authenticated 任何權限（我們不使用 Supabase Auth）
-- 3. 只允許 Service Role 訪問（透過應用層 API 控制權限）
-- 4. 即使 ANON_KEY 洩漏，也無法直接訪問資料庫
--
-- 注意：
-- - Service Role 會繞過 RLS（這是預期行為）
-- - 應用層使用 withAuthAndError 中間件控制權限
-- - RLS 作為備用防護層，防止直接資料庫訪問
-- ============================================================

-- ============================================================
-- 1. users 表
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 禁止 anon 和 authenticated 角色的所有訪問
-- Service Role 可以繞過 RLS（預設行為）

COMMENT ON TABLE users IS '用戶基本資料表 (僅 Service Role 可訪問)';

-- ============================================================
-- 2. sessions 表
-- ============================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- sessions 表包含加密的 access_token 和 refresh_token
-- 即使資料洩漏，token 也是加密的（XChaCha20-Poly1305）
-- 但仍然需要 RLS 防止未授權讀取

COMMENT ON TABLE sessions IS 'Session 管理表 (僅 Service Role 可訪問，tokens 已加密)';

-- ============================================================
-- 3. discord_profiles 表
-- ============================================================

ALTER TABLE discord_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE discord_profiles IS 'Discord 用戶詳細資料表 (僅 Service Role 可訪問)';

-- ============================================================
-- 4. reputation_history 表
-- ============================================================

ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE reputation_history IS '信譽變更歷史表 (僅 Service Role 可訪問)';

-- ============================================================
-- 5. listings 表
-- ============================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE listings IS '物品刊登表 (僅 Service Role 可訪問)';

-- ============================================================
-- 6. interests 表
-- ============================================================

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE interests IS '購買意向表 (僅 Service Role 可訪問)';

-- ============================================================
-- 7. audit_logs 表 (如果存在)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'audit_logs'
  ) THEN
    EXECUTE 'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'COMMENT ON TABLE audit_logs IS ''審計記錄表 (僅 Service Role 可訪問)''';
    RAISE NOTICE '✅ audit_logs - RLS 已啟用';
  ELSE
    RAISE NOTICE '⚠️  audit_logs - 表不存在，跳過';
  END IF;
END $$;

-- ============================================================
-- 安全驗證
-- ============================================================

-- 測試 RLS 是否生效（使用 anon 角色應該無法讀取）
DO $$
DECLARE
  table_name TEXT;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Row Level Security 配置驗證';
  RAISE NOTICE '========================================';

  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'sessions', 'discord_profiles', 'reputation_history', 'listings', 'interests')
  LOOP
    -- 檢查 RLS 是否啟用
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name;

    -- 檢查策略數量（預期為 0，因為我們不授予任何權限）
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_name;

    IF rls_enabled THEN
      RAISE NOTICE '✅ % - RLS 已啟用 (策略數量: %)', table_name, policy_count;
    ELSE
      RAISE WARNING '❌ % - RLS 未啟用', table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE '說明：';
  RAISE NOTICE '- Service Role 會繞過 RLS（預期行為）';
  RAISE NOTICE '- anon/authenticated 無任何權限（防止直接訪問）';
  RAISE NOTICE '- 應用層透過 API 中間件控制權限';
  RAISE NOTICE '========================================';
END $$;
