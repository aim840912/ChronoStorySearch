import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { reportService } from '@/lib/supabase/report-service'

/**
 * 檢查當前用戶是否為檢舉審核員
 * 基於 Supabase app_metadata.role = 'reviewer'
 */
export function useReportReviewer() {
  const { user } = useAuth()
  const [isReviewer, setIsReviewer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkReviewer() {
      if (!user) {
        setIsReviewer(false)
        setIsLoading(false)
        return
      }

      try {
        const result = await reportService.isReviewer()
        setIsReviewer(result)
      } catch (err) {
        console.error('檢查 reviewer 權限失敗:', err)
        setIsReviewer(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkReviewer()
  }, [user])

  return { isReviewer, isLoading }
}
