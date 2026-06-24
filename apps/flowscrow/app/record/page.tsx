import { getMyDeal } from '@/lib/deal';
import { getUser } from '@/lib/auth';
import { packageHash, dealIdBytes32 } from '@/lib/hash';
import { Shell } from '../components/Shell';
import { NotAParty } from '../components/NotAParty';
import { AuditLog } from '../components/AuditLog';
import { AnchorPanel } from '../components/AnchorPanel';
import { ExportLog } from '../components/ExportLog';
import { Disclaimer } from '../components/Disclaimer';

export const dynamic = 'force-dynamic';

export default async function RecordPage() {
  const bundle = await getMyDeal();
  if (!bundle) {
    const user = await getUser();
    return <NotAParty email={user?.email ?? null} />;
  }
  const { deal, documents, tasks, events, anchors, myRoles } = bundle;

  const isInitiator = myRoles.includes('initiator');
  const released = deal.status === 'released' || deal.status === 'anchored';
  const pkg = packageHash(documents, tasks);
  const did = dealIdBytes32(deal.id);
  const existingAnchor = anchors[0];

  return (
    <Shell deal={deal} myRoles={myRoles} active="/record">
      <Disclaimer />

      <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Record</h3>
          <p style={{ margin: 0, fontSize: 12.5, color: '#9fb0a4' }}>
            The append-only audit log is the authoritative record of this closing.
          </p>
        </div>
        <ExportLog dealTitle={deal.title} events={events} />
      </div>

      {existingAnchor ? (
        <div className="card" style={{ padding: 16, borderColor: 'rgba(143,169,143,0.5)' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>Anchored on {existingAnchor.chain}</h3>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8a978c', wordBreak: 'break-all', display: 'grid', gap: 4 }}>
            <span>tx&nbsp;&nbsp;&nbsp;{existingAnchor.tx_hash}</span>
            <span>hash&nbsp;{existingAnchor.package_hash}</span>
          </div>
        </div>
      ) : isInitiator && released ? (
        <AnchorPanel dealId={deal.id} dealIdBytes32={did} packageHash={pkg} status={deal.status} />
      ) : (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>
            On-chain anchor <span style={{ fontSize: 11, color: '#8a978c', fontWeight: 400 }}>· optional</span>
          </h3>
          <p style={{ margin: 0, fontSize: 12.5, color: '#9fb0a4', lineHeight: 1.5 }}>
            {released
              ? 'Only the initiator (Ferrera) can record the optional on-chain anchor.'
              : 'Anchoring becomes available once the closing is released. It records a tamper-evident timestamp, not a legal signature.'}
          </p>
        </div>
      )}

      <AuditLog events={events} />
    </Shell>
  );
}
