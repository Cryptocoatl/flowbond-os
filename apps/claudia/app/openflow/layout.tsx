import type { Metadata } from 'next';
import './openflow.css';

export const metadata: Metadata = {
  title: 'OpenFlow · The Open Book',
  description: 'A gated walk through the FlowBond ecosystem — for one guardian.',
  robots: { index: false, follow: false },
};

export default function OpenFlowLayout({ children }: { children: React.ReactNode }) {
  return <div className="of-root">{children}</div>;
}
