/**
 * Discord Webhook 通知服務
 *
 * 功能：
 * - 發送查看聯絡方式通知
 * - 發送購買意向通知
 * - 發送刊登即將過期通知
 */

import { apiLogger } from '@/lib/logger'

export type NotificationType = 'contact_view' | 'interest_received' | 'listing_expiring'

interface NotificationData {
  listingId: number
  itemName: string
  tradeType?: 'sell' | 'buy' | 'exchange'
  buyer?: {
    username: string
    reputation?: number
  }
  expiresAt?: string
}

/**
 * 發送 Discord Webhook 通知
 *
 * @param webhookUrl - Discord Webhook URL
 * @param type - 通知類型
 * @param data - 通知數據
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  type: NotificationType,
  data: NotificationData
): Promise<void> {
  try {
    const embed = buildEmbed(type, data)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Discord API 返回錯誤: ${response.status} - ${errorText}`)
    }

    apiLogger.info('Discord 通知已發送', {
      type,
      listingId: data.listingId
    })
  } catch (error) {
    apiLogger.error('發送 Discord 通知失敗', {
      error,
      type,
      listingId: data.listingId
    })
    // 不拋出錯誤，避免影響主流程
  }
}

/**
 * 建立 Discord Embed 物件
 */
function buildEmbed(type: NotificationType, data: NotificationData) {
  switch (type) {
    case 'contact_view':
      return {
        title: '【聯絡方式查看通知】',
        description: '有使用者查看了你的刊登聯絡方式',
        color: 0x3B82F6,  // 藍色 (Tailwind blue-500)
        fields: [
          {
            name: '刊登物品',
            value: data.itemName,
            inline: true
          },
          {
            name: '查看者',
            value: data.buyer?.username || '匿名',
            inline: true
          },
          {
            name: '信譽分數',
            value: data.buyer?.reputation?.toString() || 'N/A',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: `楓之谷交易系統 | 刊登 ID: ${data.listingId}` }
      }

    case 'interest_received': {
      // 根據交易類型調整標題和描述
      const tradeType = data.tradeType || 'sell'
      const titles = {
        sell: '【購買意向通知】',
        buy: '【出售意向通知】',
        exchange: '【交換意向通知】'
      }
      const descriptions = {
        sell: '有買家對你的刊登表達了購買意向',
        buy: '有賣家對你的收購刊登表達了出售意向',
        exchange: '有人對你的交換刊登表達了交換意向'
      }
      const userLabels = {
        sell: '買家',
        buy: '賣家',
        exchange: '對方'
      }

      return {
        title: titles[tradeType],
        description: descriptions[tradeType],
        color: 0x10B981,  // 綠色 (Tailwind green-500)
        fields: [
          {
            name: '刊登物品',
            value: data.itemName,
            inline: true
          },
          {
            name: userLabels[tradeType],
            value: data.buyer?.username || '匿名',
            inline: true
          },
          {
            name: '信譽分數',
            value: data.buyer?.reputation?.toString() || 'N/A',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: `楓之谷交易系統 | 刊登 ID: ${data.listingId}` }
      }
    }

    case 'listing_expiring':
      return {
        title: '【刊登過期提醒】',
        description: '你的刊登即將在 24 小時內過期',
        color: 0xF59E0B,  // 橘色 (Tailwind amber-500)
        fields: [
          {
            name: '刊登物品',
            value: data.itemName,
            inline: true
          },
          {
            name: '過期時間',
            value: data.expiresAt || 'N/A',
            inline: true
          },
          {
            name: '操作建議',
            value: '如需延長刊登時間，請重新編輯刊登',
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: `楓之谷交易系統 | 刊登 ID: ${data.listingId}` }
      }

    default:
      throw new Error(`未知的通知類型: ${type}`)
  }
}
