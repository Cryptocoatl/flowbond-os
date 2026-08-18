import { SkeletonHeader, SkeletonCards } from '@/components/layout/Skeletons'

export default function Loading() {
  return (
    <div className="page space-y-6" aria-busy="true" aria-label="Loading sensors">
      <SkeletonHeader action={false} />
      <SkeletonCards count={4} className="grid grid-cols-2 md:grid-cols-4 gap-3" />
    </div>
  )
}
