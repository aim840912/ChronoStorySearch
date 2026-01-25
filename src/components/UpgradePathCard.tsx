'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { type UpgradeRecipe, getMaterialImageUrl } from '@/lib/crafting-utils'

interface UpgradePathCardProps {
  recipe: UpgradeRecipe
  onItemClick?: (itemId: number) => void
}

/**
 * 升級路徑卡片元件
 * 顯示 Unwelcome Guest 武器升級到下一階段所需的材料
 */
export function UpgradePathCard({ recipe, onItemClick }: UpgradePathCardProps) {
  const { t, language } = useLanguage()

  return (
    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-lg p-4 border border-green-200 dark:border-green-700">
      {/* 標題 */}
      <div className="flex items-center gap-2 mb-3">
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
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
        <h4 className="font-semibold text-green-800 dark:text-green-200">
          {t('item.upgradeToNext')}
        </h4>
        <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
          {recipe.currentStage} → {recipe.nextStage}
        </span>
      </div>

      {/* 升級材料與目標 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 材料 */}
        {recipe.materials.map((material, index) => (
          <div key={material.itemId} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-lg">+</span>
            )}
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-600">
              <img
                src={getMaterialImageUrl(material.itemId)}
                alt={material.name.en}
                className="w-8 h-8 object-contain"
                loading="lazy"
              />
              <div className="flex flex-col items-start">
                <span className="text-xs text-gray-700 dark:text-gray-300 max-w-[80px] truncate">
                  {language === 'zh-TW' ? material.name.zh : material.name.en}
                </span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  x{material.quantity}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* 箭頭 */}
        <span className="text-green-500 dark:text-green-400 text-xl font-bold mx-1">→</span>

        {/* 下一階武器 */}
        <button
          type="button"
          onClick={() => onItemClick?.(recipe.nextWeaponId)}
          className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg px-2 py-1.5 border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800/40 hover:border-green-400 dark:hover:border-green-600 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          title={language === 'zh-TW' ? '點擊查看詳情' : 'Click to view details'}
        >
          <img
            src={getMaterialImageUrl(recipe.nextWeaponId)}
            alt={`${recipe.nextStage} weapon`}
            className="w-10 h-10 object-contain"
            loading="lazy"
          />
          <span className="text-xs font-semibold text-green-700 dark:text-green-300">
            {recipe.nextStage}
          </span>
        </button>
      </div>
    </div>
  )
}
