// Panel — the atomic frosted surface. Optional eyebrow/title/action header.
import type { ReactNode } from 'react';

export function Panel({
  id,
  title,
  eyebrow,
  action,
  className = '',
  bodyClassName = '',
  children,
}: {
  id?: string;
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`glass scroll-mt-4 p-4 sm:p-5 ${className}`}>
      {(title || eyebrow || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            {title && (
              <h2 className="truncate font-display text-[15px] font-semibold tracking-tight text-kai-text">
                {title}
              </h2>
            )}
          </div>
          {action && <div className="shrink-0 text-kai-muted">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
