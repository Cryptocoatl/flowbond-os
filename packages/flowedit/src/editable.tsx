'use client'
import React from 'react'
import { useFlowEdit } from './context'

type Tag = keyof React.JSX.IntrinsicElements

interface EditableProps {
  /** Dot-separated path identifying this content slot. e.g. 'homepage/hero/title' */
  path:      string
  /** Which aspect of the element is editable. Defaults to 'text'. */
  field?:    'text' | 'src' | 'href' | 'alt' | 'style'
  children:  React.ReactNode
  /** Wrapper tag for text fields. Defaults to 'span'. Ignored for src/href/style. */
  as?:       Tag
  className?: string
}

/**
 * Wraps any content slot and substitutes live override values automatically.
 *
 * - field="text"  → renders override text (or children as default)
 * - field="src"   → clones child element with overridden src (+ optional alt)
 * - field="href"  → clones child element with overridden href
 * - field="style" → clones child element with merged style override
 *
 * In edit mode (isEditMode = true) every Editable gains data-fe-edit="true"
 * so the Phase 2 overlay can discover and target them.
 */
export function Editable({ path, field = 'text', children, as: Tag = 'span', className }: EditableProps) {
  const { overrides, isEditMode } = useFlowEdit()

  const key      = `${path}:${field}`
  const override = overrides.get(key)

  const dataAttrs = {
    'data-fe-path':  path,
    'data-fe-field': field,
    ...(isEditMode ? { 'data-fe-edit': 'true' } : {}),
  }

  // ── No override: render default content with data attributes ──────────────
  if (!override) {
    if (field === 'text') {
      return <Tag {...dataAttrs} className={className}>{children}</Tag>
    }
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, dataAttrs)
    }
    return <>{children}</>
  }

  const val = override.value

  // ── Text override ─────────────────────────────────────────────────────────
  if (field === 'text') {
    return (
      <Tag {...dataAttrs} className={className}>
        {String(val.text ?? '')}
      </Tag>
    )
  }

  // ── For element-based fields, we need a child element to clone ───────────
  if (!React.isValidElement(children)) return <>{children}</>

  const child = children as React.ReactElement<Record<string, unknown>>

  if (field === 'src') {
    return React.cloneElement(child, {
      ...dataAttrs,
      src: val.src,
      ...(val.alt !== undefined ? { alt: val.alt } : {}),
    })
  }

  if (field === 'href') {
    return React.cloneElement(child, { ...dataAttrs, href: val.href })
  }

  if (field === 'style') {
    return React.cloneElement(child, {
      ...dataAttrs,
      style: { ...(child.props.style as object | undefined), ...(val.style as object) },
    })
  }

  return React.cloneElement(child, dataAttrs)
}
