'use client'

import { memo } from 'react'
import type { DropsEssential, ItemAttributesEssential, GachaMachine } from '@/types'
import { MonsterModal } from '@/components/MonsterModal'
import { ItemModal } from '@/components/ItemModal'
import { BugReportModal } from '@/components/BugReportModal'
import { ClearConfirmModal } from '@/components/ClearConfirmModal'
import { AccuracyCalculatorFloating } from '@/components/AccuracyCalculatorFloating'
import { GameCommandsModal } from '@/components/GameCommandsModal'
import { MerchantShopModal } from '@/components/MerchantShopModal'
import { PrivacySettingsModal } from '@/components/settings/PrivacySettingsModal'
import { GlobalSettingsModal } from '@/components/settings/GlobalSettingsModal'
import { AboutModal } from '@/components/AboutModal'
import { DevApiTester } from '@/components/dev/DevApiTester'
import { ScreenRecorderModal } from '@/components/tools/screen-recorder'
import { ManualExpRecorderModal } from '@/components/tools/manual-exp-recorder'
import { ExpTrackerFloating } from '@/components/tools/exp-tracker'
import { Toast } from '@/components/Toast'
import { useLanguage } from '@/contexts/LanguageContext'

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
  handleScrollExchangeClick: () => void
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
  isManualExpRecorderModalOpen: boolean
  openManualExpRecorderModal: () => void
  closeManualExpRecorderModal: () => void

  // EXP Tracker Modal
  isExpTrackerModalOpen: boolean
  openExpTrackerModal: () => void
  closeExpTrackerModal: () => void

  // Privacy Settings Modal（外部控制）
  isPrivacyModalOpen: boolean
  openPrivacyModal: () => void
  closePrivacyModal: () => void

  // About Modal（外部控制）
  isAboutModalOpen: boolean
  openAboutModal: () => void
  closeAboutModal: () => void

  // Global Settings Modal（外部控制）
  isGlobalSettingsOpen: boolean
  openGlobalSettings: () => void
  closeGlobalSettings: () => void

  // API Tester Modal（外部控制，僅開發環境）
  isApiTesterOpen: boolean
  openApiTester: () => void
  closeApiTester: () => void

  // 浮動按鈕（僅保留回到頂部）
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
  openBugReportModal: _openBugReportModal,
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
  handleScrollExchangeClick,
  handleClearConfirm,
  isAccuracyCalcOpen: _isAccuracyCalcOpen,
  setIsAccuracyCalcOpen: _setIsAccuracyCalcOpen,
  isGameCommandsOpen,
  setIsGameCommandsOpen,
  isScreenRecorderModalOpen,
  openScreenRecorderModal: _openScreenRecorderModal,
  closeScreenRecorderModal,
  isManualExpRecorderModalOpen,
  openManualExpRecorderModal: _openManualExpRecorderModal,
  closeManualExpRecorderModal,
  isExpTrackerModalOpen,
  openExpTrackerModal: _openExpTrackerModal,
  closeExpTrackerModal,
  isPrivacyModalOpen,
  openPrivacyModal,
  closePrivacyModal,
  isAboutModalOpen,
  openAboutModal: _openAboutModal,
  closeAboutModal,
  isGlobalSettingsOpen,
  openGlobalSettings: _openGlobalSettings,
  closeGlobalSettings,
  isApiTesterOpen,
  openApiTester: _openApiTester,
  closeApiTester,
  showBackToTop,
  scrollToTop,
  toastMessage,
  toastIsVisible,
  toastType,
  hideToast,
}: ModalManagerProps) {
  const { t } = useLanguage()

  return (
    <>
      {/* 持久化背景遮罩：Modal 互相切換時（goBack），兩個 Portal 的 DOM 移除/插入之間
          瀏覽器可能插入一幀 paint 導致閃爍。這層非 Portal 的遮罩填補那一幀的空隙。 */}
      {(isMonsterModalOpen || isItemModalOpen) && (
        <div className="fixed inset-0 z-[49] bg-black/90 pointer-events-none" />
      )}

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
        onMonsterClick={handleMonsterClickFromItemModal}
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
        onItemClick={handleItemClickFromMonsterModal}
        onScrollExchangeClick={handleScrollExchangeClick}
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
        onClose={closePrivacyModal}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={closeAboutModal}
      />

      {/* Global Settings Modal */}
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={closeGlobalSettings}
        onOpenPrivacySettings={openPrivacyModal}
      />

      {/* Confirm Clear Modal */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={closeClearModal}
        onConfirm={handleClearConfirm}
        type={clearModalType}
        count={clearModalType === 'monsters' ? favoriteMonsterCount : favoriteItemCount}
      />

      {/* Accuracy Calculator 懸浮視窗（條件渲染，保持與 ExpTracker 一致） */}
      {isAccuracyCalculatorOpen && (
        <AccuracyCalculatorFloating
          isOpen={isAccuracyCalculatorOpen}
          onClose={closeAccuracyCalculator}
          initialMonsterId={accuracyInitialMonsterId ?? null}
        />
      )}

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

      {/* Screen Recorder Modal（條件渲染，關閉時卸載以釋放 MediaRecorder 資源） */}
      {isScreenRecorderModalOpen && (
        <ScreenRecorderModal
          isOpen={isScreenRecorderModalOpen}
          onClose={closeScreenRecorderModal}
        />
      )}

      {isManualExpRecorderModalOpen && (
        <ManualExpRecorderModal
          isOpen={isManualExpRecorderModalOpen}
          onClose={closeManualExpRecorderModal}
        />
      )}

      {/* EXP Tracker 懸浮視窗（條件渲染，關閉時卸載以釋放 Tesseract Workers） */}
      {isExpTrackerModalOpen && (
        <ExpTrackerFloating
          isOpen={isExpTrackerModalOpen}
          onClose={closeExpTrackerModal}
        />
      )}

      {/* 返回頂部按鈕（唯一保留的浮動按鈕） */}
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
      <DevApiTester isOpen={isApiTesterOpen} onClose={closeApiTester} />

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
