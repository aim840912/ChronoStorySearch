/**
 * 安全功能驗證腳本
 *
 * 用途：
 * 1. 驗證 RLS 是否正確阻止 ANON_KEY 訪問
 * 2. 驗證 Service Role 是否能正常訪問
 * 3. 驗證 Token 加密/解密功能
 *
 * 執行方式：
 * npx tsx scripts/verify-security.ts
 */

import { createClient } from '@supabase/supabase-js'
import { encryptToken, decryptToken } from '../src/lib/auth/token-encryption'

// 環境變數
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 顏色輸出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
}

const log = {
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️ ${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️ ${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n${msg}\n${colors.blue}${'='.repeat(60)}${colors.reset}`),
}

/**
 * 驗證 1：RLS 是否阻止 ANON_KEY 訪問
 */
async function verifyRLSBlocking() {
  log.header('驗證 1：RLS 是否阻止 ANON_KEY 訪問')

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const tables = ['users', 'sessions', 'discord_profiles', 'listings', 'interests']

  for (const table of tables) {
    try {
      const { data, error } = await anonClient.from(table).select('*').limit(1)

      if (error) {
        log.success(`${table} - ANON_KEY 訪問被拒絕（RLS 生效）`)
        console.log(`  錯誤訊息: ${error.message}`)
      } else if (!data || data.length === 0) {
        log.success(`${table} - ANON_KEY 返回空陣列（RLS 生效）`)
      } else {
        log.error(`${table} - ANON_KEY 能讀取資料（RLS 未生效！）`)
        console.log(`  資料: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      log.error(`${table} - 查詢失敗: ${err}`)
    }
  }
}

/**
 * 驗證 2：Service Role 是否能正常訪問
 */
async function verifyServiceRoleAccess() {
  log.header('驗證 2：Service Role 是否能正常訪問')

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const tables = ['users', 'sessions', 'discord_profiles']

  for (const table of tables) {
    try {
      const { data, error, count } = await serviceClient
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        log.error(`${table} - Service Role 訪問失敗: ${error.message}`)
      } else {
        log.success(`${table} - Service Role 可正常訪問（${count} 筆資料）`)
      }
    } catch (err) {
      log.error(`${table} - 查詢失敗: ${err}`)
    }
  }
}

/**
 * 驗證 3：檢查 sessions 表中的 Token 格式
 */
async function verifyTokenEncryption() {
  log.header('驗證 3：檢查 sessions 表中的 Token 格式')

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const { data: sessions, error } = await serviceClient
      .from('sessions')
      .select('id, access_token, refresh_token, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      log.error(`無法查詢 sessions 表: ${error.message}`)
      return
    }

    if (!sessions || sessions.length === 0) {
      log.warning('sessions 表中無資料（尚未有用戶登入）')
      return
    }

    log.info(`檢查最近 ${sessions.length} 筆 session...`)

    let encryptedCount = 0
    let plaintextCount = 0

    for (const session of sessions) {
      const accessToken = session.access_token
      const refreshToken = session.refresh_token

      // 檢查是否為 Base64 加密格式
      const isEncrypted =
        accessToken.length > 100 && /^[A-Za-z0-9+/=]+$/.test(accessToken)

      if (isEncrypted) {
        encryptedCount++
        log.success(
          `Session ${session.id.substring(0, 8)}... - Token 已加密 (長度: ${accessToken.length})`
        )
      } else {
        plaintextCount++
        log.warning(
          `Session ${session.id.substring(0, 8)}... - Token 可能是明文（舊資料）`
        )
      }
    }

    console.log(`\n📊 統計：`)
    console.log(`  - 已加密: ${encryptedCount}`)
    console.log(`  - 明文（舊資料）: ${plaintextCount}`)
    console.log(
      `  - 加密率: ${((100 * encryptedCount) / sessions.length).toFixed(2)}%`
    )

    if (encryptedCount === sessions.length) {
      log.success('所有 Session 的 Token 都已加密 ✨')
    } else if (plaintextCount === sessions.length) {
      log.error('所有 Session 的 Token 都是明文（加密功能可能未啟用）')
    } else {
      log.warning('部分 Session 尚未加密（舊資料將在 refresh 時自動轉為加密）')
    }
  } catch (err) {
    log.error(`查詢失敗: ${err}`)
  }
}

