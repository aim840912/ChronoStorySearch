import type { ServiceQuota } from '@/lib/quota/types'

interface QuotaServiceCardProps {
  /** 服務名稱 */
  name: string
  /** 額度資訊 */
  quota: ServiceQuota
  /** SVG 圖示元件 */
  icon: React.ReactNode
}

/**
 * 單一服務的額度卡片元件
 *
 * 顯示服務的使用量、進度條和重置日期
 */
export function QuotaServiceCard({
  name,
  quota,
  icon,
}: QuotaServiceCardProps) {
  const { used, limit, percentage, unit, resetDate, status } = quota

  // 顏色主題（根據狀態）
  const colorClasses = {
    ok: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  }

  const textColorClasses = {
    ok: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  }

  const bgColorClasses = {
    ok: 'bg-green-50',
    warning: 'bg-yellow-50',
    critical: 'bg-red-50',
  }

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${bgColorClasses[status]}`}
    >
      {/* 標題 */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6">{icon}</div>
        <h3 className="font-semibold text-gray-900">{name}</h3>
      </div>

      {/* 使用量數字 */}
      <div className="text-2xl font-bold text-gray-900">
        {used.toLocaleString()} / {limit.toLocaleString()}
      </div>

      {/* 進度條 */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[status]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* 詳細資訊 */}
      <div className="text-sm space-y-1">
        <div className={`font-semibold ${textColorClasses[status]}`}>
          {percentage.toFixed(1)}% 已使用
        </div>
        <div className="text-gray-600">{unit}</div>
        <div className="text-gray-500">
          重置: {new Date(resetDate).toLocaleDateString('zh-TW')}
        </div>
      </div>

      {/* 狀態指示器 */}
      {status === 'warning' && (
        <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
          ⚠️ 使用量已達 70%
        </div>
      )}
      {status === 'critical' && (
        <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
          🚨 使用量已達 90%
        </div>
      )}
    </div>
  )
}
