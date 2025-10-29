/**
 * 系統設定管理 API
 *
 * 路由：/api/admin/system-settings
 *
 * 權限：僅限管理員（Discord 角色為 Admin 或 Moderator）
 *
 * 功能：
 * - GET  - 查詢所有系統設定
 * - PATCH - 更新單一系統設定
 *
 * @module admin-system-settings
 */

import { NextRequest } from 'next/server'
import { withAdminAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { clearSettingsCache } from '@/lib/config/system-config'
import { apiLogger } from '@/lib/logger'

// =====================================================
// GET - 查詢所有系統設定
// =====================================================

async function handleGET(_request: NextRequest, user: User) {
  apiLogger.info('管理員查詢系統設定', { userId: user.id })

  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('*')
    .order('key')

  if (error) {
    apiLogger.error('查詢系統設定失敗', { error: error.message })
    throw new ValidationError('查詢系統設定失敗')
  }

  return success(data, '查詢成功')
}

// =====================================================
// PATCH - 更新系統設定
// =====================================================

interface UpdateSettingRequest {
  key: string
  value: boolean | string
}

async function handlePATCH(request: NextRequest, user: User) {
  const body: UpdateSettingRequest = await request.json()

  // 驗證請求參數
  if (!body.key) {
    throw new ValidationError('缺少必要參數：key')
  }

  if (body.value === undefined || body.value === null) {
    throw new ValidationError('缺少必要參數：value')
  }

  apiLogger.info('管理員更新系統設定', {
    userId: user.id,
    key: body.key,
    value: body.value
  })

  // 更新資料庫
  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .update({
      value: body.value,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('key', body.key)
    .select()
    .single()

  if (error) {
    apiLogger.error('更新系統設定失敗', {
      key: body.key,
      error: error.message
    })
    throw new ValidationError(`更新系統設定失敗：${error.message}`)
  }

  // 清除快取，確保下次查詢能獲取最新設定
  clearSettingsCache()

  apiLogger.info('系統設定更新成功', {
    userId: user.id,
    key: body.key,
    newValue: data.value
  })

  return success(data, '更新成功')
}

// =====================================================
// 匯出 API Handlers
// =====================================================

export const GET = withAdminAndError(handleGET, {
  module: 'AdminSystemSettingsAPI',
  enableAuditLog: false
})

export const PATCH = withAdminAndError(handlePATCH, {
  module: 'AdminSystemSettingsAPI',
  enableAuditLog: true // 啟用審計日誌記錄管理員操作
})
