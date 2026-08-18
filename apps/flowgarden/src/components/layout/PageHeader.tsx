// One header for every page. Before this, six pages each rolled their own —
// different type scale, different colours (half of them hardcoded light-mode
// stone), different spacing.
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 flex gap-2">{action}</div> : null}
    </div>
  )
}
