// EmptyState — honest placeholder for surfaces whose data source isn't wired yet
// (live feed, dreams, communities). Invites the first action rather than faking rows.
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon,
  title,
  hint,
  cta,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-8 text-center">
      <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-white/[0.04] text-kai-faint">
        <Icon name={icon} size={20} />
      </span>
      <div className="text-sm font-medium text-kai-muted">{title}</div>
      {hint && <div className="mt-1 max-w-[26ch] text-[12px] text-kai-faint">{hint}</div>}
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}
