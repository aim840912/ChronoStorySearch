'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ItemAttributesEssential, ItemAttributes, DropsEssential } from '@/types'
import { ItemAttributesCard } from './ItemAttributesCard'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLazyItemDetailed } from '@/hooks/useLazyData'

interface ItemAttributesTooltipProps {
  isOpen: boolean
  itemId: number | null
  itemName: string
  triggerRect: DOMRect | null
  allDrops: DropsEssential[]
  itemAttributesMap: Map<number, ItemAttributesEssential>
}

/**
 * 物品屬性浮動提示框
 *
 * 在 hover Dropped Items 時顯示輕量級的物品屬性資訊
 * 使用 absolute 定位，顯示在觸發元素旁邊
 */
export function ItemAttributesTooltip({
  isOpen,
  itemId,
  itemName,
  triggerRect,
  allDrops,
  itemAttributesMap,
}: ItemAttributesTooltipProps) {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'left' | 'right' }>({
    top: 0,
    left: 0,
    placement: 'right'
  })

  // Hydration 安全
  useEffect(() => {
    setMounted(true)
  }, [])

  // 懶加載物品詳細資料
  const shouldLoadDetailed = itemId !== null && itemAttributesMap.has(itemId)
  const {
    data: itemDetailed,
    isLoading: isLoadingDetailed,
  } = useLazyItemDetailed(shouldLoadDetailed ? itemId : null)

  // 從 allDrops 查找物品數據
  const itemData = useMemo(() => {
    if (!itemId && itemId !== 0) return null
    return allDrops.find((drop) => drop.itemId === itemId) || null
  }, [itemId, allDrops])

  // 根據語言選擇顯示名稱
  const displayItemName = useMemo(() => {
    if (!itemData) return itemName
    if (language === 'zh-TW') {
      return itemData.chineseItemName || itemData.itemName
    }
    return itemData.itemName
  }, [language, itemData, itemName])

  // 取得物品圖示 URL
  const itemIconUrl = useMemo(() => {
    if (!itemId && itemId !== 0) return '/images/items/placeholder.png'
    return getItemImageUrl(itemId)
  }, [itemId])

  // 組合 Essential + Detailed 資料
  const itemAttributes = useMemo(() => {
    if (!itemId && itemId !== 0) return null

    const essentialData = itemAttributesMap.get(itemId)
    if (essentialData && itemDetailed) {
      const combined: ItemAttributes = {
        item_id: essentialData.item_id,
        item_name: essentialData.item_name,
        type: essentialData.type,
        sub_type: essentialData.sub_type,
        item_type_id: itemDetailed.item_type_id,
        sale_price: itemDetailed.sale_price,
        max_stack_count: itemDetailed.max_stack_count,
        untradeable: itemDetailed.untradeable,
        item_description: itemDetailed.item_description,
        equipment: itemDetailed.equipment,
        scroll: itemDetailed.scroll,
        potion: itemDetailed.potion,
      }
      return combined
    }

    if (essentialData && isLoadingDetailed) {
      return null
    }

    return null
  }, [itemId, itemDetailed, itemAttributesMap, isLoadingDetailed])

  // 計算 Tooltip 定位
  useEffect(() => {
    if (!isOpen || !triggerRect) return

    const tooltipWidth = 400 // max-w-md 的大約寬度
    const tooltipEstimatedHeight = 700 // 預估 tooltip 高度（足以涵蓋所有物品類型）
    const gap = 8 // 與觸發元素的間距
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scrollY = window.scrollY

    // === 水平方向計算 ===
    // 計算右側空間
    const rightSpace = viewportWidth - triggerRect.right

    let placement: 'left' | 'right' = 'right'
    let left = 0

    if (rightSpace >= tooltipWidth + gap) {
      // 右側空間足夠，顯示在右側
      placement = 'right'
      left = triggerRect.right + gap
    } else {
      // 右側空間不足，顯示在左側
      placement = 'left'
      left = triggerRect.left - tooltipWidth - gap
    }

    // 確保不超出左邊界
    if (left < gap) {
      left = gap
    }

    // === 垂直方向計算 ===
    // 對齊觸發元素中心（視覺上更平衡）
    const triggerCenter = triggerRect.top + triggerRect.height / 2
    let top = scrollY + triggerCenter - tooltipEstimatedHeight / 2

    // 確保不超出頂部
    if (top < scrollY + gap) {
      top = scrollY + gap
    }

    // 確保不超出底部
    const maxTop = scrollY + viewportHeight - tooltipEstimatedHeight - gap
    if (top > maxTop) {
      top = maxTop
    }

    setPosition({
      top,
      left,
      placement,
    })
  }, [isOpen, triggerRect])

  // 未掛載或未開啟時不渲染
  if (!isOpen || !mounted || !itemId) return null

  // 使用 Portal 渲染到 document.body
  return createPortal(
    <div
      className="fixed inset-0 z-[55] pointer-events-none hidden md:block"
      style={{ position: 'fixed' }}
    >
      <div
        className="absolute pointer-events-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-green-500 dark:border-green-600 w-full max-w-md overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        onMouseEnter={() => {}} // 防止 Tooltip 內 hover 時觸發 onClose
      >
        {/* Header - 綠色主題 */}
        <div className="bg-green-500 dark:bg-green-600 p-3">
          <h3 className="text-sm font-bold text-white text-center">
            {displayItemName}
          </h3>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* 物品圖示 */}
          <div className="flex justify-center">
            <img
              src={itemIconUrl}
              alt={displayItemName}
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* 物品屬性卡片 - 載入中顯示動畫 */}
          {isLoadingDetailed && !itemAttributes ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400"></div>
            </div>
          ) : (
            <ItemAttributesCard attributes={itemAttributes} />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
