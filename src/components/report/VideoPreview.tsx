import { getVideoType, extractYouTubeId } from '@/types/report'

interface VideoPreviewProps {
  url: string
  className?: string
}

/**
 * 影片預覽組件
 * 支援 YouTube embed 和 Discord CDN video
 */
export function VideoPreview({ url, className = '' }: VideoPreviewProps) {
  const videoType = getVideoType(url)

  if (videoType === 'youtube') {
    const videoId = extractYouTubeId(url)
    if (!videoId) {
      return <InvalidVideoMessage url={url} />
    }

    return (
      <div className={`relative aspect-video ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full rounded-lg"
        />
      </div>
    )
  }

  if (videoType === 'discord') {
    return (
      <div className={`relative aspect-video ${className}`}>
        <video
          src={url}
          controls
          className="absolute inset-0 w-full h-full rounded-lg bg-black"
          preload="metadata"
        >
          您的瀏覽器不支援影片播放
        </video>
      </div>
    )
  }

  // 未知類型：顯示連結
  return <InvalidVideoMessage url={url} />
}

function InvalidVideoMessage({ url }: { url: string }) {
  return (
    <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
        無法預覽此影片格式
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-500 hover:underline break-all"
      >
        {url}
      </a>
    </div>
  )
}
