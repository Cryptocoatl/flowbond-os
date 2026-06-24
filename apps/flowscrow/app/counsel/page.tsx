import { redirect } from 'next/navigation';
import { getMyDeal, allPhaseBConfirmed } from '@/lib/deal';
import { Shell } from '../components/Shell';
import { Gate } from '../components/Gate';
import { CounselActions } from '../components/CounselActions';
import { TaskTracker } from '../components/TaskTracker';
import { Disclaimer } from '../components/Disclaimer';

export const dynamic = 'force-dynamic';

export default async function CounselPage() {
  const bundle = await getMyDeal();
  if (!bundle) redirect('/dashboard');
  const { deal, tasks, myRoles } = bundle;
  if (!myRoles.includes('counsel')) redirect('/dashboard');

  return (
    <Shell deal={deal} myRoles={myRoles} active="/counsel">
      <Disclaimer />
      <Gate deal={deal} tasks={tasks} />
      <CounselActions deal={deal} allPhaseBConfirmed={allPhaseBConfirmed(tasks)} />
      <TaskTracker tasks={tasks} myRoles={myRoles} />
    </Shell>
  );
}
