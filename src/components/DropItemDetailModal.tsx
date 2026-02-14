'use client'

import { useMemo } from 'react'
import type { ItemsOrganizedData } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'
import { useLazyItemDetailed } from '@/hooks/useLazyData'
import { useDropRelations } from '@/hooks/useDropRelations'
import { ItemAttributesCard } from './ItemAttributesCard'
import { BaseModal } from './common/BaseModal'

interface DropItemDetailModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: number
  itemName: string
  chineseItemName?: string | null
  showMaxOnly?: boolean
  /** 點擊怪物圖片時的回調（導航到該怪物的 MonsterModal） */
  onMonsterClick?: (mobId: number) => void
}

/**
 * 物品屬性快速預覽 Modal
 * 從 DropItemCard 點擊「查看詳細」按鈕開啟
 * 顯示掉落來源怪物圖片（可點擊導航）和物品屬性卡片
 */
export function DropItemDetailModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  chineseItemName,
  showMaxOnly = false,
  onMonsterClick,
}: DropItemDetailModalProps) {
  const { language, t } = useLanguage()

  // 懶加載物品詳細資料（只在 Modal 開啟時載入）
  const { data: itemDetailed, isLoading } = useLazyItemDetailed(
    isOpen ? itemId : null
  )

  // 取得掉落此物品的怪物列表
  const { getMobsForItem } = useDropRelations()
  const dropMobs = useMemo(() => {
    if (!isOpen) return []
    return getMobsForItem(itemId).map((mobId) => ({
      id: mobId,
      imageUrl: getMonsterImageUrl(mobId, { format: 'png' }),
    }))
  }, [isOpen, itemId, getMobsForItem])

  const displayName = getItemDisplayName(itemName, chineseItemName ?? null, language)
  const itemIconUrl = getItemImageUrl(itemId, { itemName })

  // 決定要傳遞的 itemData
  const itemData: ItemsOrganizedData | null = itemDetailed ?? null

  // 點擊怪物：先關閉此 Modal，再導航到怪物 Modal
  const handleMonsterClick = (mobId: number) => {
    onClose()
    onMonsterClick?.(mobId)
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-[55]"
      maxWidth="max-w-md"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header：物品圖示 + 名稱 + 關閉按鈕（縮小版） */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
          <img
            src={itemIconUrl}
            alt={displayName}
            width={36}
            height={36}
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex-1 min-w-0 truncate">
            {displayName}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            aria-label={t('modal.close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body：掉落來源 + 物品屬性 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* 掉落來源怪物（可點擊導航） */}
          {dropMobs.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t('card.dropSources')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {dropMobs.map((mob) => (
                  <button
                    key={mob.id}
                    onClick={() => handleMonsterClick(mob.id)}
                    className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-150 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <img
                      src={mob.imageUrl}
                      alt=""
                      className="w-9 h-9 object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 物品屬性（較緊湊的間距） */}
          {isLoading && !itemDetailed ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400" />
            </div>
          ) : (
            <ItemAttributesCard itemData={itemData} showMaxOnly={showMaxOnly} compact />
          )}
        </div>
      </div>
    </BaseModal>
  )
}
