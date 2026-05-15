import Image from 'next/image'

type MarkColor = 'gold' | 'dark-green' | 'sage' | 'cream' | 'white' | 'black'

type Props = {
  size?: number
  color?: MarkColor
  className?: string
  priority?: boolean
}

export function FlowGardenMark({
  size = 64,
  color = 'gold',
  className,
  priority = false,
}: Props) {
  return (
    <Image
      src={`/logos/mark/flowgarden-mark-${color}-1024.png`}
      width={size}
      height={size}
      alt="FlowGarden"
      className={className}
      priority={priority}
    />
  )
}
