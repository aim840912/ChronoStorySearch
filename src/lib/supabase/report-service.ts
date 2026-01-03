import { supabase } from './client'
import type {
  Report,
  ReportRow,
  CreateReportInput,
  ReviewReportInput,
  ReportFilters,
} from '@/types/report'

/**
 * 將資料庫 row 轉換為 Report
 */
function rowToReport(row: ReportRow): Report {
  return {
    id: row.id,
    videoUrl: row.video_url,
    reportedCharacter: row.reported_character,
    description: row.description,
    reportType: row.report_type as Report['reportType'],
    reporterId: row.reporter_id,
    reporterDiscord: row.reporter_discord,
    status: row.status as Report['status'],
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * ReportService
 * 處理檢舉相關的 CRUD 操作
 */
export const reportService = {
  // ============================================
  // 檢舉 CRUD
  // ============================================

  /**
   * 取得檢舉列表
   */
  async getReports(
    filters?: ReportFilters,
    limit = 20,
    offset = 0
  ): Promise<{ data: Report[]; count: number }> {
    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' })

    // 篩選條件
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.reporterId) {
      query = query.eq('reporter_id', filters.reporterId)
    }
    // 模糊搜尋：檢舉人 Discord 名稱
    if (filters?.reporterDiscord) {
      query = query.ilike('reporter_discord', `%${filters.reporterDiscord}%`)
    }
    // 模糊搜尋：被檢舉角色名稱
    if (filters?.reportedCharacter) {
      query = query.ilike('reported_character', `%${filters.reportedCharacter}%`)
    }

    // 排序與分頁
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('取得檢舉列表失敗:', error)
      return { data: [], count: 0 }
    }

    return {
      data: (data as ReportRow[]).map(rowToReport),
      count: count ?? 0,
    }
  },

  /**
   * 取得單一檢舉
   */
  async getReport(id: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('取得檢舉失敗:', error)
      return null
    }

    return rowToReport(data as ReportRow)
  },

  /**
   * 建立檢舉
   */
  async createReport(input: CreateReportInput): Promise<Report | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('建立檢舉失敗: 未登入')
      return null
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        video_url: input.videoUrl,
        reported_character: input.reportedCharacter,
        description: input.description ?? null,
        reporter_id: user.id,
        reporter_discord: input.reporterDiscord,
      })
      .select()
      .single()

    if (error) {
      console.error('建立檢舉失敗:', error)
      return null
    }

    return rowToReport(data as ReportRow)
  },

  /**
   * 審核檢舉（僅 reviewer 可用）
   */
  async reviewReport(id: string, input: ReviewReportInput): Promise<Report | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('審核檢舉失敗: 未登入')
      return null
    }

    const { data, error } = await supabase
      .from('reports')
      .update({
        status: input.status,
        review_note: input.reviewNote ?? null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('審核檢舉失敗:', error)
      return null
    }

    return rowToReport(data as ReportRow)
  },

  // ============================================
  // 用戶相關
  // ============================================

  /**
   * 取得當前用戶的檢舉
   */
  async getMyReports(limit = 20, offset = 0): Promise<{ data: Report[]; count: number }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], count: 0 }
    }

    return this.getReports({ reporterId: user.id }, limit, offset)
  },

  /**
   * 檢查當前用戶是否為 reviewer（admin 也有 reviewer 權限）
   */
  async isReviewer(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // 檢查 app_metadata 中的 role（admin 也視為 reviewer）
    const role = user.app_metadata?.role
    return role === 'reviewer' || role === 'admin'
  },

  /**
   * 取得待審核的檢舉數量
   */
  async getPendingCount(): Promise<number> {
    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      console.error('取得待審核數量失敗:', error)
      return 0
    }

    return count ?? 0
  },

  /**
   * 檢查重複檢舉
   * @param characterIdSuffix - 角色 ID 後綴（#後的5個英文字母）
   */
  async checkDuplicateReport(characterIdSuffix: string): Promise<{
    totalCount: number
    myActiveReportExists: boolean
    myRejectedReportExists: boolean
    existingStatuses: {
      pending: number
      confirmed: number
      rejected: number
    }
  }> {
    const { data: { user } } = await supabase.auth.getUser()

    // 查詢所有包含此 ID 後綴的檢舉
    const { data, error } = await supabase
      .from('reports')
      .select('reporter_id, status')
      .ilike('reported_character', `%#${characterIdSuffix}`)

    if (error) {
      console.error('檢查重複檢舉失敗:', error)
      return {
        totalCount: 0,
        myActiveReportExists: false,
        myRejectedReportExists: false,
        existingStatuses: { pending: 0, confirmed: 0, rejected: 0 },
      }
    }

    // 統計狀態分佈
    const statuses = { pending: 0, confirmed: 0, rejected: 0 }
    let myActiveReportExists = false
    let myRejectedReportExists = false

    for (const report of data || []) {
      // 統計狀態
      if (report.status === 'pending') statuses.pending++
      else if (report.status === 'confirmed') statuses.confirmed++
      else if (report.status === 'rejected') statuses.rejected++

      // 檢查是否為當前用戶的檢舉
      if (user && report.reporter_id === user.id) {
        if (report.status === 'pending' || report.status === 'confirmed') {
          myActiveReportExists = true
        } else if (report.status === 'rejected') {
          myRejectedReportExists = true
        }
      }
    }

    return {
      totalCount: data?.length ?? 0,
      myActiveReportExists,
      myRejectedReportExists,
      existingStatuses: statuses,
    }
  },
}
