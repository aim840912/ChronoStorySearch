-- ============================================================
-- Migration: 修復 Sessions 表結構
-- ============================================================
-- 目的：添加程式碼中使用但資料庫缺少的欄位
-- 建立日期：2025-10-26
-- 影響表：sessions, discord_profiles
-- ============================================================

-- ============================================================
-- 1. 修復 sessions 表
-- ============================================================

-- 1.1 添加 token_expires_at 欄位（Discord token 過期時間）
-- 用途：追蹤 Discord access_token 的過期時間，用於自動刷新
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions' AND column_name = 'token_expires_at'
    ) THEN
        ALTER TABLE sessions
        ADD COLUMN token_expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days';

        RAISE NOTICE 'Added token_expires_at column to sessions table';
    ELSE
        RAISE NOTICE 'token_expires_at column already exists in sessions table';
    END IF;
END $$;

-- 1.2 添加 revoked_at 欄位（登出時標記）
-- 用途：標記 session 已被撤銷（用戶登出），防止已撤銷的 session 被重用
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions' AND column_name = 'revoked_at'
    ) THEN
        ALTER TABLE sessions
        ADD COLUMN revoked_at TIMESTAMPTZ DEFAULT NULL;

        RAISE NOTICE 'Added revoked_at column to sessions table';
    ELSE
        RAISE NOTICE 'revoked_at column already exists in sessions table';
    END IF;
END $$;

-- 1.3 建立索引（優化查詢效能）
-- 查詢未撤銷的 session
-- 注意：移除 NOW() 條件（PostgreSQL 要求索引 WHERE 條件使用 IMMUTABLE 函數）
-- 查詢時仍需加上 expires_at > NOW() 過濾條件
CREATE INDEX IF NOT EXISTS idx_sessions_active
ON sessions(user_id, expires_at DESC)
WHERE revoked_at IS NULL;

-- 查詢需要刷新的 token
-- 注意：移除 NOW() 條件（同上原因）
-- 查詢時仍需加上 token_expires_at > NOW() 過濾條件
CREATE INDEX IF NOT EXISTS idx_sessions_token_expiry
ON sessions(user_id, token_expires_at)
WHERE revoked_at IS NULL;

-- ============================================================
-- 2. 修復 discord_profiles 表
-- ============================================================

-- 2.1 添加 profile_privacy 欄位（用戶隱私設定）
-- 用途：控制用戶資料的可見性（public, friends_only, private）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'discord_profiles' AND column_name = 'profile_privacy'
    ) THEN
        ALTER TABLE discord_profiles
        ADD COLUMN profile_privacy TEXT DEFAULT 'public' NOT NULL
        CHECK (profile_privacy IN ('public', 'friends_only', 'private'));

        RAISE NOTICE 'Added profile_privacy column to discord_profiles table';
    ELSE
        RAISE NOTICE 'profile_privacy column already exists in discord_profiles table';
    END IF;
END $$;

-- ============================================================
-- 3. 驗證結果
-- ============================================================

-- 檢查 sessions 表結構
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- 檢查 discord_profiles 表結構
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'discord_profiles'
ORDER BY ordinal_position;

-- ============================================================
-- 完成通知
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 01 completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sessions table: Added token_expires_at, revoked_at';
    RAISE NOTICE 'Discord_profiles table: Added profile_privacy';
    RAISE NOTICE 'Created indexes for performance optimization';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next step: Test Discord OAuth login flow';
    RAISE NOTICE 'Expected: Session creation should now succeed';
    RAISE NOTICE '========================================';
END $$;
