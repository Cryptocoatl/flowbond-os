import { SkeletonHeader, SkeletonCards } from '@/components/layout/Skeletons'

export default function Loading() {
  return (
    <div className="page space-y-6" aria-busy="true" aria-label="Loading the market">
      <SkeletonHeader />
      <SkeletonCards count={6} className="grid grid-cols-2 lg:grid-cols-3 gap-4" />
    </div>
  )
}
