import { SkeletonHeader, SkeletonHero, SkeletonCards } from '@/components/layout/Skeletons'

export default function Loading() {
  return (
    <div className="page space-y-6" aria-busy="true" aria-label="Loading plants">
      <SkeletonHeader />
      <SkeletonHero />
      <SkeletonCards count={6} />
    </div>
  )
}
