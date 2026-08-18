import { SkeletonHeader, SkeletonCards } from '@/components/layout/Skeletons'

export default function Loading() {
  return (
    <div className="page space-y-6" aria-busy="true" aria-label="Loading garden map">
      <SkeletonHeader />
      <SkeletonCards count={6} />
    </div>
  )
}
