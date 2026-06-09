import React from 'react'

/**
 * FlowMeChip — the ecosystem back-link.
 *
 * The reciprocal of the "Across FlowBond" buttons on a FlowMe profile: a small
 * chip any app drops into its own header, pointing back to the person's FlowMe
 * profile (flowme.one/<handle>) — or to /new if they don't have one yet.
 *
 * Presentational only: the host app looks up the handle (one query on
 * flowme_profiles by auth_user_id) and passes it in. Styling adapts to the
 * surrounding text color via `currentColor`; pass `className`/`style`/`dotColor`
 * to match each app's world.
 */
export function FlowMeChip({
  handle,
  baseUrl = 'https://flowme.one',
  className,
  style,
  dotColor = '#3FB970',
}: {
  /** the owner's FlowMe handle, or null/undefined if they haven't made one */
  handle?: string | null
  baseUrl?: string
  className?: string
  style?: React.CSSProperties
  /** the FlowMe presence dot color */
  dotColor?: string
}) {
  const claimed = Boolean(handle)
  const href = claimed ? `${baseUrl}/${handle}` : `${baseUrl}/new`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={claimed ? 'Your FlowMe profile' : 'Create your FlowMe profile'}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12,
        lineHeight: 1,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 8px ${dotColor}`,
          flex: 'none',
        }}
      />
      <span style={{ fontStyle: 'italic' }}>FlowMe</span>
      {claimed ? (
        <span style={{ opacity: 0.6 }}>@{handle}</span>
      ) : (
        <span style={{ opacity: 0.6 }}>Claim yours</span>
      )}
    </a>
  )
}
