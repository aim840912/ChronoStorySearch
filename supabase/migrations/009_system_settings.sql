-- Migration: 系統設定表
-- Purpose: 支援動態功能開關，無需重啟服務
-- Created: 2025-10-29

-- =====================================================
-- 1. 建立 system_settings 表
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- 新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at DESC);

-- =====================================================
-- 2. 插入預設系統設定
-- =====================================================
INSERT INTO system_settings (key, value, description) VALUES
  ('trading_system_enabled', 'true', '交易系統開關：true=啟用, false=關閉'),
  ('maintenance_mode', 'false', '維護模式：true=啟用維護模式, false=正常運作'),
  ('maintenance_message', '"系統維護中，請稍後再試"', '維護模式顯示訊息')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. 啟用 Row Level Security (RLS)
-- =====================================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS 策略：所有人可讀取
-- =====================================================
CREATE POLICY "所有人可讀取系統設定"
  ON system_settings
  FOR SELECT
  USING (true);

-- =====================================================
-- 5. RLS 策略：僅管理員可更新
-- =====================================================
CREATE POLICY "僅管理員可更新系統設定"
  ON system_settings
  FOR UPDATE
  USING (
    -- 檢查用戶是否為管理員或協管
    EXISTS (
      SELECT 1
      FROM discord_profiles
      WHERE user_id = auth.uid()
        AND ('Admin' = ANY(server_roles) OR 'Moderator' = ANY(server_roles))
    )
  )
  WITH CHECK (
    -- 再次檢查更新時的權限
    EXISTS (
      SELECT 1
      FROM discord_profiles
      WHERE user_id = auth.uid()
        AND ('Admin' = ANY(server_roles) OR 'Moderator' = ANY(server_roles))
    )
  );

-- =====================================================
-- 6. 建立更新時間觸發器
-- =====================================================
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_update_timestamp
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_timestamp();

-- =====================================================
-- 7. 新增註解
-- =====================================================
COMMENT ON TABLE system_settings IS '系統設定表：支援動態功能開關';
COMMENT ON COLUMN system_settings.key IS '設定鍵（唯一識別）';
COMMENT ON COLUMN system_settings.value IS '設定值（JSON 格式）';
COMMENT ON COLUMN system_settings.description IS '設定說明';
COMMENT ON COLUMN system_settings.updated_at IS '最後更新時間';
COMMENT ON COLUMN system_settings.updated_by IS '最後更新者（用戶 ID）';
