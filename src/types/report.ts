/**
 * 檢舉系統類型定義
 */

// 檢舉狀態
export type ReportStatus = 'pending' | 'confirmed' | 'rejected'

// 檢舉類型
export type ReportType = 'botting'

// 影片類型
export type VideoType = 'youtube' | 'discord' | 'unknown'

// 檢舉資料（前端使用）
export interface Report {
  id: string
  videoUrl: string
  reportedCharacter: string
  description: string | null
  reportType: ReportType
  reporterId: string
  reporterDiscord: string
  status: ReportStatus
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

// 資料庫 Row 類型
export interface ReportRow {
  id: string
  video_url: string
  reported_character: string
  description: string | null
  report_type: string
  reporter_id: string
  reporter_discord: string
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

// 建立檢舉的輸入
export interface CreateReportInput {
  videoUrl: string
  reportedCharacter: string
  description?: string
  reporterDiscord: string
}

// 審核檢舉的輸入
export interface ReviewReportInput {
  status: 'confirmed' | 'rejected'
  reviewNote?: string
}

// 檢舉列表篩選條件
export interface ReportFilters {
  status?: ReportStatus
  reporterId?: string
  /** 搜尋檢舉人 Discord 名稱（模糊搜尋） */
  reporterDiscord?: string
  /** 搜尋被檢舉角色名稱（模糊搜尋） */
  reportedCharacter?: string
}

// 分組後的檢舉（依被檢舉角色）
export interface GroupedReport {
  /** 被檢舉角色名稱 */
  reportedCharacter: string
  /** 該角色的所有檢舉（依時間降序） */
  reports: Report[]
  /** 檢舉總數 */
  totalCount: number
  /** 各狀態的數量 */
  statusCounts: {
    pending: number
    confirmed: number
    rejected: number
  }
  /** 不重複的檢舉者列表 */
  reporters: string[]
  /** 最新檢舉時間 */
  latestReportAt: string
}

/**
 * 將檢舉列表依被檢舉角色分組
 * - 區分大小寫（PlayerName ≠ playername）
 * - 依最新檢舉時間排序
 */
export function groupReportsByCharacter(reports: Report[]): GroupedReport[] {
  const grouped = new Map<string, Report[]>()

  // 依角色名稱分組
  for (const report of reports) {
    const key = report.reportedCharacter
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(report)
  }

  // 轉換為 GroupedReport 陣列
  const result: GroupedReport[] = Array.from(grouped.entries()).map(([characterName, characterReports]) => {
    // 依時間降序排序
    const sortedReports = characterReports.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return {
      reportedCharacter: characterName,
      reports: sortedReports,
      totalCount: sortedReports.length,
      statusCounts: {
        pending: sortedReports.filter(r => r.status === 'pending').length,
        confirmed: sortedReports.filter(r => r.status === 'confirmed').length,
        rejected: sortedReports.filter(r => r.status === 'rejected').length,
      },
      reporters: [...new Set(sortedReports.map(r => r.reporterDiscord))],
      latestReportAt: sortedReports[0].createdAt,
    }
  })

  // 依最新檢舉時間排序（最新的在前）
  return result.sort(
    (a, b) => new Date(b.latestReportAt).getTime() - new Date(a.latestReportAt).getTime()
  )
}

/**
 * 判斷影片類型
 */
export function getVideoType(url: string): VideoType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube'
  }
  if (url.includes('cdn.discordapp.com') && url.includes('.mp4')) {
    return 'discord'
  }
  return 'unknown'
}

/**
 * 從 YouTube URL 提取影片 ID
 */
export function extractYouTubeId(url: string): string | null {
  // 支援格式：
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}
