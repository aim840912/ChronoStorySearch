'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import {
  type MultiStageRecipe,
  type StageRecipe,
  getMaterialImageUrl,
} from '@/lib/crafting-utils'

interface CraftingRecipeCardProps {
  recipe: MultiStageRecipe
  onItemClick?: (itemId: number) => void
}

/**
 * 單一階段的材料行
 */
function StageRow({
  stageRecipe,
  onItemClick,
}: {
  stageRecipe: StageRecipe
  onItemClick?: (itemId: number) => void
}) {
  const { language } = useLanguage()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 階段標籤 */}
      <span className="text-xs font-semibold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full min-w-[40px] text-center">
        {stageRecipe.stage}
      </span>

      {/* 前階武器（2nd/3rd/Last 階段有值） */}
      {stageRecipe.previousWeaponId && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onItemClick?.(stageRecipe.previousWeaponId!)}
            className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-2 py-1.5 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800/40 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            title={language === 'zh-TW' ? '點擊查看詳情' : 'Click to view details'}
          >
            <img
              src={getMaterialImageUrl(stageRecipe.previousWeaponId)}
              alt="Previous weapon"
              className="w-8 h-8 object-contain"
              loading="lazy"
            />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              x1
            </span>
          </button>
          <span className="text-gray-400 dark:text-gray-500 text-lg">+</span>
        </div>
      )}

      {/* 材料 */}
      {stageRecipe.materials.map((material, index) => (
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
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                x{material.quantity}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 製作配方卡片元件
 * 顯示 Unwelcome Guest 武器的所有階段製作材料
 */
export function CraftingRecipeCard({ recipe, onItemClick }: CraftingRecipeCardProps) {
  const { language } = useLanguage()

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-lg p-4 border border-amber-200 dark:border-amber-700">
      {/* 標題 */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
        <h4 className="font-semibold text-amber-800 dark:text-amber-200">
          {language === 'zh-TW' ? '製作方法' : 'Crafting Recipe'}
        </h4>
        <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
          {recipe.currentStage}
        </span>
      </div>

      {/* 多行階段材料 */}
      <div className="flex flex-col gap-2">
        {recipe.stages.map((stageRecipe) => (
          <StageRow key={stageRecipe.stage} stageRecipe={stageRecipe} onItemClick={onItemClick} />
        ))}
      </div>
    </div>
  )
}
