'use client'

import { useState, useEffect, useMemo } from 'react'
import versionsData from '@/../data/maplestory-io-versions.json'

type ApiType = 'item' | 'mob'
type ResultType = { type: 'image' | 'json' | 'error' | 'loading'; data: string }

// 定義 versionsData 的類型
type VersionsDataType = {
  [key: string]: string[] | {
    source: string
    fetchedAt: string
    regions: Record<string, string>
    apiFormat: string
    apiFormatMonster: string
  }
}

const typedVersionsData = versionsData as VersionsDataType

// 從 versionsData 中取得 regions（排除 _meta）
const regions = Object.keys(typedVersionsData).filter(key => key !== '_meta')
const regionMeta = typedVersionsData._meta as {
  regions: Record<string, string>
}

interface DevApiTesterProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 開發者 API 測試工具
 * 只在開發環境顯示，用於測試 maplestory.io API
 */
export function DevApiTester({ isOpen, onClose }: DevApiTesterProps) {
  const [apiType, setApiType] = useState<ApiType>('item')
  const [region, setRegion] = useState('GMS')
  const [version, setVersion] = useState('83')
  const [id, setId] = useState('')
  const [includeIcon, setIncludeIcon] = useState(false)
  const [result, setResult] = useState<ResultType | null>(null)

  // 根據選擇的 region 取得可用版本（使用 useMemo 避免每次渲染都產生新陣列）
  const availableVersions = useMemo(() => {
    const regionVersions = typedVersionsData[region]
    return Array.isArray(regionVersions) ? regionVersions : []
  }, [region])

  // 當 region 改變時，重設 version 為該 region 的第一個版本
  useEffect(() => {
    if (availableVersions.length > 0 && !availableVersions.includes(version)) {
      setVersion(availableVersions[0])
    }
  }, [availableVersions, version])

  // 產生 API URL
  const apiUrl = id
    ? `https://maplestory.io/api/${region}/${version}/${apiType}/${id}${includeIcon ? '/icon' : ''}`
    : ''

  const handleTest = async () => {
    if (!id) return

    setResult({ type: 'loading', data: '' })

    try {
      const response = await fetch(apiUrl)
      const contentType = response.headers.get('content-type') || ''

      if (!response.ok) {
        // 嘗試讀取錯誤訊息
        try {
          const errorData = await response.json()
          setResult({
            type: 'error',
            data: `HTTP ${response.status}: ${JSON.stringify(errorData, null, 2)}`
          })
        } catch {
          setResult({
            type: 'error',
            data: `HTTP ${response.status}: ${response.statusText}`
          })
        }
        return
      }

      if (contentType.includes('image')) {
        // 圖片：直接使用 URL 顯示
        setResult({ type: 'image', data: apiUrl })
      } else if (contentType.includes('json')) {
        // JSON：格式化顯示
        const json = await response.json()
        // 如果是 item 且沒有 /icon，顯示關鍵欄位
        const displayData = (apiType === 'item' && !includeIcon)
          ? {
              id: json.id,
              description: json.description,
              metaInfo: json.metaInfo,
              typeInfo: json.typeInfo,
            }
          : json
        setResult({ type: 'json', data: JSON.stringify(displayData, null, 2) })
      } else {
        // 其他類型：嘗試作為文字顯示
        const text = await response.text()
        setResult({ type: 'json', data: text })
      }
    } catch (error) {
      setResult({
        type: 'error',
        data: `請求失敗: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // 按 Enter 鍵觸發測試
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTest()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-20 left-4 sm:left-6 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-500 text-white">
        <h3 className="font-semibold text-sm">MapleStory.io API 測試</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-orange-600 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 內容區域 - 左右分欄 */}
      <div className="flex">
        {/* 左側：控制面板 */}
        <div className="w-80 p-4 space-y-3">
          {/* API 類型切換 */}
          <div className="flex gap-2">
            <button
              onClick={() => setApiType('item')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                apiType === 'item'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              物品 Item
            </button>
            <button
              onClick={() => setApiType('mob')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                apiType === 'mob'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              怪物 Mob
            </button>
          </div>

          {/* /icon 開關 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeIcon}
              onChange={(e) => setIncludeIcon(e.target.checked)}
              className="w-4 h-4 text-orange-500 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              /icon <span className="text-xs text-gray-500 dark:text-gray-400">(勾選取得圖片)</span>
            </span>
          </label>

          {/* Region 選擇 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r} - {regionMeta?.regions?.[r] || r}
                </option>
              ))}
            </select>
          </div>

          {/* Version 選擇 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Version</label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {availableVersions.map((v: string) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* ID 輸入 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {apiType === 'item' ? 'Item ID' : 'Mob ID'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={apiType === 'item' ? '例: 1302000' : '例: 100100'}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                onClick={handleTest}
                disabled={!id}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                測試
              </button>
            </div>
          </div>

          {/* URL 顯示 - 點擊複製 */}
          {apiUrl && (
            <button
              onClick={() => navigator.clipboard.writeText(apiUrl)}
              className="w-full text-left text-xs text-gray-500 dark:text-gray-400 break-all bg-gray-50 dark:bg-gray-900 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="點擊複製 URL"
            >
              {apiUrl}
            </button>
          )}
        </div>

        {/* 右側：結果顯示區域 */}
        {result && (
          <div className="w-96 p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {result.type === 'loading' && (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            )}

            {result.type === 'image' && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <img
                  src={result.data}
                  alt="API Result"
                  className="max-w-full max-h-48 object-contain"
                  onError={() => setResult({ type: 'error', data: '圖片載入失敗' })}
                />
              </div>
            )}

            {result.type === 'json' && (
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-auto max-h-[60vh]">
                {result.data}
              </pre>
            )}

            {result.type === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs">
                {result.data}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
