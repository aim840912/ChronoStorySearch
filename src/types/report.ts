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
