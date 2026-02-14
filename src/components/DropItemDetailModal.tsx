'use client'

import { useMemo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ItemsOrganizedData } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'
import { useLazyItemDetailed } from '@/hooks/useLazyData'
import { useDropRelations } from '@/hooks/useDropRelations'
import { ItemAttributesCard } from './ItemAttributesCard'
import { useDraggable } from '@/hooks/useDraggable'
import { useResizable } from '@/hooks/useResizable'

// Module-level：追蹤目前開啟的浮動視窗數量，用於 cascade 定位
let openFloatingCount = 0
const CASCADE_OFFSET = 30

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
 * 物品屬性快速預覽 - 懸浮視窗版
 * 可拖曳、可調整大小
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

  // Hydration 安全：確保只在客戶端渲染
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 懶加載物品詳細資料（只在開啟時載入）
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
  const itemData: ItemsOrganizedData | null = itemDetailed ?? null

  // 拖曳功能
  const { position, isDragging, setPosition, dragHandlers } = useDraggable({
    initialPosition: { x: 20, y: 100 }, // 實際位置由 cascade effect 覆蓋
  })

  // Cascade 定位：每個新開的視窗往右下偏移，避免完全重疊
  useEffect(() => {
    if (!isOpen || !mounted) return

    const isMobile = window.innerWidth < 640
    const baseX = isMobile ? 8 : Math.min(window.innerWidth - 380, window.innerWidth / 2 + 50)
    const baseY = 100
    const offset = (openFloatingCount % 5) * CASCADE_OFFSET

    setPosition({ x: baseX + offset, y: baseY + offset })
    openFloatingCount++

    return () => {
      openFloatingCount = Math.max(0, openFloatingCount - 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mounted])

  // 調整大小功能
  const resizable = useResizable({
    initialSize: { width: 360, height: 420 },
    minSize: { width: 280, height: 250 },
    maxSize: { width: 500, height: 700 },
    enabled: true,
    onPositionChange: ({ dx, dy }) => {
      setPosition({ x: position.x + dx, y: position.y + dy })
    },
  })

  // ESC 鍵關閉
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // 點擊怪物：先關閉此視窗，再導航到怪物 Modal
  const handleMonsterClick = (mobId: number) => {
    onClose()
    onMonsterClick?.(mobId)
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      ref={resizable.containerRef}
      className="fixed z-[55] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: resizable.size.width,
        height: resizable.size.height,
        maxWidth: 'calc(100vw - 16px)',
        cursor: resizable.cursorStyle || (isDragging ? 'grabbing' : ''),
      }}
    >
      {/* 標題列（可拖曳） */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-t-lg cursor-grab select-none"
        onMouseDown={(e) => {
          if (resizable.activeEdge) return
          dragHandlers.onMouseDown(e)
        }}
        onTouchStart={(e) => {
          if (resizable.activeEdge) return
          dragHandlers.onTouchStart(e)
        }}
      >
        {/* 拖曳提示圖示 */}
        <svg className="w-4 h-4 opacity-50 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
        {/* 物品圖示 */}
        <img
          src={itemIconUrl}
          alt={displayName}
          width={24}
          height={24}
          className="w-6 h-6 object-contain flex-shrink-0"
        />
        {/* 物品名稱 */}
        <span className="text-sm font-bold flex-1 min-w-0 truncate">
          {displayName}
        </span>
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="p-1 hover:bg-green-700 rounded flex-shrink-0"
          aria-label={t('modal.close')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 內容區 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-3 space-y-3">
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

        {/* 物品屬性 */}
        {isLoading && !itemDetailed ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400" />
          </div>
        ) : (
          <ItemAttributesCard itemData={itemData} showMaxOnly={showMaxOnly} compact />
        )}
      </div>
    </div>,
    document.body
  )
}
