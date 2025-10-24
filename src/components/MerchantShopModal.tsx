'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { clientLogger } from '@/lib/logger'

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

interface MerchantShopModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 商人專賣 Modal
 * 顯示 100% 掉落的卷軸物品資訊
 */
export function MerchantShopModal({ isOpen, onClose }: MerchantShopModalProps) {
  const { language, t, setLanguage } = useLanguage()
  const [maps, setMaps] = useState<MerchantShopMap[]>([])
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 語言切換函數
  const toggleLanguage = () => {
    const newLanguage: 'zh-TW' | 'en' = language === 'zh-TW' ? 'en' : 'zh-TW'
    setLanguage(newLanguage)
  }

  // 載入 100% 掉落資料
  useEffect(() => {
    if (!isOpen || maps.length > 0) return

    async function loadData() {
      setIsLoading(true)
      try {
        clientLogger.info('載入商人專賣資料（100% 掉落）...')

        // 使用動態 import 載入資料
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
  }, [isOpen, maps.length])

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

  // 切換地圖展開狀態
  const toggleMap = (mapId: string) => {
    setExpandedMapId(expandedMapId === mapId ? null : mapId)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-stone-600 dark:bg-stone-700 p-4 sm:p-6 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* 左側：預留空間 */}
            <div className="flex-1" />

            {/* 中間：標題 + 副標題 */}
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t('merchant.button')}</h2>
              <p className="text-stone-200 text-xs sm:text-sm mt-1">
                {expandedMapId
                  ? (() => {
                      const expandedMap = maps.find(m => m.mapId === expandedMapId)
                      if (!expandedMap) return `${t('merchant.total')} ${maps.length} ${t('merchant.mapCount')}`
                      const displayMapName = language === 'zh-TW' ? expandedMap.chineseMapName : expandedMap.mapName
                      return `${displayMapName} · ${expandedMap.drops.length} ${t('merchant.itemUnit')}`
                    })()
                  : `${t('merchant.total')} ${maps.length} ${t('merchant.mapCount')}`}
              </p>
            </div>

            {/* 右側：功能按鈕組 */}
            <div className="flex-1 flex items-center gap-2 justify-end">
              {/* 語言切換按鈕 */}
              <button
                onClick={toggleLanguage}
                className="p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
                aria-label={t('language.toggle')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
                aria-label={t('merchant.close')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {maps.map((map) => {
                const isExpanded = expandedMapId === map.mapId
                const displayMapName = language === 'zh-TW' ? map.chineseMapName : map.mapName

                return (
                  <div
                    key={map.mapId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    {/* 地圖標題 */}
                    <button
                      onClick={() => toggleMap(map.mapId)}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900 dark:text-white">{displayMapName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('merchant.itemCount').replace('{count}', map.drops.length.toString())} • {map.region}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </button>

                    {/* 物品列表（展開時顯示） */}
                    {isExpanded && (
                      <div className="p-4 bg-white dark:bg-gray-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {map.drops.map((item, index) => {
                            const displayItemName = language === 'zh-TW' ? item.chineseItemName : item.itemName

                            return (
                              <div
                                key={`${map.mapId}-${index}`}
                                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                  {displayItemName}
                                </h4>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
