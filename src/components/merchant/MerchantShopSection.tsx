'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { clientLogger } from '@/lib/logger'
import { DisplayAd, MultiplexAd } from '@/components/adsense'

const MAP_GROUP_AD_INTERVAL = 3
const MAX_MAP_ADS = 2

interface MerchantShopItem {
  itemName: string
  chineseItemName: string
  itemType: string
  category: string
  stat: string
}

interface MerchantShopMap {
  mapId: string
  mapName: string
  chineseMapName: string
  region: string
  drops: MerchantShopItem[]
}

interface MerchantShopSectionProps {
  /** 選中的地圖 ID（null = 顯示全部） */
  mapId: string | null
  /** 關閉回調 */
  onClose: () => void
}

/**
 * 商人商店區域元件
 * 顯示在 SearchHeader 和 ContentDisplay 之間，類似 GachaDrawSection
 */
export function MerchantShopSection({
  mapId,
  onClose,
}: MerchantShopSectionProps) {
  const { t, language } = useLanguage()
  const [maps, setMaps] = useState<MerchantShopMap[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 載入商人商店資料
  useEffect(() => {
    if (maps.length > 0) return

    async function loadData() {
      setIsLoading(true)
      try {
        clientLogger.info('載入商人專賣資料（100% 掉落）...')
        const data = await import('@/../data/drops-100-percent.json')
        setMaps(data.default as MerchantShopMap[])
        clientLogger.info(`成功載入 ${data.default.length} 個地圖的 100% 掉落資料`)
      } catch (error) {
        clientLogger.error('載入商人專賣資料失敗', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [maps.length])

  // 篩選要顯示的地圖
  const displayMaps = useMemo(() => {
    if (mapId === null) {
      return maps
    }
    return maps.filter(m => m.mapId === mapId)
  }, [maps, mapId])

  // 計算總物品數
  const totalItems = useMemo(() => {
    return displayMaps.reduce((sum, map) => sum + map.drops.length, 0)
  }, [displayMaps])

  // 標題
  const title = useMemo(() => {
    if (mapId === null) {
      return t('merchant.viewAll')
    }
    const selectedMap = maps.find(m => m.mapId === mapId)
    if (!selectedMap) return t('merchant.button')
    return language === 'zh-TW' ? selectedMap.chineseMapName : selectedMap.mapName
  }, [mapId, maps, language, t])

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t('merchant.itemUnit')}
          </p>
        </div>

        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={t('common.close')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 內容區域 */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {displayMaps.flatMap((map, index) => {
              const displayMapName = language === 'zh-TW' ? map.chineseMapName : map.mapName

              const mapCard = (
                <div key={map.mapId}>
                  {/* 地圖標題（只在顯示全部時顯示） */}
                  {mapId === null && (
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {displayMapName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {map.drops.length} {t('merchant.itemUnit')} - {map.region}
                      </p>
                    </div>
                  )}

                  {/* 物品網格 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {map.drops.map((item, dropIndex) => {
                      const displayItemName = language === 'zh-TW' ? item.chineseItemName : item.itemName

                      return (
                        <div
                          key={`${map.mapId}-${dropIndex}`}
                          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {displayItemName}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.category} - {item.stat}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )

              // 顯示全部時，每 MAP_GROUP_AD_INTERVAL 個地圖後插入 DisplayAd（最多 MAX_MAP_ADS 個）
              const adPosition = Math.floor((index + 1) / MAP_GROUP_AD_INTERVAL)
              const shouldInsertAd =
                mapId === null &&
                (index + 1) % MAP_GROUP_AD_INTERVAL === 0 &&
                index < displayMaps.length - 1 &&
                adPosition <= MAX_MAP_ADS

              if (shouldInsertAd) {
                return [mapCard, <DisplayAd key={`ad-map-${index}`} />]
              }

              return [mapCard]
            })}

            {/* 列表底部廣告 */}
            {displayMaps.length > 0 && <MultiplexAd />}
          </div>
        )}
      </div>
    </div>
  )
}
