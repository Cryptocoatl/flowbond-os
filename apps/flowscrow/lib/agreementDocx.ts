import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

// The signable Mutual Dissolution, Wind-Up and Release Agreement (.docx), with
// DocuSign anchors /sig1/ (Estefanía) and /sig2/ (Russell) inserted on the date
// lines beneath each signature block (tiny white text, findable by DocuSign's
// AnchorString auto-placement, invisible in print/PDF).
// File lives at public/documents/mutual-dissolution-agreement.docx (not embedded
// as a base64 blob in source) — supplied 2026-07-04.
export const AGREEMENT_DOCX_PATH = 'documents/mutual-dissolution-agreement.docx';

/** Reads the .docx from disk and returns it base64-encoded, for DocuSign's
 * documentBase64 field. Server-only — never called from client code. */
export function getAgreementDocxBase64(): string {
  const filePath = path.join(process.cwd(), 'public', AGREEMENT_DOCX_PATH);
  return fs.readFileSync(filePath).toString('base64');
}
