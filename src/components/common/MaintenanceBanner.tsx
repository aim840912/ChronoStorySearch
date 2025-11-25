/**
 * 維護模式通知橫幅
 *
 * 功能：
 * - 當系統進入維護模式時，在頁面頂部顯示警告橫幅
 * - 顯示管理員設定的自訂維護訊息
 * - 支援深色模式
 * - 固定在頁面頂部，不可關閉
 *
 * 使用位置：
 * - src/app/layout.tsx（Root Layout）
 *
 * 設計規範：
 * - ❌ 不使用漸層（遵循 CLAUDE.md UI 規範）
 * - ❌ 不使用 Emoji（遵循 CLAUDE.md UI 規範）
 * - ✅ 使用 SVG 警告圖示
 * - ✅ 支援深色模式
 *
 * 注意：暫時停用此功能（移除 useSystemStatus API）
 */

'use client'

export function MaintenanceBanner() {
  // 暫時停用此功能（移除 useSystemStatus API，之後可恢復）
  return null
}
