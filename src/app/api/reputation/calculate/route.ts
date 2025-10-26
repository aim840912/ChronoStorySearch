import { NextRequest, NextResponse } from 'next/server'

/**
 * TODO [階段 3]: 實作重新計算信譽
 *
 * 功能需求:
 * - 驗證當前 session
 * - 僅限本人 (user_id = auth.uid())
 * - 計算信譽分數:
 *   - 基礎分 30 分
 *   - Discord 帳號年齡 (最高 20 分)
 *   - 伺服器成員年資 (最高 20 分)
 *   - 交易活躍度 (最高 15 分)
 *   - 刊登品質 (最高 15 分)
 * - 更新 discord_profiles.reputation_score
 * - 記錄 reputation_history
 *
 * 認證要求: 🔒 需要認證 (withAuthAndError)
 * 參考文件: docs/architecture/交易系統/04-Discord整合.md
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: '重新計算信譽尚未實作',
      code: 'NOT_IMPLEMENTED'
    },
    { status: 501 }
  )
}
