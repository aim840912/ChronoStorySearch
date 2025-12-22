'use client'

import { memo, useState } from 'react'
import type { ScanDebugInfo } from '@/types/exp-tracker'

interface DebugScanPanelProps {
  scans: ScanDebugInfo[]
  onClear: () => void
  t: (key: string) => string
}

/**
 * Debug 掃描面板
 * 顯示自動偵測過程中的掃描截圖和 OCR 結果
 */
export const DebugScanPanel = memo(function DebugScanPanel({
  scans,
  onClear,
  t,
}: DebugScanPanelProps) {
  const [selectedScan, setSelectedScan] = useState<ScanDebugInfo | null>(null)

  if (scans.length === 0) {
    return (
      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
        {t('expTracker.debugEmpty') || '尚無掃描記錄，請啟動自動偵測'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('expTracker.debugScans') || '掃描記錄'} ({scans.length})
        </span>
        <button
          onClick={onClear}
          className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          {t('expTracker.debugClear') || '清除'}
        </button>
      </div>

      {/* 掃描縮圖網格 */}
      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
        {scans.map((scan, i) => (
          <button
            key={i}
            onClick={() => setSelectedScan(scan)}
            className={`relative border rounded overflow-hidden transition-all ${
              scan.matched
                ? 'border-green-500 ring-2 ring-green-500/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            } ${selectedScan === scan ? 'ring-2 ring-blue-500' : ''}`}
          >
            <img
              src={scan.capturedImage}
              alt={`Scan ${i + 1}`}
              className="w-full h-8 object-cover"
            />
            {scan.matched && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-bl flex items-center justify-center">
                <span className="text-white text-[8px]">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 選中的掃描詳情 */}
      {selectedScan && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
          <div className="flex items-start gap-3">
            {/* 放大圖片 */}
            <img
              src={selectedScan.capturedImage}
              alt="Selected scan"
              className="w-32 h-auto border border-gray-300 dark:border-gray-600 rounded"
            />
            {/* 詳細資訊 */}
            <div className="flex-1 text-xs space-y-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400">OCR:</span>{' '}
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {selectedScan.ocrText || '(空)'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('confidence') || '信心度'}:</span>{' '}
                <span className={`font-medium ${
                  selectedScan.confidence >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {selectedScan.confidence.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('expTracker.debugRegion') || '區域'}:</span>{' '}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  ({selectedScan.region.x}, {selectedScan.region.y}) {selectedScan.region.width}×{selectedScan.region.height}
                </span>
              </div>
              {selectedScan.preprocessMode && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t('expTracker.debugPreprocess') || '預處理'}:</span>{' '}
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {selectedScan.preprocessMode}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('expTracker.debugMatch') || '匹配'}:</span>{' '}
                <span className={`font-medium ${
                  selectedScan.matched ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                }`}>
                  {selectedScan.matched ? '✓ 是' : '✗ 否'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedScan(null)}
            className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {t('expTracker.debugClose') || '關閉詳情'}
          </button>
        </div>
      )}
    </div>
  )
})
