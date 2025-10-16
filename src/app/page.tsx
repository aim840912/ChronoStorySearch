'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { DropItem } from './api/maplestory/route'

// 搜尋建議項目類型
interface SuggestionItem {
  name: string
  type: 'monster' | 'item'
  count: number // 該名稱在資料中出現的次數
}

// 自定義 Debounce Hook - 延遲更新值以減少計算頻率
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// 最愛怪物介面
interface FavoriteMonster {
  mobId: number
  mobName: string
  addedAt: number
}

// 自定義 Hook - 管理最愛怪物（使用 localStorage）
function useFavoriteMonsters() {
  const [favorites, setFavorites] = useState<FavoriteMonster[]>([])

  // 從 localStorage 載入最愛
  useEffect(() => {
    try {
      const stored = localStorage.getItem('chronostory-favorite-monsters')
      if (stored) {
        const parsed = JSON.parse(stored)
        setFavorites(parsed)
      }
    } catch (error) {
      console.error('載入最愛失敗:', error)
    }
  }, [])

  // 儲存到 localStorage
  const saveFavorites = (newFavorites: FavoriteMonster[]) => {
    try {
      localStorage.setItem('chronostory-favorite-monsters', JSON.stringify(newFavorites))
      setFavorites(newFavorites)
    } catch (error) {
      console.error('儲存最愛失敗:', error)
    }
  }

  // 切換最愛狀態
  const toggleFavorite = (mobId: number, mobName: string) => {
    const existingIndex = favorites.findIndex((fav) => fav.mobId === mobId)

    if (existingIndex >= 0) {
      // 移除最愛
      const newFavorites = favorites.filter((fav) => fav.mobId !== mobId)
      saveFavorites(newFavorites)
    } else {
      // 添加最愛
      const newFavorite: FavoriteMonster = {
        mobId,
        mobName,
        addedAt: Date.now(),
      }
      saveFavorites([...favorites, newFavorite])
    }
  }

  // 檢查是否已收藏
  const isFavorite = (mobId: number): boolean => {
    return favorites.some((fav) => fav.mobId === mobId)
  }

  // 清空所有最愛
  const clearAll = () => {
    saveFavorites([])
  }

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteCount: favorites.length,
    clearAll,
  }
}

// 最愛物品介面
interface FavoriteItem {
  itemId: number
  itemName: string
  addedAt: number
}

// 自定義 Hook - 管理最愛物品（使用 localStorage）
function useFavoriteItems() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  // 從 localStorage 載入最愛
  useEffect(() => {
    try {
      const stored = localStorage.getItem('chronostory-favorite-items')
      if (stored) {
        const parsed = JSON.parse(stored)
        setFavorites(parsed)
      }
    } catch (error) {
      console.error('載入最愛物品失敗:', error)
    }
  }, [])

  // 儲存到 localStorage
  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    try {
      localStorage.setItem('chronostory-favorite-items', JSON.stringify(newFavorites))
      setFavorites(newFavorites)
    } catch (error) {
      console.error('儲存最愛物品失敗:', error)
    }
  }

  // 切換最愛狀態
  const toggleFavorite = (itemId: number, itemName: string) => {
    const existingIndex = favorites.findIndex((fav) => fav.itemId === itemId)

    if (existingIndex >= 0) {
      // 移除最愛
      const newFavorites = favorites.filter((fav) => fav.itemId !== itemId)
      saveFavorites(newFavorites)
    } else {
      // 添加最愛
      const newFavorite: FavoriteItem = {
        itemId,
        itemName,
        addedAt: Date.now(),
      }
      saveFavorites([...favorites, newFavorite])
    }
  }

  // 檢查是否已收藏
  const isFavorite = (itemId: number): boolean => {
    return favorites.some((fav) => fav.itemId === itemId)
  }

  // 清空所有最愛
  const clearAll = () => {
    saveFavorites([])
  }

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteCount: favorites.length,
    clearAll,
  }
}

