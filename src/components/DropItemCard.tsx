'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import type { DropItem, ItemAttributesEssential } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'
import { useDropRelations } from '@/hooks/useDropRelations'
import { useShowDevInfo } from '@/hooks/useShowDevInfo'
import { DropItemDetailModal } from './DropItemDetailModal'

interface DropItemCardProps {
  drop: DropItem
  itemAttributesMap: Map<number, ItemAttributesEssential>
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
  /** 是否顯示掉落來源圖示 */
  showIcons?: boolean
  /** 是否只顯示最大屬性值 */
  showMaxOnly?: boolean
  /** 點擊怪物圖片時的回調（從 DropItemDetailModal 導航到怪物 Modal） */
  onMonsterClick?: (mobId: number) => void
}

/**
 * 掉落物品卡片元件（用於 MonsterModal）
 * 顯示怪物掉落的物品資訊，包含掉落率和數量
 */
export function DropItemCard({
  drop,
  itemAttributesMap,
  isFavorite,
  onToggleFavorite,
  onItemClick,
  showIcons = false,
  showMaxOnly = false,
  onMonsterClick,
}: DropItemCardProps) {
  const { language, t } = useLanguage()
  const showDevInfo = useShowDevInfo()
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const chancePercent = drop.chance.toFixed(4)

  // 取得掉落此物品的怪物列表（用於顯示圖示）
  const { getMobsForItem } = useDropRelations()
  const iconsContainerRef = useRef<HTMLDivElement>(null)
  const [maxIcons, setMaxIcons] = useState(8)

  // 根據容器寬度動態計算可顯示的圖示數量
  useEffect(() => {
    const container = iconsContainerRef.current
    if (!container || !showIcons) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      const iconWidth = 32 // w-7 (28px) + gap-1 (4px)
      const reservedWidth = 40 // "+N" 文字預留空間
      const count = Math.floor((width - reservedWidth) / iconWidth)
      setMaxIcons(Math.max(1, Math.min(count, 8)))
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [showIcons])

  const dropMobIcons = useMemo(() => {
    if (!showIcons) return []
    const mobIds = getMobsForItem(drop.itemId)
    return mobIds.slice(0, maxIcons).map((mobId) => ({
      id: mobId,
      imageUrl: getMonsterImageUrl(mobId, { format: 'png' }),
    }))
  }, [showIcons, drop.itemId, getMobsForItem, maxIcons])
  const qtyRange =
    drop.minQty === drop.maxQty ? `${drop.minQty}` : `${drop.minQty}-${drop.maxQty}`

  // 獲取顯示名稱（支援中英文切換）
  const displayItemName = getItemDisplayName(drop.itemName, drop.chineseItemName, language)

  // 物品圖示 URL（傳入 itemName 以支援卷軸圖示）
  const itemIconUrl = getItemImageUrl(drop.itemId, { itemName: drop.itemName })

  // 根據物品類型決定顯示內容
  const essentialData = itemAttributesMap.get(drop.itemId)
  const itemType = essentialData?.type

  let label = t('card.quantity')
  let value: string | number = qtyRange

  if (itemType === 'Eqp' && essentialData?.req_level !== undefined) {
    // 裝備：type 是 'Eqp'，顯示等級（從 Essential 的 req_level 讀取）
    label = t('card.level')
    const reqLevel = essentialData.req_level
    value = reqLevel ? `Lv.${reqLevel}` : '-'
  }

  return (
    <>
      <div
        onClick={() => onItemClick(drop.itemId, displayItemName)}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-[0.98] relative"
      >
        {/* 查看詳細按鈕 - 愛心左邊 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsDetailModalOpen(true)
          }}
          className="absolute top-12 right-3 p-2 transition-all duration-200 hover:scale-110 active:scale-95 text-gray-400 hover:text-blue-500"
          aria-label={t('card.viewDetail')}
          title={t('card.viewDetail')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* 最愛按鈕 - 右上角 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(drop.itemId, displayItemName)
          }}
          className={`absolute top-3 right-3 p-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
            isFavorite
              ? 'text-red-500 hover:text-red-600'
              : 'text-gray-400 hover:text-red-400'
          }`}
          aria-label={isFavorite ? t('card.unfavorite') : t('card.favorite')}
        >
          <svg
            className="w-5 h-5"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>

        {/* 掉落來源圖示區域 */}
        {showIcons && (
          <div ref={iconsContainerRef} className="flex items-center gap-1 mb-3">
            {dropMobIcons.map((icon) => (
              <img
                key={icon.id}
                src={icon.imageUrl}
                alt=""
                className="w-7 h-7 object-contain flex-shrink-0"
                loading="lazy"
              />
            ))}
            {getMobsForItem(drop.itemId).length > maxIcons && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
                +{getMobsForItem(drop.itemId).length - maxIcons}
              </span>
            )}
          </div>
        )}

        {/* 物品資訊 */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={itemIconUrl}
            alt={displayItemName}
            width={64}
            height={64}
            className="w-16 h-16 object-contain flex-shrink-0"
            loading="lazy"
          />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {displayItemName}
            </h3>
            {showDevInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('card.itemId')}: {drop.itemId}
              </p>
            )}
          </div>
        </div>

        {/* 掉落率和數量/等級/效果 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('card.dropChance')}
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                {chancePercent}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {label}
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                {value}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 物品詳細屬性 Modal */}
      <DropItemDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        itemId={drop.itemId}
        itemName={drop.itemName}
        chineseItemName={drop.chineseItemName}
        showMaxOnly={showMaxOnly}
        onMonsterClick={onMonsterClick}
      />
    </>
  )
}
