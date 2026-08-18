import { SkeletonHeader, SkeletonHero, SkeletonCards } from '@/components/layout/Skeletons'

// Default shell for any garden route without its own loading state.
export default function Loading() {
  return (
    <div className="page space-y-6" aria-busy="true" aria-label="Loading">
      <SkeletonHeader />
      <SkeletonHero />
      <SkeletonCards count={4} className="grid grid-cols-2 md:grid-cols-4 gap-4" />
    </div>
  )
}
