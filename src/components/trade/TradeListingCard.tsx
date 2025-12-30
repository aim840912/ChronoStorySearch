'use client'

import { memo, useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { FavoriteButton } from './FavoriteButton'
import { getItemImageUrl } from '@/lib/image-utils'
import type { TradeListingWithFavorite } from '@/types/trade'

interface TradeListingCardProps {
  listing: TradeListingWithFavorite
  onEdit?: (listing: TradeListingWithFavorite) => void
  onDelete?: (id: string) => void
  onMarkComplete?: (id: string) => void
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void
  onAddToBlacklist?: (discordUsername: string) => void
}

/**
 * 格式化價格顯示（自動換算單位）
 * - 中文：萬、億
 * - 英文：K、M、B
 */
function formatPrice(price: number, language: string): string {
  const isZh = language === 'zh-TW'

  if (price >= 100_000_000) {
    // 億 / B
    const value = price / 100_000_000
    return isZh
      ? `${value % 1 === 0 ? value : value.toFixed(1)}億`
      : `${value % 1 === 0 ? value : value.toFixed(1)}B`
  } else if (price >= 10_000) {
    // 萬 / K or M
    if (isZh) {
      const value = price / 10_000
      return `${value % 1 === 0 ? value : value.toFixed(1)}萬`
    } else {
      if (price >= 1_000_000) {
        const value = price / 1_000_000
        return `${value % 1 === 0 ? value : value.toFixed(1)}M`
      } else {
        const value = price / 1_000
        return `${value % 1 === 0 ? value : value.toFixed(1)}K`
      }
    }
  }
  return price.toLocaleString()
}

/**
 * 交易刊登卡片（列表視圖）
 * 桌面版使用左中右 Flexbox 佈局，手機版使用 flex 緊湊佈局
 */
export const TradeListingCard = memo(function TradeListingCard({
  listing,
  onEdit,
  onDelete,
  onMarkComplete,
  onFavoriteToggle,
  onAddToBlacklist,
}: TradeListingCardProps) {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const [showActions, setShowActions] = useState(false)
  const [showDiscordMenu, setShowDiscordMenu] = useState(false)
  const isZh = language === 'zh-TW'

  // 複製 Discord 用戶名
  const handleCopyDiscord = useCallback(() => {
    navigator.clipboard.writeText(listing.discordUsername)
    setShowDiscordMenu(false)
  }, [listing.discordUsername])

  // 加入黑名單
  const handleAddToBlacklist = useCallback(() => {
    onAddToBlacklist?.(listing.discordUsername)
    setShowDiscordMenu(false)
  }, [listing.discordUsername, onAddToBlacklist])

  const isOwner = user?.id === listing.userId

  const handleFavoriteToggle = useCallback((isFavorited: boolean) => {
    onFavoriteToggle?.(listing.id, isFavorited)
  }, [listing.id, onFavoriteToggle])

  // 構建素質顯示字串（跟隨語言設定）
  const statsDisplay = (() => {
    if (!listing.equipmentStats) return null
    const isZh = language === 'zh-TW'
    const stats: string[] = []
    // 主屬性
    if (listing.equipmentStats.str !== undefined) stats.push(`STR+${listing.equipmentStats.str}`)
    if (listing.equipmentStats.dex !== undefined) stats.push(`DEX+${listing.equipmentStats.dex}`)
    if (listing.equipmentStats.int !== undefined) stats.push(`INT+${listing.equipmentStats.int}`)
    if (listing.equipmentStats.luk !== undefined) stats.push(`LUK+${listing.equipmentStats.luk}`)
    // 攻擊/魔力
    if (listing.equipmentStats.attack !== undefined) stats.push(`${isZh ? '攻擊' : 'ATK'}+${listing.equipmentStats.attack}`)
    if (listing.equipmentStats.magic !== undefined) stats.push(`${isZh ? '魔攻' : 'MAG'}+${listing.equipmentStats.magic}`)
    // 防禦
    if (listing.equipmentStats.pDef !== undefined) stats.push(`${isZh ? '物防' : 'PDD'}+${listing.equipmentStats.pDef}`)
    if (listing.equipmentStats.mDef !== undefined) stats.push(`${isZh ? '魔防' : 'MDD'}+${listing.equipmentStats.mDef}`)
    // HP/MP
    if (listing.equipmentStats.hp !== undefined) stats.push(`HP+${listing.equipmentStats.hp}`)
    if (listing.equipmentStats.mp !== undefined) stats.push(`MP+${listing.equipmentStats.mp}`)
    // 命中/迴避
    if (listing.equipmentStats.accuracy !== undefined) stats.push(`${isZh ? '命中' : 'ACC'}+${listing.equipmentStats.accuracy}`)
    if (listing.equipmentStats.avoid !== undefined) stats.push(`${isZh ? '迴避' : 'EVA'}+${listing.equipmentStats.avoid}`)
    // 速度/跳躍
    if (listing.equipmentStats.speed !== undefined) stats.push(`${isZh ? '速度' : 'SPD'}+${listing.equipmentStats.speed}`)
    if (listing.equipmentStats.jump !== undefined) stats.push(`${isZh ? '跳躍' : 'JMP'}+${listing.equipmentStats.jump}`)
    // 卷軸
    if (listing.equipmentStats.slots !== undefined) stats.push(`${listing.equipmentStats.slots}${isZh ? '卷' : 'S'}`)
    return stats.length > 0 ? stats.join('   |   ') : null
  })()

  const containerClasses = `px-2 py-2 bg-white dark:bg-gray-800 rounded-lg border transition-colors ${
    listing.status === 'completed'
      ? 'border-gray-300 dark:border-gray-600 opacity-60'
      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
  }`

  return (
    <>
      {/* 手機/平板版佈局 (< lg) - 固定兩行 */}
      <div className={`lg:hidden flex flex-col gap-1 ${containerClasses}`}>
        {/* 第一行：類型 + 圖片 + 名稱 + 價格 + 操作 */}
        <div className="flex items-center gap-1.5">
          {/* 類型標籤 */}
          <div
            className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${
              listing.type === 'sell'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            }`}
          >
            {listing.type === 'sell' ? t('trade.sell') : t('trade.buy')}
          </div>

          {/* 已完成標籤 */}
          {listing.status === 'completed' && (
            <div className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {t('trade.completed')}
            </div>
          )}

          {/* 物品圖片 */}
          <div className="shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
            <img
              src={getItemImageUrl(listing.itemId)}
              alt={listing.itemName}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/placeholder-item.png'
              }}
            />
          </div>

          {/* 物品名稱 */}
          <span className="text-xs font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0">
            {listing.itemName}
          </span>

          {/* 價格 */}
          <span className="shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400">
            {formatPrice(listing.price, language)}
          </span>

          {/* 操作按鈕 */}
          <div className="shrink-0 flex items-center">
            {!isOwner && (
              <FavoriteButton
                listingId={listing.id}
                isFavorited={listing.isFavorited ?? false}
                onToggle={handleFavoriteToggle}
                size="sm"
              />
            )}
            {isOwner && listing.status !== 'completed' && (
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 第二行：素質 + Discord（Discord 固定右對齊） */}
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
          {/* 素質（永遠存在） */}
          <span className="truncate flex-1 min-w-0">{statsDisplay}</span>
          {/* Discord（固定右對齊） */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowDiscordMenu(!showDiscordMenu)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            >
              <svg className="w-3 h-3 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="truncate">{listing.discordUsername}</span>
            </button>
            {/* Discord 選單 */}
            {showDiscordMenu && (
              <div className="absolute left-0 bottom-6 w-28 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
                <button
                  type="button"
                  onClick={handleCopyDiscord}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750"
                >
                  {isZh ? '複製' : 'Copy'}
                </button>
                {!isOwner && user && (
                  <button
                    type="button"
                    onClick={handleAddToBlacklist}
                    className="w-full px-3 py-1.5 text-xs text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                  >
                    {isZh ? '加入黑名單' : 'Block'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 桌面版佈局 (>= lg) - 完整版含 Discord */}
      <div className={`hidden lg:flex items-center gap-4 ${containerClasses}`}>
        {/* 左側：物品名稱 + 數量（固定寬度） */}
        <div className="shrink-0 flex items-center gap-2 w-64">
          {/* 類型標籤 */}
          <div
            className={`shrink-0 px-1.5 py-0.5 text-xs font-medium rounded ${
              listing.type === 'sell'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            }`}
          >
            {listing.type === 'sell' ? t('trade.sell') : t('trade.buy')}
          </div>

          {/* 已完成標籤 */}
          {listing.status === 'completed' && (
            <div className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {t('trade.completed')}
            </div>
          )}

          {/* 物品圖片 */}
          <div className="shrink-0 w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
            <img
              src={getItemImageUrl(listing.itemId)}
              alt={listing.itemName}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/placeholder-item.png'
              }}
            />
          </div>

          {/* 物品名稱 */}
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate min-w-0 flex-1">
            {listing.itemName}
          </span>

          {/* 數量 */}
          <span className="shrink-0 text-sm text-gray-600 dark:text-gray-400">
            x{listing.quantity}
          </span>
        </div>

        {/* 中間：素質（緊湊顯示） */}
        <div className="flex-1 min-w-0 text-sm text-gray-600 dark:text-gray-400 truncate">
          {statsDisplay || '-'}
        </div>

        {/* 右側：價格 + Discord + 天數 + 操作（固定寬度） */}
        <div className="shrink-0 flex items-center gap-4">
          {/* 價格 */}
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 w-20">
            {formatPrice(listing.price, language)}
          </span>

          {/* Discord（可點擊） */}
          <div className="relative flex items-center gap-1 w-32 min-w-0">
            <button
              type="button"
              onClick={() => setShowDiscordMenu(!showDiscordMenu)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            >
              <svg className="w-4 h-4 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {listing.discordUsername}
              </span>
            </button>
            {/* Discord 選單 */}
            {showDiscordMenu && (
              <div className="absolute left-0 top-7 w-28 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
                <button
                  type="button"
                  onClick={handleCopyDiscord}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750"
                >
                  {isZh ? '複製' : 'Copy'}
                </button>
                {!isOwner && user && (
                  <button
                    type="button"
                    onClick={handleAddToBlacklist}
                    className="w-full px-3 py-1.5 text-xs text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                  >
                    {isZh ? '加入黑名單' : 'Block'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 操作 */}
          <div className="flex items-center justify-end gap-0.5 w-16">
          {/* 收藏按鈕 */}
          {!isOwner && (
            <FavoriteButton
              listingId={listing.id}
              isFavorited={listing.isFavorited ?? false}
              onToggle={handleFavoriteToggle}
              size="sm"
            />
          )}

          {/* 擁有者操作按鈕 */}
          {isOwner && listing.status !== 'completed' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>

              {/* 下拉選單 */}
              {showActions && (
                <div className="absolute right-0 top-7 w-28 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      onEdit?.(listing)
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkComplete?.(listing.id)
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('trade.markComplete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete?.(listing.id)
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  )
})
