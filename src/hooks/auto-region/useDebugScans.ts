'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ScanDebugInfo } from '@/types/exp-tracker'

/**
 * Debug 掃描記錄管理 Hook
 * 管理自動偵測過程中的除錯資訊
 */

const MAX_DEBUG_SCANS = 50 // 最多保留 50 筆記錄

export interface UseDebugScansReturn {
  debugMode: boolean
  setDebugMode: (value: boolean) => void
  debugScans: ScanDebugInfo[]
  addDebugScan: (info: ScanDebugInfo) => void
  clearDebugScans: () => void
  /** Ref 版本，供閉包中使用避免 stale closure 問題 */
  debugModeRef: React.RefObject<boolean>
}

export function useDebugScans(): UseDebugScansReturn {
  const [debugMode, setDebugMode] = useState(false)
  const [debugScans, setDebugScans] = useState<ScanDebugInfo[]>([])
  const debugModeRef = useRef(debugMode)

  // 同步 debugMode 到 ref（避免閉包問題）
  useEffect(() => {
    debugModeRef.current = debugMode
  }, [debugMode])

  // 清除 Debug 記錄
  const clearDebugScans = useCallback(() => {
    setDebugScans([])
  }, [])

  // 新增 Debug 掃描記錄
  const addDebugScan = useCallback((info: ScanDebugInfo) => {
    if (debugModeRef.current) {
      setDebugScans(prev => [...prev.slice(-(MAX_DEBUG_SCANS - 1)), info])
    }
  }, [])

  return {
    debugMode,
    setDebugMode,
    debugScans,
    addDebugScan,
    clearDebugScans,
    debugModeRef,
  }
}
