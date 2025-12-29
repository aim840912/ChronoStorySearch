'use client'

import { useCallback, useRef, useEffect } from 'react'

/**
 * OCR Worker 管理 Hook
 * 處理 Tesseract.js Worker 的初始化、複用和清理
 */

export interface UseOcrWorkersReturn {
  initLabelWorker: () => Promise<import('tesseract.js').Worker>
  initNumberWorker: () => Promise<import('tesseract.js').Worker>
  cleanup: () => void
}

export function useOcrWorkers(): UseOcrWorkersReturn {
  const labelWorkerRef = useRef<import('tesseract.js').Worker | null>(null)
  const numberWorkerRef = useRef<import('tesseract.js').Worker | null>(null)

  // 初始化 EXP 標籤 OCR Worker
  const initLabelWorker = useCallback(async () => {
    if (labelWorkerRef.current) return labelWorkerRef.current

    const { createWorker, PSM } = await import('tesseract.js')
    const worker = await createWorker('eng', 1, {
      logger: () => {},
    })

    // 移除白名單限制，讓 OCR 自由辨識所有字元（遊戲字體可能需要更靈活的辨識）
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    })

    labelWorkerRef.current = worker
    return worker
  }, [])

  // 初始化數字 OCR Worker（不限制白名單，讓 OCR 自由辨識）
  const initNumberWorker = useCallback(async () => {
    if (numberWorkerRef.current) return numberWorkerRef.current

    const { createWorker, PSM } = await import('tesseract.js')
    const worker = await createWorker('eng', 1, {
      logger: () => {},
    })

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      // 不設定白名單，讓 OCR 自由辨識所有字元
    })

    numberWorkerRef.current = worker
    return worker
  }, [])

  // 主動清理 Workers（供外部呼叫，避免資源洩漏）
  const cleanup = useCallback(() => {
    if (labelWorkerRef.current) {
      labelWorkerRef.current.terminate()
      labelWorkerRef.current = null
    }
    if (numberWorkerRef.current) {
      numberWorkerRef.current.terminate()
      numberWorkerRef.current = null
    }
  }, [])

  // 元件卸載時清理 Tesseract workers
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    initLabelWorker,
    initNumberWorker,
    cleanup,
  }
}
