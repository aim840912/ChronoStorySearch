'use client'

import type { SlotSymbol } from '@/types/slot'
import { getMonsterImageUrl } from '@/lib/image-utils'
import { getMonsterDisplayName } from '@/lib/display-name'
import { useLanguage } from '@/contexts/LanguageContext'

interface SymbolIconProps {
  symbol: SlotSymbol
  size?: 'sm' | 'md' | 'lg'
}

/**
 * 符號圖示元件
 * 渲染怪物圖片
 */
export function SymbolIcon({ symbol, size = 'md' }: SymbolIconProps) {
  const { language } = useLanguage()

  // 尺寸映射（像素值）
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
  }

  const iconSize = sizeMap[size]
  const monsterImageUrl = getMonsterImageUrl(symbol.mobId)
  const displayName = getMonsterDisplayName(
    symbol.name,
    symbol.chineseName,
    language
  )

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: iconSize, height: iconSize }}
    >
      <img
        src={monsterImageUrl}
        alt={displayName}
        width={iconSize}
        height={iconSize}
        className="object-contain flex-shrink-0"
        loading="lazy"
        onError={(e) => {
          // 圖片載入失敗時使用預設圖片
          const target = e.target as HTMLImageElement
          target.src = '/images/monsters/default.svg'
        }}
      />
    </div>
  )
}
