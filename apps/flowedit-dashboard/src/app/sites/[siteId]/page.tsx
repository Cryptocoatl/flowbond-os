import { redirect } from 'next/navigation'

interface Props { params: Promise<{ siteId: string }> }

export default async function SitePage({ params }: Props) {
  const { siteId } = await params
  redirect(`/sites/${siteId}/changes`)
}
