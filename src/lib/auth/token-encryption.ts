/**
 * Token 加密工具
 *
 * 使用 XChaCha20-Poly1305 對稱加密演算法
 * - 256-bit 密鑰（從環境變數讀取）
 * - 192-bit nonce（隨機生成，避免重複）
 * - Authenticated Encryption（防篡改）
 *
 * 存儲格式：base64(nonce || ciphertext)
 * - Poly1305 MAC tag 已包含在 ciphertext 中
 *
 * 安全性考量：
 * 1. 每次加密使用唯一的 nonce（通過 randomBytes 生成）
 * 2. 密鑰必須妥善保管（存於環境變數）
 * 3. 加密後的資料包含認證標籤，防止篡改
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { randomBytes } from '@noble/ciphers/utils.js'

/**
 * 從環境變數取得加密密鑰
 * 必須是 64 字元的 hex 字串（256-bit）
 */
function getEncryptionKey(): Uint8Array {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY

  if (!keyHex) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not configured in environment variables'
    )
  }

  if (keyHex.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a 64-character hex string (256-bit)'
    )
  }

  // 將 hex 字串轉換為 Uint8Array
  return Uint8Array.from(Buffer.from(keyHex, 'hex'))
}

/**
 * 加密 Token
 *
 * @param token - 要加密的明文 Token（Discord access_token 或 refresh_token）
 * @returns Base64 編碼的加密資料（格式：nonce || ciphertext）
 *
 * @example
 * const encrypted = await encryptToken('ya29.a0AfH6...')
 * // 返回：'rAnD0mN0nCe...encryptedData...'
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    // 1. 取得加密密鑰
    const key = getEncryptionKey()

    // 2. 生成隨機 nonce（24 bytes for XChaCha20）
    const nonce = randomBytes(24)

    // 3. 初始化加密器
    const cipher = xchacha20poly1305(key, nonce)

    // 4. 將 token 轉換為 Uint8Array
    const plaintext = new TextEncoder().encode(token)

    // 5. 加密（返回 ciphertext + Poly1305 tag）
    const ciphertext = cipher.encrypt(plaintext)

    // 6. 組合 nonce + ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.length)
    combined.set(nonce, 0)
    combined.set(ciphertext, nonce.length)

    // 7. Base64 編碼
    return Buffer.from(combined).toString('base64')
  } catch (error) {
    throw new Error(
      `Token encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * 解密 Token
 *
 * @param encryptedToken - Base64 編碼的加密資料
 * @returns 解密後的明文 Token
 *
 * @throws {Error} 如果解密失敗（可能是密鑰錯誤、資料損壞或被篡改）
 *
 * @example
 * const decrypted = await decryptToken('rAnD0mN0nCe...encryptedData...')
 * // 返回：'ya29.a0AfH6...'
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // 1. 取得加密密鑰
    const key = getEncryptionKey()

    // 2. Base64 解碼
    const combined = Uint8Array.from(Buffer.from(encryptedToken, 'base64'))

    // 3. 提取 nonce（前 24 bytes）和 ciphertext（剩餘部分）
    if (combined.length <= 24) {
      throw new Error('Invalid encrypted token: too short')
    }

    const nonce = combined.slice(0, 24)
    const ciphertext = combined.slice(24)

    // 4. 初始化解密器
    const cipher = xchacha20poly1305(key, nonce)

    // 5. 解密（會自動驗證 Poly1305 tag）
    const plaintext = cipher.decrypt(ciphertext)

    // 6. 轉換為字串
    return new TextDecoder().decode(plaintext)
  } catch (error) {
    throw new Error(
      `Token decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * 檢查 Token 是否已加密
 *
 * 簡單的啟發式檢查：
 * - 明文 Token 通常以特定前綴開頭（如 'ya29.' for Google, 'Bearer ' 等）
 * - 加密後的 Token 是 Base64 字串，長度較長且無特定前綴
 *
 * @param token - 要檢查的 Token
 * @returns true 如果看起來像是加密的 Token
 */
export function isTokenEncrypted(token: string): boolean {
  // 檢查是否為有效的 Base64 字串
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/
  if (!base64Regex.test(token)) {
    return false
  }

  // 加密後的 Token 長度應該 > 50（nonce 24 bytes + ciphertext + tag）
  if (token.length < 50) {
    return false
  }

  // 嘗試 Base64 解碼，檢查長度是否合理
  try {
    const decoded = Buffer.from(token, 'base64')
    return decoded.length > 24  // 至少要有 nonce + 一些加密資料
  } catch {
    return false
  }
}
