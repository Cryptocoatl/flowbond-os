import { getMyDeal, allPhaseBConfirmed } from '@/lib/deal';
import { getUser } from '@/lib/auth';
import { Shell } from '../components/Shell';
import { NotAParty } from '../components/NotAParty';
import { Vault } from '../components/Vault';
import { Gate } from '../components/Gate';
import { TaskTracker } from '../components/TaskTracker';
import { AuditLog } from '../components/AuditLog';
import { CounselActions } from '../components/CounselActions';
import { Disclaimer } from '../components/Disclaimer';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const bundle = await getMyDeal();
  if (!bundle) {
    const user = await getUser();
    return <NotAParty email={user?.email ?? null} />;
  }

  const { deal, documents, tasks, events, myRoles } = bundle;
  const isCounsel = myRoles.includes('counsel');

  return (
    <Shell deal={deal} myRoles={myRoles} active="/dashboard">
      <Disclaimer />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="fs-grid">
        <Vault documents={documents} myRoles={myRoles} />
        <Gate deal={deal} tasks={tasks} />
      </div>
      {isCounsel && (
        <CounselActions deal={deal} allPhaseBConfirmed={allPhaseBConfirmed(tasks)} />
      )}
      <TaskTracker tasks={tasks} myRoles={myRoles} />
      <AuditLog events={events} />
    </Shell>
  );
}
