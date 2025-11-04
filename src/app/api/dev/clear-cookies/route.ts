/**
 * 開發環境專用：清除所有 cookies
 * 訪問 http://localhost:3000/api/dev/clear-cookies 即可清除
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ message: 'Cookies cleared' })

  // 清除所有可能的 cookie
  const cookiesToClear = [
    'maplestory_session',
    'sb-access-token',
    'sb-refresh-token',
    'sb-kngkrgmfhihsrncovwbr-auth-token',
  ]

  cookiesToClear.forEach(name => {
    response.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
    })
  })

  return response
}
