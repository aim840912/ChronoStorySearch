'use client'

import { memo } from 'react'
import type { DropItem, ItemAttributes, GachaMachine } from '@/types'
import { MonsterModal } from '@/components/MonsterModal'
import { ItemModal } from '@/components/ItemModal'
import { BugReportModal } from '@/components/BugReportModal'
import { ClearConfirmModal } from '@/components/ClearConfirmModal'
import { GachaMachineModal } from '@/components/GachaMachineModal'
import { AccuracyCalculatorModal } from '@/components/AccuracyCalculatorModal'
import { GameCommandsModal } from '@/components/GameCommandsModal'
import { Toast } from '@/components/Toast'
import { useLanguage } from '@/contexts/LanguageContext'

interface ModalManagerProps {
  // Modal 狀態 from useModalManager
  isMonsterModalOpen: boolean
  isItemModalOpen: boolean
  isBugReportModalOpen: boolean
  isClearModalOpen: boolean
  isGachaModalOpen: boolean
  selectedMonsterId: number | null | undefined
  selectedMonsterName: string
  selectedItemId: number | null
  selectedItemName: string
  selectedGachaMachineId: number | null
  clearModalType: 'monsters' | 'items'
  hasPreviousModal: boolean

  // Modal 關閉函數
  closeMonsterModal: () => void
  closeItemModal: () => void
  closeBugReportModal: () => void
  closeClearModal: () => void
  closeGachaModal: () => void
  goBack: () => void

  // Modal 開啟函數
  openGachaModal: (machineId?: number) => void
  openBugReportModal: () => void

  // 資料
  allDrops: DropItem[]
  gachaMachines: GachaMachine[]
  itemAttributesMap: Map<number, ItemAttributes>

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
  handleItemClickFromGachaModal: (itemId: number, itemName: string) => void
  handleClearConfirm: () => void

  // 工具 Modal 狀態
  isAccuracyCalcOpen: boolean
  setIsAccuracyCalcOpen: (open: boolean) => void
  isGameCommandsOpen: boolean
  setIsGameCommandsOpen: (open: boolean) => void

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
  isGachaModalOpen,
  selectedMonsterId,
  selectedMonsterName,
  selectedItemId,
  selectedItemName,
  selectedGachaMachineId,
  clearModalType,
  hasPreviousModal,
  closeMonsterModal,
  closeItemModal,
  closeBugReportModal,
  closeClearModal,
  closeGachaModal,
  goBack,
  openGachaModal,
  openBugReportModal,
  allDrops,
  gachaMachines,
  itemAttributesMap,
  isFavorite,
  toggleFavorite,
  isItemFavorite,
  toggleItemFavorite,
  favoriteMonsterCount,
  favoriteItemCount,
  handleItemClickFromMonsterModal,
  handleMonsterClickFromItemModal,
  handleGachaMachineClick,
  handleItemClickFromGachaModal,
  handleClearConfirm,
  isAccuracyCalcOpen,
  setIsAccuracyCalcOpen,
  isGameCommandsOpen,
  setIsGameCommandsOpen,
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

      {/* Confirm Clear Modal */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={closeClearModal}
        onConfirm={handleClearConfirm}
        type={clearModalType}
        count={clearModalType === 'monsters' ? favoriteMonsterCount : favoriteItemCount}
      />

      {/* Gacha Machine Modal */}
      <GachaMachineModal
        isOpen={isGachaModalOpen}
        onClose={closeGachaModal}
        initialMachineId={selectedGachaMachineId ?? undefined}
        onItemClick={handleItemClickFromGachaModal}
        hasPreviousModal={hasPreviousModal}
        onGoBack={goBack}
      />

      {/* Accuracy Calculator Modal */}
      <AccuracyCalculatorModal
        isOpen={isAccuracyCalcOpen}
        onClose={() => setIsAccuracyCalcOpen(false)}
      />

      {/* Game Commands Modal */}
      <GameCommandsModal
        isOpen={isGameCommandsOpen}
        onClose={() => setIsGameCommandsOpen(false)}
      />

      {/* 浮動轉蛋機按鈕 */}
      <button
        onClick={() => openGachaModal()}
        className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-40 p-3 sm:p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('gacha.button')}
      >
        <div className="flex items-center gap-2">
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
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block lg:inline-block">{t('gacha.button')}</span>
        </div>
      </button>

      {/* 浮動遊戲指令按鈕 */}
      <button
        onClick={() => setIsGameCommandsOpen(true)}
        className="fixed bottom-36 sm:bottom-38 left-4 sm:left-6 z-40 p-3 sm:p-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
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
          <span className="text-sm font-medium hidden group-hover:inline-block lg:inline-block">{t('commands.button')}</span>
        </div>
      </button>

      {/* 浮動命中率計算器按鈕 */}
      <button
        onClick={() => setIsAccuracyCalcOpen(true)}
        className="fixed bottom-20 sm:bottom-22 left-4 sm:left-6 z-40 p-3 sm:p-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('accuracy.button')}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <circle cx="12" cy="12" r="6" strokeWidth="2"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block lg:inline-block">{t('accuracy.buttonShort')}</span>
        </div>
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
