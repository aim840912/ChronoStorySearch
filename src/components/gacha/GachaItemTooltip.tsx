'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { GachaResult, ItemEquipmentStats } from '@/types'
import { EquipmentStatsCard } from '@/components/equipment/EquipmentStatsCard'
import { mergeRandomStats } from '@/lib/random-equipment-stats'

interface GachaItemTooltipProps {
  isOpen: boolean
  item: GachaResult | null
  triggerRect: DOMRect | null
}

/**
 * 抽獎機物品浮動提示框
 * 使用 ItemAttributesCard 顯示完整物品資訊（含隨機屬性）
 */
export function GachaItemTooltip({ isOpen, item, triggerRect }: GachaItemTooltipProps) {
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'left' | 'right' }>({
    top: 0,
    left: 0,
    placement: 'right',
  })

  // Hydration 安全
  useEffect(() => {
    setMounted(true)
  }, [])

  // 獲取裝備屬性（應用隨機屬性）
  const equipmentStats = useMemo(() => {
    if (!item) return null

    // 檢查是否有裝備資訊
    const equipment = (item as GachaResult & { equipment?: { stats: ItemEquipmentStats } }).equipment
    if (!equipment) return null

    return mergeRandomStats(equipment.stats, item.randomStats)
  }, [item])

  // 計算 tooltip 位置（智能避免超出視窗）
  useEffect(() => {
    if (!isOpen || !triggerRect || !mounted) return

    const tooltipWidth = 400
    const tooltipMaxHeight = 600
    const gap = 8

    // 檢查右側空間是否足夠
    const spaceOnRight = window.innerWidth - triggerRect.right
    const shouldPlaceLeft = spaceOnRight < tooltipWidth + gap

    let left: number
    let placement: 'left' | 'right'

    if (shouldPlaceLeft) {
      // 顯示在左側
      left = triggerRect.left - tooltipWidth - gap
      placement = 'left'
    } else {
      // 顯示在右側
      left = triggerRect.right + gap
      placement = 'right'
    }

    // 垂直位置：對齊卡片中心
    let top = triggerRect.top + triggerRect.height / 2 - tooltipMaxHeight / 2

    // 確保不超出視窗頂部
    if (top < 10) {
      top = 10
    }

    // 確保不超出視窗底部
    if (top + tooltipMaxHeight > window.innerHeight - 10) {
      top = window.innerHeight - tooltipMaxHeight - 10
    }

    setPosition({ top, left, placement })
  }, [isOpen, triggerRect, mounted])

  if (!mounted || !isOpen || !item || !equipmentStats || !triggerRect) {
    return null
  }

  return createPortal(
    <div
      className="fixed z-[75] hidden md:block"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '400px',
        maxHeight: '600px',
      }}
    >
      <EquipmentStatsCard stats={equipmentStats} />
    </div>,
    document.body
  )
}
