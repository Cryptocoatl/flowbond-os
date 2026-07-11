import { loadBook } from '@/lib/openflow/book';
import OpenFlowExperience from '@/components/openflow/OpenFlowExperience';

// Prerendered at build time: the book markdown is parsed once during `next build`
// (content/openflow-book.md), so no runtime fs access is needed.
export const dynamic = 'force-static';

// Experience-tier gating: unguessable vault path + noindex; the truly sensitive
// financials were already excluded from the content by design.
const PDF_URL = '/vault/4d896831-0e19-4153-80f8-3dfc1a8552ea/FlowBond-OpenFlow.pdf';

export default function OpenFlowPage() {
  const book = loadBook();
  return <OpenFlowExperience book={book} pdfUrl={PDF_URL} />;
}
