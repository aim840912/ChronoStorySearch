import { NextRequest, NextResponse } from 'next/server'

/**
 * TODO [階段 3]: 實作獲取用戶信譽
 *
 * 功能需求:
 * - 驗證當前 session (防止爬蟲)
 * - 查詢 discord_profiles 表
 * - 返回: reputation_score, account_created_at, server_member_since
 * - 返回信譽歷史 (最近 10 筆)
 *
 * 認證要求: 🔒 需要認證 (withAuthAndError)
 * 參考文件: docs/architecture/交易系統/03-API設計.md
 * 參考文件: docs/architecture/交易系統/04-Discord整合.md
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  return NextResponse.json(
    {
      success: false,
      error: '獲取用戶信譽尚未實作',
      code: 'NOT_IMPLEMENTED'
    },
    { status: 501 }
  )
}
