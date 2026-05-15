import Image from 'next/image'

type LockupColor = 'gold' | 'dark-green' | 'sage' | 'cream' | 'white' | 'black'

type Props = {
  width?: number
  color?: LockupColor
  className?: string
  priority?: boolean
}

export function FlowGardenLockup({
  width = 240,
  color = 'gold',
  className,
  priority = false,
}: Props) {
  // Lockup aspect ratio: ~1.362:1
  const height = Math.round(width / 1.362)
  return (
    <Image
      src={`/logos/lockup/flowgarden-lockup-${color}-2048.png`}
      width={width}
      height={height}
      alt="FlowGarden — Grow, Flow, Thrive"
      className={className}
      priority={priority}
    />
  )
}
