'use client'

/**
 * 轉蛋機圖鑑 Modal
 *
 * 顯示 7 台轉蛋機及其內容物
 * 支援瀏覽模式和抽獎模式
 */

import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useLanguageToggle } from '@/hooks/useLanguageToggle'
import { useShare } from '@/hooks/useShare'
import { useGachaMachine } from '@/hooks/useGachaMachine'
import { BaseModal } from '@/components/common/BaseModal'
import { MachineCard } from '@/components/gacha/MachineCard'
import { GachaMachineModalHeader } from '@/components/gacha/GachaMachineModalHeader'
import { GachaBrowseContent } from '@/components/gacha/GachaBrowseContent'
import { GachaDrawControl } from '@/components/gacha/GachaDrawControl'
import { GachaResultsGrid } from '@/components/gacha/GachaResultsGrid'
import { EquipmentDetailsModal } from '@/components/gacha/EquipmentDetailsModal'
import { Toast } from '@/components/Toast'

interface GachaMachineModalProps {
  isOpen: boolean
  onClose: () => void
  initialMachineId?: number
  onItemClick?: (itemId: number, itemName: string) => void
  hasPreviousModal?: boolean
  onGoBack?: () => void
}

export function GachaMachineModal({
  isOpen,
  onClose,
  initialMachineId,
  onItemClick,
  hasPreviousModal,
  onGoBack,
}: GachaMachineModalProps) {
  const { language, t } = useLanguage()
  const toast = useToast()
  const toggleLanguage = useLanguageToggle()

  // 使用轉蛋機邏輯 Hook
  const gacha = useGachaMachine({
    isOpen,
    initialMachineId,
  })

  // 分享功能
  const handleShare = useShare(() => {
    const machineId = gacha.selectedMachine?.machineId || initialMachineId
    const urlParam = machineId !== undefined ? `gacha=${machineId}` : 'gacha=list'
    return `${window.location.origin}${window.location.pathname}?${urlParam}`
  })

  // ESC 鍵處理
  const handleEscape = () => {
    if (initialMachineId !== undefined) {
      onClose()
    } else if (gacha.selectedMachine) {
      gacha.setSelectedMachine(null)
    } else {
      onClose()
    }
  }

  // 背景點擊處理
  const handleBackdropClick = () => {
    if (initialMachineId !== undefined) {
      onClose()
    } else if (gacha.selectedMachine) {
      gacha.setSelectedMachine(null)
    } else {
      onClose()
    }
  }

  // 返回轉蛋機列表
  const handleBack = () => {
    gacha.setSelectedMachine(null)
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-[70]"
      onEscape={handleEscape}
      onBackdropClick={handleBackdropClick}
    >
      {/* Modal Header */}
      <GachaMachineModalHeader
        selectedMachine={gacha.selectedMachine}
        machines={gacha.machines}
        language={language}
        t={t}
        viewMode={gacha.viewMode}
        onToggleViewMode={gacha.toggleViewMode}
        onToggleLanguage={toggleLanguage}
        onShare={handleShare}
        onClose={onClose}
        onBack={handleBack}
        hasPreviousModal={hasPreviousModal}
        onGoBack={onGoBack}
        initialMachineId={initialMachineId}
      />

      {/* Modal Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6">
        {gacha.isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : gacha.selectedMachine ? (
          <>
            {gacha.viewMode === 'browse' ? (
              <GachaBrowseContent
                selectedMachine={gacha.selectedMachine}
                filteredAndSortedItems={gacha.filteredAndSortedItems}
                searchTerm={gacha.searchTerm}
                onSearchChange={gacha.setSearchTerm}
                sortOption={gacha.sortOption}
                onSortChange={gacha.setSortOption}
                language={language}
                t={t}
                onItemClick={onItemClick}
              />
            ) : (
              /* 抽獎模式 */
              <div className="space-y-6">
                <GachaDrawControl
                  drawCount={gacha.drawCount}
                  maxDraws={gacha.maxDraws}
                  onDrawOnce={gacha.handleDrawOnce}
                  onReset={gacha.handleReset}
                  t={t}
                />
                <GachaResultsGrid
                  results={gacha.gachaResults}
                  t={t}
                  onShowDetails={gacha.handleShowDetails}
                />
              </div>
            )}
          </>
        ) : (
          /* 轉蛋機列表 */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {gacha.machines.map((machine) => (
              <MachineCard
                key={machine.machineId}
                machine={machine}
                onClick={() => gacha.setSelectedMachine(machine)}
                language={language}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast 通知 */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hideToast}
        type={toast.type}
      />

      {/* 裝備詳情 Modal */}
      {gacha.selectedEquipment && (
        <EquipmentDetailsModal
          isOpen={gacha.isDetailsModalOpen}
          onClose={gacha.closeDetailsModal}
          equipment={gacha.selectedEquipment}
        />
      )}
    </BaseModal>
  )
}
