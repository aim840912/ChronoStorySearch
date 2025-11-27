/**
 * Hash 導航 Hook
 *
 * 功能：
 * - 處理 URL hash 參數（分享連結）
 * - 在頁面載入時解析 hash 並開啟對應 Modal
 * - 提供分享連結複製功能
 */

import { useEffect, useCallback } from 'react'
import type { DropItem } from '@/types'
import { clientLogger } from '@/lib/logger'

interface UseHashNavigationOptions {
  /** 所有掉落資料（用於查找怪物/物品） */
  allDrops: DropItem[]
  /** 當前語言 */
  language: 'zh-TW' | 'en'
  /** 開啟怪物 Modal */
  openMonsterModal: (id: number, name: string, saveHistory?: boolean) => void
  /** 開啟物品 Modal */
  openItemModal: (id: number, name: string, saveHistory?: boolean) => void
  /** 開啟轉蛋機 Modal */
  openGachaModal: (machineId?: number, saveHistory?: boolean) => void
  /** 搜尋詞 */
  searchTerm: string
  /** 顯示 Toast */
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
  /** 翻譯函數 */
  t: (key: string) => string
}

interface UseHashNavigationReturn {
  /** 複製分享連結 */
  handleShare: () => Promise<void>
}

export function useHashNavigation({
  allDrops,
  language,
  openMonsterModal,
  openItemModal,
  openGachaModal,
  searchTerm,
  showToast,
  t,
}: UseHashNavigationOptions): UseHashNavigationReturn {
  // 初始載入時處理分享連結（從 hash 參數開啟 modal）
  useEffect(() => {
    if (allDrops.length === 0) return // 等待資料載入完成

    const hash = window.location.hash
    if (!hash || hash === '#') return

    // 解析 hash 參數
    const params = new URLSearchParams(hash.slice(1))
    const monsterIdParam = params.get('monster')
    const itemIdParam = params.get('item')
    const gachaParam = params.get('gacha')

    // 立即清除 hash（使用 replaceState）
    window.history.replaceState(null, '', '/')

    // 根據參數開啟對應 Modal
    if (monsterIdParam) {
      const monsterId = parseInt(monsterIdParam, 10)
      if (!isNaN(monsterId)) {
        const monster = allDrops.find((drop) => drop.mobId === monsterId)
        if (monster) {
          const displayName = (language === 'zh-TW' && monster.chineseMobName)
            ? monster.chineseMobName
            : monster.mobName
          openMonsterModal(monsterId, displayName)
          clientLogger.info(`從分享連結開啟怪物 modal: ${displayName} (${monsterId})`)
        }
      }
    } else if (itemIdParam) {
      const itemId = parseInt(itemIdParam, 10)
      if (!isNaN(itemId) || itemIdParam === '0') {
        const parsedItemId = itemIdParam === '0' ? 0 : itemId
        const item = allDrops.find((drop) => drop.itemId === parsedItemId)
        if (item) {
          const displayName = (language === 'zh-TW' && item.chineseItemName)
            ? item.chineseItemName
            : item.itemName
          openItemModal(parsedItemId, displayName)
          clientLogger.info(`從分享連結開啟物品 modal: ${displayName} (${parsedItemId})`)
        }
      }
    } else if (gachaParam) {
      if (gachaParam === 'list') {
        openGachaModal()
        clientLogger.info('從分享連結開啟轉蛋機列表 modal')
      } else {
        const machineId = parseInt(gachaParam, 10)
        if (!isNaN(machineId) && machineId >= 1 && machineId <= 7) {
          openGachaModal(machineId)
          clientLogger.info(`從分享連結開啟轉蛋機 modal: 機台 ${machineId}`)
        }
      }
    }
  }, [allDrops, language, openMonsterModal, openItemModal, openGachaModal])

  // 分享處理函數
  const handleShare = useCallback(async () => {
    if (!searchTerm.trim()) return

    try {
      const url = `${window.location.origin}${window.location.pathname}#q=${encodeURIComponent(searchTerm)}`
      await navigator.clipboard.writeText(url)
      showToast(t('share.success'), 'success')
      clientLogger.info(`分享連結已複製: ${url}`)
    } catch (error) {
      showToast(t('share.error'), 'error')
      clientLogger.error('複製連結失敗', error)
    }
  }, [searchTerm, showToast, t])

  return {
    handleShare,
  }
}