/**
 * 驗證 4：測試加密/解密功能
 */
async function verifyEncryptionFunctions() {
  log.header('驗證 4：測試加密/解密功能')

  const testTokens = [
    'ya29.a0AfH6SMBxyz123',
    'test_access_token_1234567890',
    '這是一個包含中文的 token',
  ]

  for (const token of testTokens) {
    try {
      // 加密
      const encrypted = await encryptToken(token)
      log.info(`原始 Token: ${token.substring(0, 30)}...`)
      log.info(`加密後: ${encrypted.substring(0, 50)}...`)
      log.info(`加密後長度: ${encrypted.length}`)

      // 驗證是否為 Base64 格式
      if (/^[A-Za-z0-9+/=]+$/.test(encrypted)) {
        log.success('加密格式正確（Base64）')
      } else {
        log.error('加密格式不正確')
        continue
      }

      // 解密
      const decrypted = await decryptToken(encrypted)

      // 驗證解密結果
      if (decrypted === token) {
        log.success('解密成功，內容一致 ✨')
      } else {
        log.error('解密失敗，內容不一致')
        console.log(`  預期: ${token}`)
        console.log(`  實際: ${decrypted}`)
      }

      console.log()
    } catch (err) {
      log.error(`加密/解密測試失敗: ${err}`)
    }
  }
}

/**
 * 驗證 5：測試 Token 唯一性（Nonce 隨機性）
 */
async function verifyNonceUniqueness() {
  log.header('驗證 5：測試 Token 唯一性（Nonce 隨機性）')

  const testToken = 'test_token_for_nonce_check'

  try {
    // 加密同一個 token 3 次
    const encrypted1 = await encryptToken(testToken)
    const encrypted2 = await encryptToken(testToken)
    const encrypted3 = await encryptToken(testToken)

    log.info(`加密結果 1: ${encrypted1.substring(0, 50)}...`)
    log.info(`加密結果 2: ${encrypted2.substring(0, 50)}...`)
    log.info(`加密結果 3: ${encrypted3.substring(0, 50)}...`)

    // 檢查是否都不同
    const unique =
      encrypted1 !== encrypted2 && encrypted2 !== encrypted3 && encrypted1 !== encrypted3

    if (unique) {
      log.success('Nonce 隨機性正確（每次加密結果都不同） ✨')
    } else {
      log.error('Nonce 隨機性有問題（相同明文產生相同密文）')
    }

    // 驗證所有加密結果都能正確解密
    const decrypted1 = await decryptToken(encrypted1)
    const decrypted2 = await decryptToken(encrypted2)
    const decrypted3 = await decryptToken(encrypted3)

    if (decrypted1 === testToken && decrypted2 === testToken && decrypted3 === testToken) {
      log.success('所有加密結果都能正確解密 ✨')
    } else {
      log.error('部分加密結果無法正確解密')
    }
  } catch (err) {
    log.error(`Nonce 唯一性測試失敗: ${err}`)
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('\n🔐 MapleStory Trading System - 安全功能驗證\n')

  // 檢查環境變數
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    log.error('缺少 Supabase 環境變數')
    console.log('請確認 .env.local 包含以下變數：')
    console.log('  - NEXT_PUBLIC_SUPABASE_URL')
    console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.log('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    log.error('缺少 TOKEN_ENCRYPTION_KEY 環境變數')
    process.exit(1)
  }

  // 執行所有驗證
  await verifyRLSBlocking()
  await verifyServiceRoleAccess()
  await verifyTokenEncryption()
  await verifyEncryptionFunctions()
  await verifyNonceUniqueness()

  log.header('驗證完成 ✨')
  console.log('請檢查上述輸出，確認所有項目都顯示 ✅\n')
}

// 執行主函數
main().catch((err) => {
  log.error(`驗證腳本執行失敗: ${err}`)
  process.exit(1)
})