// 掉落資料卡片元件
function DropCard({
  drop,
  onCardClick,
  isFavorite,
  onToggleFavorite,
}: {
  drop: DropItem
  onCardClick: (mobId: number, mobName: string) => void
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
}) {
  const [imageError, setImageError] = useState(false)
  const [itemImageError, setItemImageError] = useState(false)
  const chancePercent = (drop.chance * 100).toFixed(4)
  const qtyRange = drop.minQty === drop.maxQty ? `${drop.minQty}` : `${drop.minQty}-${drop.maxQty}`

  // 使用本地圖片，錯誤時使用預設圖示
  const monsterIconUrl = imageError
    ? '/images/monsters/default.svg'
    : `/images/monsters/${drop.mobId}.png`

  // 物品圖示 URL（itemId = 0 是 Meso，不顯示圖示）
  const itemIconUrl = drop.itemId === 0
    ? null
    : itemImageError
      ? '/images/items/default.svg'
      : `/images/items/${drop.itemId}.png`

  return (
    <div
      onClick={() => onCardClick(drop.mobId, drop.mobName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.mobId, drop.mobName)
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
        }`}
        aria-label={isFavorite ? '取消收藏' : '加入收藏'}
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

      {/* 怪物資訊 */}
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={monsterIconUrl}
          alt={drop.mobName}
          className="w-12 h-12 object-contain flex-shrink-0"
          onError={() => setImageError(true)}
        />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {drop.mobName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            怪物 ID: {drop.mobId}
          </p>
        </div>
      </div>

      {/* 掉落物品資訊 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          {/* 物品圖示 */}
          {itemIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itemIconUrl}
              alt={drop.itemName}
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={() => setItemImageError(true)}
            />
          ) : (
            <span className="text-lg">💰</span>
          )}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              掉落:
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {drop.itemName}
            </span>
          </div>
        </div>

        {/* 機率和數量 */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              掉落機率
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                {chancePercent}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              掉落數量
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                {qtyRange}
              </span>
            </div>
          </div>
        </div>

        {/* 物品 ID */}
        <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          物品 ID: {drop.itemId}
        </div>
      </div>
    </div>
  )
}

// 怪物卡片元件（用於最愛模式）
function MonsterCard({
  mobId,
  mobName,
  dropCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
}: {
  mobId: number
  mobName: string
  dropCount: number
  onCardClick: (mobId: number, mobName: string) => void
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
}) {
  const [imageError, setImageError] = useState(false)

  // 使用本地圖片，錯誤時使用預設圖示
  const monsterIconUrl = imageError
    ? '/images/monsters/default.svg'
    : `/images/monsters/${mobId}.png`

  return (
    <div
      onClick={() => onCardClick(mobId, mobName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(mobId, mobName)
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
        }`}
        aria-label={isFavorite ? '取消收藏' : '加入收藏'}
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

      {/* 怪物資訊 */}
      <div className="flex items-center gap-3 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={monsterIconUrl}
          alt={mobName}
          className="w-16 h-16 object-contain flex-shrink-0"
          onError={() => setImageError(true)}
        />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {mobName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            怪物 ID: {mobId}
          </p>
        </div>
      </div>

      {/* 掉落物數量資訊 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              掉落物品
            </span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {dropCount} 種
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          點擊查看所有掉落物品
        </p>
      </div>
    </div>
  )
}

// 物品卡片元件（用於最愛物品模式）
function ItemCard({
  itemId,
  itemName,
  monsterCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
}: {
  itemId: number
  itemName: string
  monsterCount: number
  onCardClick: (itemId: number, itemName: string) => void
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
}) {
  const [imageError, setImageError] = useState(false)

  // 使用本地圖片，錯誤時使用預設圖示
  const itemIconUrl =
    itemId === 0
      ? null
      : imageError
        ? '/images/items/default.svg'
        : `/images/items/${itemId}.png`

  return (
    <div
      onClick={() => onCardClick(itemId, itemName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(itemId, itemName)
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
        }`}
        aria-label={isFavorite ? '取消收藏' : '加入收藏'}
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

      {/* 物品資訊 */}
      <div className="flex items-center gap-3 mb-4">
        {itemIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={itemIconUrl}
            alt={itemName}
            className="w-16 h-16 object-contain flex-shrink-0"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
            <span className="text-4xl">💰</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {itemName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            物品 ID: {itemId}
          </p>
        </div>
      </div>

      {/* 掉落怪物數量資訊 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              掉落怪物
            </span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {monsterCount} 隻
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          點擊查看所有掉落怪物
        </p>
      </div>
    </div>
  )
}

// 怪物掉落卡片子元件（用於 ItemDropsModal 內，顯示掉落特定物品的怪物）
function MonsterDropCard({
  drop,
  isFavorite,
  onToggleFavorite,
  onMonsterClick,
}: {
  drop: DropItem
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  onMonsterClick: (mobId: number, mobName: string) => void
}) {
  const [monsterImageError, setMonsterImageError] = useState(false)
  const chancePercent = (drop.chance * 100).toFixed(4)
  const qtyRange =
    drop.minQty === drop.maxQty
      ? `${drop.minQty}`
      : `${drop.minQty}-${drop.maxQty}`
  const monsterIconUrl = monsterImageError
    ? '/images/monsters/default.svg'
    : `/images/monsters/${drop.mobId}.png`

  return (
    <div
      onClick={() => onMonsterClick(drop.mobId, drop.mobName)}
      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.mobId, drop.mobName)
        }}
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-400 dark:text-gray-400 border border-gray-300 dark:border-gray-500'
        }`}
        aria-label={isFavorite ? '取消收藏' : '加入收藏'}
      >
        <svg
          className="w-4 h-4"
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

      <div className="flex items-center gap-3 mb-3">
        {/* 怪物圖示 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={monsterIconUrl}
          alt={drop.mobName}
          className="w-10 h-10 object-contain"
          onError={() => setMonsterImageError(true)}
        />
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            {drop.mobName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ID: {drop.mobId}
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            機率
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-center">
            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {chancePercent}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            數量
          </div>
          <div className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-center">
            <span className="text-sm font-bold text-green-700 dark:text-green-300">
              {qtyRange}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 掉落物品卡片子元件（用於 Modal 內）
function DropItemCard({
  drop,
  isFavorite,
  onToggleFavorite,
  onItemClick,
}: {
  drop: DropItem
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
}) {
  const [itemImageError, setItemImageError] = useState(false)
  const chancePercent = (drop.chance * 100).toFixed(4)
  const qtyRange =
    drop.minQty === drop.maxQty
      ? `${drop.minQty}`
      : `${drop.minQty}-${drop.maxQty}`
  const itemIconUrl =
    drop.itemId === 0
      ? null
      : itemImageError
        ? '/images/items/default.svg'
        : `/images/items/${drop.itemId}.png`

  return (
    <div
      onClick={() => onItemClick(drop.itemId, drop.itemName)}
      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.itemId, drop.itemName)
        }}
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-400 dark:text-gray-400 border border-gray-300 dark:border-gray-500'
        }`}
        aria-label={isFavorite ? '取消收藏' : '加入收藏'}
      >
        <svg
          className="w-4 h-4"
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

      <div className="flex items-center gap-3 mb-3">
        {/* 物品圖示 */}
        {itemIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={itemIconUrl}
            alt={drop.itemName}
            className="w-10 h-10 object-contain"
            onError={() => setItemImageError(true)}
          />
        ) : (
          <span className="text-2xl">💰</span>
        )}
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            {drop.itemName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ID: {drop.itemId}
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            機率
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-center">
            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {chancePercent}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            數量
          </div>
          <div className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-center">
            <span className="text-sm font-bold text-green-700 dark:text-green-300">
              {qtyRange}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 怪物掉落 Modal 元件
interface MonsterDropsModalProps {
  isOpen: boolean
  onClose: () => void
  monsterId: number | null
  monsterName: string
  allDrops: DropItem[]
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  // 物品相關 props
  isItemFavorite: (itemId: number) => boolean
  onToggleItemFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
}

function MonsterDropsModal({
  isOpen,
  onClose,
  monsterId,
  monsterName,
  allDrops,
  isFavorite,
  onToggleFavorite,
  isItemFavorite,
  onToggleItemFavorite,
  onItemClick,
}: MonsterDropsModalProps) {
  const [monsterImageError, setMonsterImageError] = useState(false)

  // 過濾該怪物的所有掉落物品
  const monsterDrops = useMemo(() => {
    if (!monsterId) return []
    return allDrops.filter((drop) => drop.mobId === monsterId)
  }, [monsterId, allDrops])

  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      // 防止背景滾動
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !monsterId) return null

  const monsterIconUrl = monsterImageError
    ? '/images/monsters/default.svg'
    : `/images/monsters/${monsterId}.png`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={monsterIconUrl}
                alt={monsterName}
                className="w-16 h-16 object-contain"
                onError={() => setMonsterImageError(true)}
              />
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {monsterName}
                </h2>
                <p className="text-blue-100 text-sm">
                  怪物 ID: {monsterId} · 共 {monsterDrops.length} 種掉落物品
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 最愛按鈕 */}
              <button
                onClick={() => monsterId && onToggleFavorite(monsterId, monsterName)}
                className={`p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isFavorite
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
                aria-label={isFavorite ? '取消收藏' : '加入收藏'}
              >
                <svg
                  className="w-6 h-6"
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
              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="關閉"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content - 掉落物品列表 */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monsterDrops.map((drop, index) => (
              <DropItemCard
                key={`${drop.itemId}-${index}`}
                drop={drop}
                isFavorite={isItemFavorite(drop.itemId)}
                onToggleFavorite={onToggleItemFavorite}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 物品掉落 Modal 元件
interface ItemDropsModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: number | null
  itemName: string
  allDrops: DropItem[]
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  // 怪物相關 props
  isMonsterFavorite: (mobId: number) => boolean
  onToggleMonsterFavorite: (mobId: number, mobName: string) => void
  onMonsterClick: (mobId: number, mobName: string) => void
}

function ItemDropsModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  allDrops,
  isFavorite,
  onToggleFavorite,
  isMonsterFavorite,
  onToggleMonsterFavorite,
  onMonsterClick,
}: ItemDropsModalProps) {
  const [itemImageError, setItemImageError] = useState(false)

  // 過濾該物品的所有掉落來源怪物
  const itemDrops = useMemo(() => {
    if (!itemId && itemId !== 0) return []
    return allDrops.filter((drop) => drop.itemId === itemId)
  }, [itemId, allDrops])

  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      // 防止背景滾動
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || (itemId === null && itemId !== 0)) return null

  const itemIconUrl =
    itemId === 0
      ? null
      : itemImageError
        ? '/images/items/default.svg'
        : `/images/items/${itemId}.png`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - GREEN GRADIENT */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {itemIconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={itemIconUrl}
                  alt={itemName}
                  className="w-16 h-16 object-contain"
                  onError={() => setItemImageError(true)}
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center">
                  <span className="text-5xl">💰</span>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {itemName}
                </h2>
                <p className="text-green-100 text-sm">
                  物品 ID: {itemId} · 共 {itemDrops.length} 隻怪物掉落此物品
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 最愛按鈕 */}
              <button
                onClick={() => itemId !== null && onToggleFavorite(itemId, itemName)}
                className={`p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isFavorite
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
                aria-label={isFavorite ? '取消收藏' : '加入收藏'}
              >
                <svg
                  className="w-6 h-6"
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
              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="關閉"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content - 掉落來源怪物列表 */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itemDrops.map((drop, index) => (
              <MonsterDropCard
                key={`${drop.mobId}-${index}`}
                drop={drop}
                isFavorite={isMonsterFavorite(drop.mobId)}
                onToggleFavorite={onToggleMonsterFavorite}
                onMonsterClick={onMonsterClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Bug 回報 Modal 元件
interface BugReportModalProps {
  isOpen: boolean
  onClose: () => void
}

function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🐛</div>
              <div>
                <h2 className="text-2xl font-bold text-white">回報問題</h2>
                <p className="text-red-100 text-sm mt-1">遇到 Bug 或有建議嗎？</p>
              </div>
            </div>
            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="關閉"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Discord 聯絡資訊 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515a.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0a12.64 12.64 0 00-.617-1.25a.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057a19.9 19.9 0 005.993 3.03a.078.078 0 00.084-.028a14.09 14.09 0 001.226-1.994a.076.076 0 00-.041-.106a13.107 13.107 0 01-1.872-.892a.077.077 0 01-.008-.128a10.2 10.2 0 00.372-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127a12.299 12.299 0 01-1.873.892a.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028a19.839 19.839 0 006.002-3.03a.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Discord 聯絡方式</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  方式 1：加好友
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                    tiencheng
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('tiencheng')
                      alert('已複製到剪貼簿！')
                    }}
                    className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors text-sm"
                  >
                    複製
                  </button>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  方式 2：在群組標記
                </p>
                <code className="block bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-purple-600 dark:text-purple-400 font-mono text-sm">
                  @tiencheng
                </code>
              </div>
            </div>
          </div>

          {/* 回報指引 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
              📝 回報時請包含：
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>發生什麼問題或您的建議</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>如何重現問題（如果適用）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>您的瀏覽器和裝置資訊</span>
              </li>
            </ul>
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// 清除最愛確認 Modal 元件
interface ConfirmClearModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'monsters' | 'items'
  count: number
}

function ConfirmClearModal({ isOpen, onClose, onConfirm, type, count }: ConfirmClearModalProps) {
  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const title = type === 'monsters' ? '清除所有最愛怪物' : '清除所有最愛物品'
  const message = type === 'monsters'
    ? `確定要清除所有 ${count} 隻最愛怪物嗎？`
    : `確定要清除所有 ${count} 個最愛物品嗎？`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - 警告漸層 (橙色/紅色) */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700 p-6 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-orange-100 text-sm mt-1">此操作無法復原</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
            {message}
          </p>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 mb-6">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              ⚠️ 警告：清除後將無法恢復，所有收藏的{type === 'monsters' ? '怪物' : '物品'}都會被移除。
            </p>
          </div>

          {/* 按鈕組 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              確定清除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [allDrops, setAllDrops] = useState<DropItem[]>([])
  const [filteredDrops, setFilteredDrops] = useState<DropItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(null)
  const [selectedMonsterName, setSelectedMonsterName] = useState('')
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedItemName, setSelectedItemName] = useState('')
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false)
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [clearModalType, setClearModalType] = useState<'monsters' | 'items'>('monsters')

  // 篩選模式：全部 or 最愛怪物 or 最愛物品
  const [filterMode, setFilterMode] = useState<'all' | 'favorite-monsters' | 'favorite-items'>('all')

  // Debounced 搜尋詞 - 延遲 500ms 以減少計算頻率
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500)

  // 最愛怪物管理
  const { favorites, toggleFavorite, isFavorite, favoriteCount, clearAll: clearAllMonsters } =
    useFavoriteMonsters()

  // 最愛物品管理
  const {
    favorites: itemFavorites,
    toggleFavorite: toggleItemFavorite,
    isFavorite: isItemFavorite,
    favoriteCount: itemFavoriteCount,
    clearAll: clearAllItems,
  } = useFavoriteItems()

  // 載入資料
  useEffect(() => {
    async function fetchDrops() {
      try {
        setIsLoading(true)
        const res = await fetch('/api/maplestory', {
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error('無法獲取掉落資料')
        }

        const data = await res.json()
        setAllDrops(data.data || [])
        // 初始不設定 filteredDrops，等待隨機樣本計算完成
        setMessage(data.message || '')
      } catch (error) {
        console.error('獲取掉落資料失敗:', error)
        setMessage('獲取資料失敗')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDrops()
  }, [])

  // 隨機選擇 100 筆資料（初始顯示用）- Fisher-Yates shuffle
  const initialRandomDrops = useMemo(() => {
    if (allDrops.length === 0) return []

    // 複製陣列避免修改原始資料
    const shuffled = [...allDrops]

    // Fisher-Yates shuffle 演算法（只 shuffle 前 100 個）
    const sampleSize = Math.min(100, allDrops.length)
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = i + Math.floor(Math.random() * (shuffled.length - i))
      ;[shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]
    }

    return shuffled.slice(0, sampleSize)
  }, [allDrops])

  // 計算去重的最愛怪物清單（每個怪物只出現一次）
  const uniqueFavoriteMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters' || favorites.length === 0) return []

    const favMobIds = new Set(favorites.map((fav) => fav.mobId))
    const monsterMap = new Map<number, { mobId: number; mobName: string; dropCount: number }>()

    // 統計每個怪物的掉落物數量
    allDrops.forEach((drop) => {
      if (favMobIds.has(drop.mobId)) {
        if (!monsterMap.has(drop.mobId)) {
          monsterMap.set(drop.mobId, {
            mobId: drop.mobId,
            mobName: drop.mobName,
            dropCount: 0,
          })
        }
        monsterMap.get(drop.mobId)!.dropCount++
      }
    })

    return Array.from(monsterMap.values())
  }, [filterMode, favorites, allDrops])

  // 計算去重的最愛物品清單（每個物品只出現一次）
  const uniqueFavoriteItems = useMemo(() => {
    if (filterMode !== 'favorite-items' || itemFavorites.length === 0) return []

    const favItemIds = new Set(itemFavorites.map((fav) => fav.itemId))
    const itemMap = new Map<number, { itemId: number; itemName: string; monsterCount: number }>()

    // 統計每個物品被多少怪物掉落
    allDrops.forEach((drop) => {
      if (favItemIds.has(drop.itemId)) {
        if (!itemMap.has(drop.itemId)) {
          itemMap.set(drop.itemId, {
            itemId: drop.itemId,
            itemName: drop.itemName,
            monsterCount: 0,
          })
        }
        // 統計獨特的怪物數量（避免重複計算同一怪物）
        const uniqueMonsters = new Set<number>()
        allDrops.forEach((d) => {
          if (d.itemId === drop.itemId) {
            uniqueMonsters.add(d.mobId)
          }
        })
        itemMap.get(drop.itemId)!.monsterCount = uniqueMonsters.size
      }
    })

    return Array.from(itemMap.values())
  }, [filterMode, itemFavorites, allDrops])

  // 最愛怪物搜尋過濾
  const filteredUniqueMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteMonsters
    }

    const searchLower = debouncedSearchTerm.toLowerCase()
    return uniqueFavoriteMonsters.filter((monster) =>
      monster.mobName.toLowerCase().includes(searchLower)
    )
  }, [uniqueFavoriteMonsters, debouncedSearchTerm, filterMode])

  // 最愛物品搜尋過濾
  const filteredUniqueItems = useMemo(() => {
    if (filterMode !== 'favorite-items') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteItems
    }

    const searchLower = debouncedSearchTerm.toLowerCase()
    return uniqueFavoriteItems.filter((item) =>
      item.itemName.toLowerCase().includes(searchLower)
    )
  }, [uniqueFavoriteItems, debouncedSearchTerm, filterMode])

  // 搜尋功能 - 即時搜尋（使用 debounced 值）+ 最愛篩選
  useEffect(() => {
    let baseDrops: DropItem[] = []

    // 根據篩選模式選擇基礎資料
    if (filterMode === 'favorite-monsters' || filterMode === 'favorite-items') {
      // 最愛模式：不使用此 effect（由 filteredUniqueMonsters/filteredUniqueItems 處理）
      return
    } else {
      // 全部模式
      baseDrops = debouncedSearchTerm.trim() === '' ? initialRandomDrops : allDrops
    }

    // 應用搜尋過濾
    if (debouncedSearchTerm.trim() === '') {
      setFilteredDrops(baseDrops)
    } else {
      const searchLower = debouncedSearchTerm.toLowerCase()
      const filtered = baseDrops.filter((drop) => {
        return (
          drop.mobName.toLowerCase().includes(searchLower) ||
          drop.itemName.toLowerCase().includes(searchLower)
        )
      })
      setFilteredDrops(filtered)
    }
  }, [debouncedSearchTerm, allDrops, initialRandomDrops, filterMode, favorites])

  // 預建名稱索引 - 只在資料載入時計算一次
  const nameIndex = useMemo(() => {
    const monsterMap = new Map<string, SuggestionItem>()
    const itemMap = new Map<string, SuggestionItem>()

    allDrops.forEach((drop) => {
      // 建立怪物名稱索引
      const mobNameLower = drop.mobName.toLowerCase()
      const existingMonster = monsterMap.get(mobNameLower)
      if (existingMonster) {
        existingMonster.count++
      } else {
        monsterMap.set(mobNameLower, {
          name: drop.mobName, // 保留原始大小寫
          type: 'monster',
          count: 1,
        })
      }

      // 建立物品名稱索引
      const itemNameLower = drop.itemName.toLowerCase()
      const existingItem = itemMap.get(itemNameLower)
      if (existingItem) {
        existingItem.count++
      } else {
        itemMap.set(itemNameLower, {
          name: drop.itemName, // 保留原始大小寫
          type: 'item',
          count: 1,
        })
      }
    })

    return { monsterMap, itemMap }
  }, [allDrops])

  // 計算搜尋建議列表（使用索引優化效能）
  const suggestions = useMemo(() => {
    if (debouncedSearchTerm.trim() === '' || nameIndex.monsterMap.size === 0) {
      return []
    }

    const searchLower = debouncedSearchTerm.toLowerCase()
    const results: SuggestionItem[] = []

    // 從怪物索引中搜尋（不遍歷 allDrops，直接搜尋索引）
    nameIndex.monsterMap.forEach((suggestion, nameLower) => {
      if (nameLower.includes(searchLower)) {
        results.push(suggestion)
      }
    })

    // 從物品索引中搜尋
    nameIndex.itemMap.forEach((suggestion, nameLower) => {
      if (nameLower.includes(searchLower)) {
        results.push(suggestion)
      }
    })

    // 排序：優先開頭匹配，其次按出現次數
    results.sort((a, b) => {
      const aNameLower = a.name.toLowerCase()
      const bNameLower = b.name.toLowerCase()
      const aStartsWith = aNameLower.startsWith(searchLower)
      const bStartsWith = bNameLower.startsWith(searchLower)

      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return b.count - a.count // 出現次數多的排前面
    })

    // 限制結果數量最多 10 個
    return results.slice(0, 10)
  }, [debouncedSearchTerm, nameIndex])

  // 選擇建議項目
  const selectSuggestion = (suggestionName: string) => {
    setSearchTerm(suggestionName)
    setShowSuggestions(false)
    setFocusedIndex(-1)
  }

  // Modal 處理函數
  const handleCardClick = (mobId: number, mobName: string) => {
    setSelectedMonsterId(mobId)
    setSelectedMonsterName(mobName)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMonsterId(null)
    setSelectedMonsterName('')
  }

  // 物品點擊處理 - 開啟 ItemDropsModal
  const handleItemClick = (itemId: number, itemName: string) => {
    setSelectedItemId(itemId)
    setSelectedItemName(itemName)
    setIsItemModalOpen(true)
  }

  const handleCloseItemModal = () => {
    setIsItemModalOpen(false)
    setSelectedItemId(null)
    setSelectedItemName('')
  }

  // 清除最愛確認處理
  const handleClearConfirm = () => {
    if (clearModalType === 'monsters') {
      clearAllMonsters()
    } else {
      clearAllItems()
    }
  }

  // 鍵盤導航處理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          selectSuggestion(suggestions[focusedIndex].name)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setFocusedIndex(-1)
        break
    }
  }

  // 點擊外部關閉建議列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Sticky Header - 固定搜尋區域 */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm pb-6 shadow-md">
          {/* 標題區域 */}
          <div className="text-center mb-8 pt-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              ChronoStory
            </h1>
          </div>

          {/* 搜尋框 */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative" ref={searchContainerRef}>
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="搜尋怪物名稱或物品名稱..."
                className="w-full pl-12 pr-12 py-4 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              {/* 建議列表 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.type}-${suggestion.name}`}
                      onClick={() => selectSuggestion(suggestion.name)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                        focusedIndex === index
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } ${index === 0 ? 'rounded-t-lg' : ''} ${
                        index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {suggestion.type === 'monster' ? (
                          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                          </svg>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {suggestion.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {suggestion.type === 'monster' ? '怪物' : '物品'} · {suggestion.count} 筆資料
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 篩選按鈕 - 全部/最愛怪物/最愛物品 */}
          <div className="max-w-7xl mx-auto mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  filterMode === 'all'
                    ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterMode('favorite-monsters')}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  filterMode === 'favorite-monsters'
                    ? 'bg-red-500 text-white shadow-md hover:bg-red-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                我的最愛 - 怪物
                {favoriteCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">
                    {favoriteCount}
                  </span>
                )}
              </button>
              {/* 清除怪物最愛按鈕 */}
              {favoriteCount > 0 && (
                <button
                  onClick={() => {
                    setClearModalType('monsters')
                    setIsClearModalOpen(true)
                  }}
                  className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md hover:shadow-lg"
                  title="清除所有最愛怪物"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清除
                </button>
              )}
              <button
                onClick={() => setFilterMode('favorite-items')}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  filterMode === 'favorite-items'
                    ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                我的最愛 - 物品
                {itemFavoriteCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">
                    {itemFavoriteCount}
                  </span>
                )}
              </button>
              {/* 清除物品最愛按鈕 */}
              {itemFavoriteCount > 0 && (
                <button
                  onClick={() => {
                    setClearModalType('items')
                    setIsClearModalOpen(true)
                  }}
                  className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md hover:shadow-lg"
                  title="清除所有最愛物品"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清除
                </button>
              )}
            </div>
          </div>

          {/* 資料統計 */}
          <div className="max-w-7xl mx-auto">
            <div className="rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ {message}
                  </p>
                  <p className="text-xs mt-1 text-green-600 dark:text-green-300">
                    {filterMode === 'favorite-monsters'
                      ? searchTerm
                        ? `搜尋結果: ${filteredUniqueMonsters.length} 隻怪物（從 ${favoriteCount} 隻最愛怪物中搜尋）`
                        : `我的最愛: ${filteredUniqueMonsters.length} 隻怪物`
                      : filterMode === 'favorite-items'
                        ? searchTerm
                          ? `搜尋結果: ${filteredUniqueItems.length} 個物品（從 ${itemFavoriteCount} 個最愛物品中搜尋）`
                          : `我的最愛: ${filteredUniqueItems.length} 個物品`
                        : searchTerm
                          ? `搜尋結果: ${filteredDrops.length} 筆掉落（從 ${allDrops.length} 筆中搜尋）`
                          : `隨機顯示 ${filteredDrops.length} 筆（共 ${allDrops.length} 筆掉落資料）`} | 資料來源: ChronoStory 掉落表
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* End Sticky Header */}

        {/* 載入中 */}
        {isLoading ? (
          <div className="text-center py-12 mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">載入中...</p>
          </div>
        ) : (
          <>
            {filterMode === 'favorite-monsters' ? (
              /* 最愛怪物模式 - 顯示怪物卡片 */
              filteredUniqueMonsters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredUniqueMonsters.map((monster) => (
                    <MonsterCard
                      key={monster.mobId}
                      mobId={monster.mobId}
                      mobName={monster.mobName}
                      dropCount={monster.dropCount}
                      onCardClick={handleCardClick}
                      isFavorite={true}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">
                    {searchTerm ? '🔍' : '💝'}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {searchTerm ? '找不到符合的最愛怪物' : '還沒有收藏任何怪物'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {searchTerm
                      ? '試試搜尋其他關鍵字'
                      : '點擊卡片上的愛心按鈕來收藏怪物吧！'}
                  </p>
                </div>
              )
            ) : filterMode === 'favorite-items' ? (
              /* 最愛物品模式 - 顯示物品卡片 */
              filteredUniqueItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredUniqueItems.map((item) => (
                    <ItemCard
                      key={item.itemId}
                      itemId={item.itemId}
                      itemName={item.itemName}
                      monsterCount={item.monsterCount}
                      onCardClick={handleItemClick}
                      isFavorite={true}
                      onToggleFavorite={toggleItemFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">
                    {searchTerm ? '🔍' : '💝'}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {searchTerm ? '找不到符合的最愛物品' : '還沒有收藏任何物品'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {searchTerm
                      ? '試試搜尋其他關鍵字'
                      : '點擊物品卡片上的愛心按鈕來收藏物品吧！'}
                  </p>
                </div>
              )
            ) : (
              /* 全部模式 - 顯示掉落卡片 */
              filteredDrops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredDrops.map((drop, index) => (
                    <DropCard
                      key={`${drop.mobId}-${drop.itemId}-${index}`}
                      drop={drop}
                      onCardClick={handleCardClick}
                      isFavorite={isFavorite(drop.mobId)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {searchTerm ? '找不到符合的結果' : '目前沒有掉落資料'}
                  </p>
                  {searchTerm && (
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                      試試搜尋其他關鍵字，例如：Snail、Meso、Potion
                    </p>
                  )}
                </div>
              )
            )}
          </>
        )}

        {/* 底部資訊 */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            <a
              href="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKuZGJQIFFxSi6kzYx4ALI0MQborpLEkh3J1qIGSd0Bw7U4NYg5CK-3ESzyK580z4D8NO59SUeC3k/pubhtml?gid=1888753114&single=true"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
            >
              資料來源: ChronoStory 楓之谷私服掉落表
            </a>
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
            掉落機率已轉換為百分比顯示 | 即時搜尋
          </p>
        </div>
      </div>

      {/* Monster Drops Modal */}
      <MonsterDropsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        monsterId={selectedMonsterId}
        monsterName={selectedMonsterName}
        allDrops={allDrops}
        isFavorite={selectedMonsterId ? isFavorite(selectedMonsterId) : false}
        onToggleFavorite={toggleFavorite}
        isItemFavorite={isItemFavorite}
        onToggleItemFavorite={toggleItemFavorite}
        onItemClick={handleItemClick}
      />

      {/* Item Drops Modal */}
      <ItemDropsModal
        isOpen={isItemModalOpen}
        onClose={handleCloseItemModal}
        itemId={selectedItemId}
        itemName={selectedItemName}
        allDrops={allDrops}
        isFavorite={selectedItemId !== null ? isItemFavorite(selectedItemId) : false}
        onToggleFavorite={toggleItemFavorite}
        isMonsterFavorite={isFavorite}
        onToggleMonsterFavorite={toggleFavorite}
        onMonsterClick={handleCardClick}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportModalOpen}
        onClose={() => setIsBugReportModalOpen(false)}
      />

      {/* Confirm Clear Modal */}
      <ConfirmClearModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearConfirm}
        type={clearModalType}
        count={clearModalType === 'monsters' ? favoriteCount : itemFavoriteCount}
      />

      {/* 浮動 Bug 回報按鈕 */}
      <button
        onClick={() => setIsBugReportModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="回報問題"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐛</span>
          <span className="text-sm font-medium hidden group-hover:inline-block">回報問題</span>
        </div>
      </button>
    </div>
  )
}
