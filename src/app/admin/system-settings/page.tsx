/**
 * 管理員系統設定頁面 - Server Component（權限保護）
 *
 * 路由：/admin/system-settings
 *
 * 功能：
 * - 服務器端驗證 session
 * - 服務器端檢查管理員權限
 * - 未授權使用者直接重導向（無法看到頁面）
 * - 已授權使用者渲染 Client Component 互動內容
 *
 * 權限：僅管理員（Admin/Moderator）可存取
 *
 * 安全性：
 * - ✅ 服務器端驗證（無法繞過）
 * - ✅ 未授權使用者永遠看不到頁面內容
 * - ✅ 符合 Next.js 15 最佳實踐
 */

import { redirect } from 'next/navigation'
import { validateSessionFromCookies } from '@/lib/auth/session-validator-server'
import { checkIsAdmin } from '@/lib/auth/admin-validator'
import SettingsContent from './SettingsContent'

// 強制動態渲染（因為使用 cookies 進行認證）
export const dynamic = 'force-dynamic'

export default async function SystemSettingsPage() {
  // 1. 驗證 session（服務器端）
  const { valid, user } = await validateSessionFromCookies()

  // 未登入 → 重導向首頁
  if (!valid || !user) {
    redirect('/')
  }

  // 2. 檢查管理員權限（服務器端）
  const isAdmin = await checkIsAdmin(user)

  // 非管理員 → 重導向首頁
  if (!isAdmin) {
    redirect('/')
  }

  // 3. 已驗證為管理員 → 渲染 Client Component 內容
  return <SettingsContent />
}
