'use client'

import { memo, useState } from 'react'
import type { DropsEssential, ItemAttributesEssential, GachaMachine } from '@/types'
import { MonsterModal } from '@/components/MonsterModal'
import { ItemModal } from '@/components/ItemModal'
import { BugReportModal } from '@/components/BugReportModal'
import { ClearConfirmModal } from '@/components/ClearConfirmModal'
import { AccuracyCalculatorModal } from '@/components/AccuracyCalculatorModal'
import { GameCommandsModal } from '@/components/GameCommandsModal'
import { MerchantShopModal } from '@/components/MerchantShopModal'
import { PrivacySettingsModal } from '@/components/settings/PrivacySettingsModal'
import { DevApiTester } from '@/components/dev/DevApiTester'
import { ScreenRecorderModal } from '@/components/tools/screen-recorder'
import { ExpTrackerModal } from '@/components/tools/exp-tracker'
import { Toast } from '@/components/Toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguageToggle } from '@/hooks/useLanguageToggle'

interface ModalManagerProps {
  // Modal 狀態 from useModalManager
  isMonsterModalOpen: boolean
  isItemModalOpen: boolean
  isBugReportModalOpen: boolean
  isClearModalOpen: boolean
  isMerchantShopModalOpen: boolean
  isAccuracyCalculatorOpen: boolean
  selectedMonsterId: number | null | undefined
  selectedMonsterName: string
  selectedItemId: number | null
  selectedItemName: string
  selectedMerchantMapId?: string
  clearModalType: 'monsters' | 'items'
  accuracyInitialMonsterId: number | null | undefined
  hasPreviousModal: boolean

  // Modal 關閉函數
  closeMonsterModal: () => void
  closeItemModal: () => void
  closeBugReportModal: () => void
  closeClearModal: () => void
  closeMerchantShopModal: () => void
  closeAccuracyCalculator: () => void
  goBack: () => void

  // Modal 開啟函數
  openBugReportModal: () => void
  openMerchantShopModal: (initialMapId?: string) => void
  openAccuracyCalculator: (initialMonsterId?: number | null) => void

  // 資料
  allDrops: DropsEssential[]  // 改為 Essential（只需基本資訊）
  gachaMachines: GachaMachine[]
  itemAttributesMap: Map<number, ItemAttributesEssential>
  merchantItemIndex: Map<string, Array<{
    mapId: string
    mapName: string
    chineseMapName: string
    region: string
  }>>

  // 最愛相關
  isFavorite: (mobId: number) => boolean
  toggleFavorite: (mobId: number, mobName: string) => void
  isItemFavorite: (itemId: number) => boolean
  toggleItemFavorite: (itemId: number, itemName: string) => void
  favoriteMonsterCount: number
  favoriteItemCount: number

  // 事件處理
  handleItemClickFromMonsterModal: (itemId: number, itemName: string) => void
  handleMonsterClickFromItemModal: (mobId: number, mobName: string) => void
  handleGachaMachineClick: (machineId: number) => void
  handleClearConfirm: () => void

  // 工具 Modal 狀態（舊的，僅用於 GameCommands）
  isAccuracyCalcOpen: boolean
  setIsAccuracyCalcOpen: (open: boolean) => void
  isGameCommandsOpen: boolean
  setIsGameCommandsOpen: (open: boolean) => void

  // Screen Recorder Modal
  isScreenRecorderModalOpen: boolean
  openScreenRecorderModal: () => void
  closeScreenRecorderModal: () => void

  // EXP Tracker Modal
  isExpTrackerModalOpen: boolean
  openExpTrackerModal: () => void
  closeExpTrackerModal: () => void

  // 浮動按鈕
  showBackToTop: boolean
  scrollToTop: () => void

  // Toast
  toastMessage: string
  toastIsVisible: boolean
  toastType: 'success' | 'error' | 'info'
  hideToast: () => void
}

/**
 * Modal 管理元件
 * 集中管理所有 Modal、浮動按鈕和 Toast 通知
 *
 * 使用 React.memo 優化以避免不必要的重新渲染
 */
