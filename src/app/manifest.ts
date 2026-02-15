import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ChronoStory Search',
    short_name: 'ChronoStory',
    description: '查找裝備、怪物詳細資訊',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: 'https://cdn.chronostorysearch.com/images/chrono.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://cdn.chronostorysearch.com/images/chrono.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
