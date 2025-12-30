'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { blacklistService, type BlacklistEntry } from '@/lib/supabase/blacklist-service'

/**
 * 黑名單管理 Hook
 * 提供黑名單的讀取、新增、移除功能，並支援樂觀更新
 */
export function useBlacklist() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 載入黑名單
  const loadBlacklist = useCallback(async () => {
    if (!user) {
      setEntries([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await blacklistService.getBlacklist()
      setEntries(data)
    } catch (err) {
      console.error('載入黑名單失敗:', err)
      setError('載入黑名單失敗')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // 初始載入
  useEffect(() => {
    loadBlacklist()
  }, [loadBlacklist])

  // 黑名單用戶名 Set（用於快速查詢）
  const blockedUsernames = useMemo(() => {
    return new Set(entries.map(e => e.blockedDiscordUsername.toLowerCase()))
  }, [entries])

  // 檢查是否在黑名單中
  const isBlocked = useCallback((discordUsername: string) => {
    return blockedUsernames.has(discordUsername.toLowerCase())
  }, [blockedUsernames])

  // 加入黑名單（樂觀更新）
  const addToBlacklist = useCallback(async (discordUsername: string): Promise<boolean> => {
    if (!user) return false

    // 檢查是否已在黑名單中
    if (isBlocked(discordUsername)) return true

    // 樂觀更新
    const tempEntry: BlacklistEntry = {
      id: `temp-${Date.now()}`,
      userId: user.id,
      blockedDiscordUsername: discordUsername,
      createdAt: new Date().toISOString(),
    }
    setEntries(prev => [tempEntry, ...prev])

    // 實際請求
    const success = await blacklistService.addToBlacklist(discordUsername)

    if (!success) {
      // 回滾
      setEntries(prev => prev.filter(e => e.id !== tempEntry.id))
      return false
    }

    // 重新載入以取得正確的 ID
    await loadBlacklist()
    return true
  }, [user, isBlocked, loadBlacklist])

  // 從黑名單移除（樂觀更新）
  const removeFromBlacklist = useCallback(async (discordUsername: string): Promise<boolean> => {
    if (!user) return false

    // 樂觀更新
    const removedEntry = entries.find(
      e => e.blockedDiscordUsername.toLowerCase() === discordUsername.toLowerCase()
    )
    if (!removedEntry) return true

    setEntries(prev => prev.filter(e => e.id !== removedEntry.id))

    // 實際請求
    const success = await blacklistService.removeFromBlacklist(discordUsername)

    if (!success) {
      // 回滾
      setEntries(prev => [removedEntry, ...prev])
      return false
    }

    return true
  }, [user, entries])

  return {
    entries,
    isLoading,
    error,
    blockedUsernames,
    isBlocked,
    addToBlacklist,
    removeFromBlacklist,
    refresh: loadBlacklist,
  }
}
