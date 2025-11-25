/**
 * 登入使用者公告橫幅
 *
 * 功能：
 * - 向登入使用者顯示全域公告訊息
 * - 支援管理員在後台設定公告內容
 * - 只有登入使用者才會看到此橫幅
 * - 支援深色模式
 * - 固定在頁面頂部，不可關閉
 *
 * 使用位置：
 * - src/app/layout.tsx（Root Layout，在 MaintenanceBanner 下方）
 *
 * 設計規範：
 * - ❌ 不使用漸層（遵循 CLAUDE.md UI 規範）
 * - ❌ 不使用 Emoji（遵循 CLAUDE.md UI 規範）
 * - ✅ 使用 SVG 資訊圖示
 * - ✅ 支援深色模式
 * - ✅ 使用藍色（資訊色），與維護模式的琥珀色區分
 *
 * 注意：暫時停用此功能（移除 useSystemStatus API）
 */

'use client'

export function LoginUserBanner() {
  // 暫時停用此功能（移除 useSystemStatus API，之後可恢復）
  return null
}
