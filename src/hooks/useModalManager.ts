import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ClearModalType } from '@/types'

export function useModalManager() {
  const router = useRouter()

  // Monster Modal
  const [isMonsterModalOpen, setIsMonsterModalOpen] = useState(false)
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(null)
  const [selectedMonsterName, setSelectedMonsterName] = useState('')

  // Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedItemName, setSelectedItemName] = useState('')

  // Bug Report Modal
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false)

  // Clear Confirm Modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [clearModalType, setClearModalType] = useState<ClearModalType>('monsters')

  // Gacha Machine Modal
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false)

  // Monster Modal handlers
  const openMonsterModal = useCallback((mobId: number, mobName: string) => {
    setSelectedMonsterId(mobId)
    setSelectedMonsterName(mobName)
    setIsMonsterModalOpen(true)
  }, [])

  const closeMonsterModal = useCallback(() => {
    setIsMonsterModalOpen(false)
    setSelectedMonsterId(null)
    setSelectedMonsterName('')
    router.replace('/', { scroll: false })
  }, [router])

  // Item Modal handlers
  const openItemModal = useCallback((itemId: number, itemName: string) => {
    setSelectedItemId(itemId)
    setSelectedItemName(itemName)
    setIsItemModalOpen(true)
  }, [])

  const closeItemModal = useCallback(() => {
    setIsItemModalOpen(false)
    setSelectedItemId(null)
    setSelectedItemName('')
    router.replace('/', { scroll: false })
  }, [router])

  // Bug Report Modal handlers
  const openBugReportModal = useCallback(() => {
    setIsBugReportModalOpen(true)
  }, [])

  const closeBugReportModal = useCallback(() => {
    setIsBugReportModalOpen(false)
  }, [])

  // Clear Confirm Modal handlers
  const openClearModal = useCallback((type: ClearModalType) => {
    setClearModalType(type)
    setIsClearModalOpen(true)
  }, [])

  const closeClearModal = useCallback(() => {
    setIsClearModalOpen(false)
  }, [])

  // Gacha Machine Modal handlers
  const openGachaModal = useCallback(() => {
    setIsGachaModalOpen(true)
  }, [])

  const closeGachaModal = useCallback(() => {
    setIsGachaModalOpen(false)
  }, [])

  return {
    // Monster Modal
    isMonsterModalOpen,
    selectedMonsterId,
    selectedMonsterName,
    openMonsterModal,
    closeMonsterModal,
    setSelectedMonsterId,
    setSelectedMonsterName,
    setIsMonsterModalOpen,

    // Item Modal
    isItemModalOpen,
    selectedItemId,
    selectedItemName,
    openItemModal,
    closeItemModal,
    setSelectedItemId,
    setSelectedItemName,
    setIsItemModalOpen,

    // Bug Report Modal
    isBugReportModalOpen,
    openBugReportModal,
    closeBugReportModal,

    // Clear Confirm Modal
    isClearModalOpen,
    clearModalType,
    openClearModal,
    closeClearModal,

    // Gacha Machine Modal
    isGachaModalOpen,
    openGachaModal,
    closeGachaModal,
  }
}
