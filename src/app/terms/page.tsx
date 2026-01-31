import type { Metadata } from 'next'
import { TermsContent } from './TermsContent'

export const metadata: Metadata = {
  title: 'Terms of Service | ChronoStory Search',
  description: 'ChronoStory Search terms of service - rules and guidelines for using our website.',
}

export default function TermsPage() {
  return <TermsContent />
}
