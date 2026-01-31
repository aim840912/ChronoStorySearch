import type { Metadata } from 'next'
import { PrivacyContent } from './PrivacyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy | ChronoStory Search',
  description: 'ChronoStory Search privacy policy - learn about how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
