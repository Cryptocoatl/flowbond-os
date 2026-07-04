import { getMyDeal } from '@/lib/deal';
import { getUser } from '@/lib/auth';
import { isDocusignConfigured } from '@/lib/server/docusign';
import { Shell } from '../components/Shell';
import { NotAParty } from '../components/NotAParty';
import { Disclaimer } from '../components/Disclaimer';
import { WalletAttest } from '../components/WalletAttest';
import type { FlowDocument } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SignPage() {
  const bundle = await getMyDeal();
  if (!bundle) {
    const user = await getUser();
    return <NotAParty email={user?.email ?? null} />;
  }
  const { deal, documents, parties, myRoles } = bundle;
  const dsReady = isDocusignConfigured();
  const myParty = parties.find((p) => myRoles.includes(p.role));

  return (
    <Shell deal={deal} myRoles={myRoles} active="/sign">
      <Disclaimer />
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>DocuSign execution</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#9fb0a4', lineHeight: 1.55 }}>
          The binding signature is executed via DocuSign and confirmed by counsel. The agreement is
          sent to both parties; the courtesy letter to Ferrera only. FlowScrow records each
          envelope&rsquo;s status and document hash.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map((d: FlowDocument) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 0',
                borderTop: '1px solid rgba(201,169,97,0.10)',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {d.kind === 'agreement' ? 'Separation Agreement' : 'Courtesy Letter (Exhibit 5)'}
              </span>
              <span className="pill" style={{ color: d.status === 'completed' ? '#8FA98F' : '#C9A961' }}>
                {d.docusign_envelope_id ? d.status : 'not sent'}
              </span>
            </div>
          ))}
        </div>
        {!dsReady && (
          <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#C9A961' }}>
            DocuSign isn&rsquo;t configured in this environment yet. Set the DOCUSIGN_* server env
            vars to send envelopes and embed signing here.
          </p>
        )}
      </div>

      {myParty && <WalletAttest dealId={deal.id} current={myParty.wallet_address} />}
    </Shell>
  );
}
