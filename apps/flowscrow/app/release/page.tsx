import { getMyDeal } from '@/lib/deal';
import { getUser } from '@/lib/auth';
import { Shell } from '../components/Shell';
import { NotAParty } from '../components/NotAParty';
import { Gate } from '../components/Gate';
import { Vault } from '../components/Vault';
import { Disclaimer } from '../components/Disclaimer';

export const dynamic = 'force-dynamic';

export default async function ReleasePage() {
  const bundle = await getMyDeal();
  if (!bundle) {
    const user = await getUser();
    return <NotAParty email={user?.email ?? null} />;
  }
  const { deal, documents, tasks, myRoles } = bundle;
  const released = deal.status === 'released' || deal.status === 'anchored';

  return (
    <Shell deal={deal} myRoles={myRoles} active="/release">
      <Disclaimer />
      {released ? (
        <div className="card" style={{ padding: 16, borderColor: 'rgba(143,169,143,0.5)' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Closing released</h3>
          <p style={{ margin: '0 0 6px', fontSize: 13.5, color: '#cfe0d2', lineHeight: 1.6 }}>
            The executed Agreement is available to both parties, and the courtesy letter has been
            released to the counterparty.
          </p>
          {deal.effective_date && (
            <p style={{ margin: 0, fontSize: 13.5 }}>
              Effective date: <b className="gold">{deal.effective_date}</b>
            </p>
          )}
        </div>
      ) : (
        <Gate deal={deal} tasks={tasks} />
      )}
      <Vault documents={documents} myRoles={myRoles} />
    </Shell>
  );
}
