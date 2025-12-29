'use client'

import { useCallback, useRef } from 'react'
import type { Region } from '@/types/exp-tracker'
import { SCALE } from '@/lib/ocr/ocr-constants'

/**
 * Canvas 擷取和預處理 Hook
 * 處理從視頻擷取區域並進行圖像預處理
 */

export interface UseCanvasCaptureReturn {
  /** 從視頻擷取區域（不做預處理，保留原始顏色） */
  captureRegionRaw: (video: HTMLVideoElement, region: Region) => HTMLCanvasElement | null
  /** 從視頻擷取區域並進行二值化預處理 */
  captureRegion: (video: HTMLVideoElement, region: Region, threshold?: number, invert?: boolean) => HTMLCanvasElement | null
  /** 清理 Canvas 資源 */
  cleanupCanvas: () => void
}

export function useCanvasCapture(): UseCanvasCaptureReturn {
  // Canvas 複用，避免頻繁建立/銷毀
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 取得或建立 Canvas（複用以減少 GC 壓力）
  const getCanvas = useCallback((width: number, height: number): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    canvasRef.current.width = width
    canvasRef.current.height = height
    return canvasRef.current
  }, [])

  // 從視頻擷取區域（不做預處理，保留原始顏色）
  // 注意：region 座標必須是 video 座標（videoWidth/videoHeight 空間）
  const captureRegionRaw = useCallback(
    (video: HTMLVideoElement, region: Region): HTMLCanvasElement | null => {
      const canvas = getCanvas(region.width * SCALE, region.height * SCALE)

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 直接使用 video 座標繪製（不需要縮放轉換）
      ctx.drawImage(
        video,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        canvas.width,
        canvas.height
      )

      return canvas
    },
    [getCanvas]
  )

  // 從視頻擷取區域並進行二值化預處理
  const captureRegion = useCallback(
    (video: HTMLVideoElement, region: Region, threshold = 128, invert = false): HTMLCanvasElement | null => {
      const canvas = captureRegionRaw(video, region)
      if (!canvas) return null

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null

      // 圖像預處理：灰階 + 二值化
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        let value = gray > threshold ? 255 : 0
        if (invert) value = 255 - value
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
      }

      ctx.putImageData(imageData, 0, 0)
      return canvas
    },
    [captureRegionRaw]
  )

  // 清理 Canvas 資源
  const cleanupCanvas = useCallback(() => {
    canvasRef.current = null
  }, [])

  return {
    captureRegionRaw,
    captureRegion,
    cleanupCanvas,
  }
}
