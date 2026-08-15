import { SkeletonHeader, SkeletonRows } from '@/components/layout/Skeletons'

export default function Loading() {
  return (
    <div className="page-narrow space-y-6" aria-busy="true" aria-label="Loading journal">
      <SkeletonHeader />
      <SkeletonRows count={6} />
    </div>
  )
}
