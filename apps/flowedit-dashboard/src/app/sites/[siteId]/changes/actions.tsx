'use client'

const API_URL = process.env.NEXT_PUBLIC_FLOWEDIT_API_URL ?? 'http://localhost:4000'

async function patchOverride(siteId: string, overrideId: string, status: 'live' | 'rejected') {
  await fetch(`${API_URL}/api/v1/flowedit/content/${siteId}/overrides/${overrideId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  window.location.reload()
}

export function ApproveButton({ siteId, overrideId }: { siteId: string; overrideId: string }) {
  return (
    <button
      onClick={() => patchOverride(siteId, overrideId, 'live')}
      className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
    >
      Approve
    </button>
  )
}

export function RejectButton({ siteId, overrideId }: { siteId: string; overrideId: string }) {
  return (
    <button
      onClick={() => patchOverride(siteId, overrideId, 'rejected')}
      className="text-xs px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-400 rounded-lg font-medium transition-colors"
    >
      Reject
    </button>
  )
}
