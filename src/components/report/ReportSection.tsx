'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { reportService } from '@/lib/supabase/report-service'
import { ReportForm } from './ReportForm'
import { ReportList } from './ReportList'

type TabType = 'create' | 'my-reports' | 'all-reports'

/**
 * 檢舉系統主容器
 */
export function ReportSection() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('create')
  const [isReviewer, setIsReviewer] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // 檢查是否為 reviewer
  useEffect(() => {
    async function checkReviewer() {
      if (!user) {
        setIsReviewer(false)
        return
      }

      const reviewer = await reportService.isReviewer()
      setIsReviewer(reviewer)

      if (reviewer) {
        const count = await reportService.getPendingCount()
        setPendingCount(count)
      }
    }

    checkReviewer()
  }, [user])

  // 提交成功後切換到我的檢舉
  const handleSubmitSuccess = () => {
    setActiveTab('my-reports')
  }

  // Tab 配置
  const tabs: { id: TabType; label: string; show: boolean; badge?: number }[] = [
    {
      id: 'create',
      label: t('report.tab.create'),
      show: !!user,
    },
    {
      id: 'my-reports',
      label: t('report.tab.myReports'),
      show: !!user,
    },
    {
      id: 'all-reports',
      label: t('report.tab.allReports'),
      show: isReviewer,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ]

  const visibleTabs = tabs.filter(tab => tab.show)

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">
          {t('report.loginRequired')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab 切換 */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors relative
              ${activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 內容 */}
      <div className="min-h-[300px]">
        {activeTab === 'create' && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {t('report.title.create')}
            </h2>
            <ReportForm onSuccess={handleSubmitSuccess} />
          </div>
        )}

        {activeTab === 'my-reports' && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {t('report.title.myReports')}
            </h2>
            <ReportList isReviewer={false} showMyReports />
          </div>
        )}

        {activeTab === 'all-reports' && isReviewer && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {t('report.title.allReports')}
            </h2>
            <ReportList isReviewer />
          </div>
        )}
      </div>
    </div>
  )
}