export const ModalManager = memo(function ModalManager({
  isMonsterModalOpen,
  isItemModalOpen,
  isBugReportModalOpen,
  isClearModalOpen,
  isMerchantShopModalOpen,
  isAccuracyCalculatorOpen,
  selectedMonsterId,
  selectedMonsterName,
  selectedItemId,
  selectedItemName,
  selectedMerchantMapId,
  clearModalType,
  accuracyInitialMonsterId,
  hasPreviousModal,
  closeMonsterModal,
  closeItemModal,
  closeBugReportModal,
  closeClearModal,
  closeMerchantShopModal,
  closeAccuracyCalculator,
  goBack,
  openBugReportModal,
  openMerchantShopModal: _openMerchantShopModal,
  openAccuracyCalculator,
  allDrops,
  gachaMachines,
  itemAttributesMap,
  merchantItemIndex,
  isFavorite,
  toggleFavorite,
  isItemFavorite,
  toggleItemFavorite,
  favoriteMonsterCount,
  favoriteItemCount,
  handleItemClickFromMonsterModal,
  handleMonsterClickFromItemModal,
  handleGachaMachineClick,
  handleClearConfirm,
  isAccuracyCalcOpen: _isAccuracyCalcOpen,
  setIsAccuracyCalcOpen: _setIsAccuracyCalcOpen,
  isGameCommandsOpen,
  setIsGameCommandsOpen,
  isScreenRecorderModalOpen,
  openScreenRecorderModal,
  closeScreenRecorderModal,
  isExpTrackerModalOpen,
  openExpTrackerModal,
  closeExpTrackerModal,
  showBackToTop,
  scrollToTop,
  toastMessage,
  toastIsVisible,
  toastType,
  hideToast,
}: ModalManagerProps) {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const toggleLanguage = useLanguageToggle()

  // 隱私設定 Modal 狀態（內部管理）
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)

  // 判斷是否有任何 Modal 開啟（用於顯示懸浮翻譯按鈕）
  const isAnyModalOpen = isMonsterModalOpen ||
                         isItemModalOpen ||
                         isBugReportModalOpen ||
                         isClearModalOpen ||
                         isMerchantShopModalOpen ||
                         isAccuracyCalculatorOpen ||
                         isGameCommandsOpen ||
                         isPrivacyModalOpen ||
                         isScreenRecorderModalOpen ||
                         isExpTrackerModalOpen

  return (
    <>
      {/* Monster Drops Modal */}
      <MonsterModal
        isOpen={isMonsterModalOpen}
        onClose={closeMonsterModal}
        monsterId={selectedMonsterId ?? null}
        monsterName={selectedMonsterName}
        allDrops={allDrops}
        itemAttributesMap={itemAttributesMap}
        isFavorite={selectedMonsterId !== null && selectedMonsterId !== undefined ? isFavorite(selectedMonsterId) : false}
        onToggleFavorite={toggleFavorite}
        isItemFavorite={isItemFavorite}
        onToggleItemFavorite={toggleItemFavorite}
        onItemClick={handleItemClickFromMonsterModal}
        hasPreviousModal={hasPreviousModal}
        onGoBack={goBack}
        onOpenAccuracyCalculator={openAccuracyCalculator}
      />

      {/* Item Drops Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={closeItemModal}
        itemId={selectedItemId}
        itemName={selectedItemName}
        allDrops={allDrops}
        gachaMachines={gachaMachines}
        itemAttributesMap={itemAttributesMap}
        merchantItemIndex={merchantItemIndex}
        isFavorite={selectedItemId !== null ? isItemFavorite(selectedItemId) : false}
        onToggleFavorite={toggleItemFavorite}
        isMonsterFavorite={isFavorite}
        onToggleMonsterFavorite={toggleFavorite}
        onMonsterClick={handleMonsterClickFromItemModal}
        onGachaMachineClick={handleGachaMachineClick}
        hasPreviousModal={hasPreviousModal}
        onGoBack={goBack}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportModalOpen}
        onClose={closeBugReportModal}
      />

      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Confirm Clear Modal */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={closeClearModal}
        onConfirm={handleClearConfirm}
        type={clearModalType}
        count={clearModalType === 'monsters' ? favoriteMonsterCount : favoriteItemCount}
      />

      {/* Accuracy Calculator Modal */}
      <AccuracyCalculatorModal
        isOpen={isAccuracyCalculatorOpen}
        onClose={closeAccuracyCalculator}
        initialMonsterId={accuracyInitialMonsterId ?? null}
      />

      {/* Game Commands Modal */}
      <GameCommandsModal
        isOpen={isGameCommandsOpen}
        onClose={() => setIsGameCommandsOpen(false)}
      />

      {/* Merchant Shop Modal */}
      <MerchantShopModal
        isOpen={isMerchantShopModalOpen}
        onClose={closeMerchantShopModal}
        initialMapId={selectedMerchantMapId}
      />

      {/* Screen Recorder Modal */}
      <ScreenRecorderModal
        isOpen={isScreenRecorderModalOpen}
        onClose={closeScreenRecorderModal}
      />

      {/* EXP Tracker Modal */}
      <ExpTrackerModal
        isOpen={isExpTrackerModalOpen}
        onClose={closeExpTrackerModal}
      />

      {/* 懸浮按鈕群組（僅在 Modal 開啟時顯示） */}
      {isAnyModalOpen && (
        <div className="fixed top-4 right-4 z-[65] flex gap-2">
          {/* 主題切換按鈕 */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label={t('theme.toggle')}
          >
            {theme === 'light' ? (
              // 太陽圖標（淺色模式）
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              // 月亮圖標（深色模式）
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* 翻譯切換按鈕 */}
          <button
            onClick={toggleLanguage}
            className="p-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
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
        </div>
      )}

      {/* 浮動遊戲指令按鈕 */}
      <button
        onClick={() => setIsGameCommandsOpen(true)}
        className="fixed bottom-[72px] sm:bottom-[96px] left-4 sm:left-6 z-40 p-3 sm:p-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('commands.button')}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('commands.button')}</span>
        </div>
      </button>

      {/* 浮動命中率計算器按鈕 */}
      <button
        onClick={() => openAccuracyCalculator()}
        className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-40 p-3 sm:p-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('accuracy.button')}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <circle cx="12" cy="12" r="6" strokeWidth="2"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('accuracy.buttonShort')}</span>
        </div>
      </button>

      {/* 浮動螢幕錄影按鈕 */}
      <button
        onClick={openScreenRecorderModal}
        className="fixed bottom-[140px] sm:bottom-[168px] left-4 sm:left-6 z-40 p-3 sm:p-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('recorder.button')}
      >
        <div className="flex items-center gap-2">
          {/* 攝影機圖示 */}
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('recorder.buttonShort')}</span>
        </div>
      </button>

      {/* 浮動 EXP 追蹤器按鈕 */}
      <button
        onClick={openExpTrackerModal}
        className="fixed bottom-[208px] sm:bottom-[240px] left-4 sm:left-6 z-40 p-3 sm:p-4 bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('expTracker.button')}
      >
        <div className="flex items-center gap-2">
          {/* 圖表圖示 */}
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('expTracker.buttonShort')}</span>
        </div>
      </button>

      {/* 隱私設定浮動按鈕 */}
      <button
        onClick={() => setIsPrivacyModalOpen(true)}
        className="fixed bottom-[88px] sm:bottom-[104px] right-4 sm:right-6 z-40 p-3 sm:p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('auth.privacySettings')}
        title={t('auth.privacySettings')}
      >
        {/* 鎖頭圖示 */}
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>

        {/* Tooltip（滑鼠懸停顯示文字）*/}
        <span className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          {t('auth.privacySettings')}
        </span>
      </button>

      {/* 浮動 Bug 回報按鈕 */}
      <button
        onClick={openBugReportModal}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 p-3 sm:p-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('bug.report')}
      >
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('bug.report')}</span>
        </div>
      </button>

      {/* 返回頂部按鈕 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 p-3 sm:p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
          aria-label={t('scroll.backToTop')}
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}

      {/* 開發者 API 測試工具（只在開發環境顯示）*/}
      <DevApiTester />

      {/* Toast 通知 */}
      <Toast
        message={toastMessage}
        isVisible={toastIsVisible}
        onClose={hideToast}
        type={toastType}
      />
    </>
  )
})
