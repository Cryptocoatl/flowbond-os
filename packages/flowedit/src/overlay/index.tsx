'use client'
import { useFlowEdit }    from '../context'
import { useSelection }   from './useSelection'
import { EditModeToggle } from './Toggle'
import { Panel }          from './Panel'

/**
 * Renders the FlowEdit overlay UI: the toggle button + the editor panel.
 * Already included inside FlowEditProvider — no need to add it manually.
 */
export function FlowEditOverlay() {
  const { isEditMode } = useFlowEdit()
  const { selection, clear } = useSelection(isEditMode)

  return (
    <>
      <EditModeToggle />
      {selection && <Panel selection={selection} onClose={clear} />}
    </>
  )
}
