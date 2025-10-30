/**
 * Webhook URL 加密/解密工具
 * 使用 XChaCha20-Poly1305 進行對稱加密
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { randomBytes } from 'crypto'

// 從環境變數讀取加密金鑰（32 bytes = 64 hex characters）
const ENCRYPTION_KEY_HEX = process.env.WEBHOOK_ENCRYPTION_KEY

if (!ENCRYPTION_KEY_HEX) {
  throw new Error('環境變數 WEBHOOK_ENCRYPTION_KEY 未設定')
}

if (ENCRYPTION_KEY_HEX.length !== 64) {
  throw new Error(
    'WEBHOOK_ENCRYPTION_KEY 必須是 64 個字元的十六進位字串（32 bytes）'
  )
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex')

/**
 * 加密 Webhook URL
 * @param url - 原始 Discord Webhook URL
 * @returns Base64 編碼的加密字串（包含 nonce）
 */
export function encryptWebhookUrl(url: string): string {
  if (!url) {
    throw new Error('Webhook URL 不可為空')
  }

  // 生成隨機 nonce（24 bytes for XChaCha20）
  const nonce = randomBytes(24)

  // 建立加密器
  const cipher = xchacha20poly1305(ENCRYPTION_KEY, nonce)

  // 加密 URL
  const plaintext = Buffer.from(url, 'utf-8')
  const ciphertext = cipher.encrypt(plaintext)

  // 合併 nonce 和密文，轉為 base64
  // 格式: [nonce(24 bytes)][ciphertext(variable)]
  const combined = Buffer.concat([nonce, Buffer.from(ciphertext)])

  return combined.toString('base64')
}

/**
 * 解密 Webhook URL
 * @param encrypted - Base64 編碼的加密字串
 * @returns 原始 Discord Webhook URL
 */
export function decryptWebhookUrl(encrypted: string): string {
  if (!encrypted) {
    throw new Error('加密字串不可為空')
  }

  try {
    // 從 base64 解碼
    const combined = Buffer.from(encrypted, 'base64')

    // 分離 nonce 和密文
    const nonce = combined.subarray(0, 24)
    const ciphertext = combined.subarray(24)

    // 建立解密器
    const cipher = xchacha20poly1305(ENCRYPTION_KEY, nonce)

    // 解密
    const plaintext = cipher.decrypt(ciphertext)

    return Buffer.from(plaintext).toString('utf-8')
  } catch (error) {
    throw new Error(
      '解密 Webhook URL 失敗：' +
        (error instanceof Error ? error.message : '未知錯誤')
    )
  }
}

/**
 * 驗證加密字串格式是否正確
 * @param encrypted - Base64 編碼的加密字串
 * @returns 是否為有效格式
 */
export function isValidEncryptedWebhook(encrypted: string): boolean {
  try {
    const combined = Buffer.from(encrypted, 'base64')
    // 至少要有 24 bytes nonce + 一些密文
    return combined.length > 24
  } catch {
    return false
  }
}
