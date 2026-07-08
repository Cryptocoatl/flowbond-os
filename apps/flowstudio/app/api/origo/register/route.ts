import { NextRequest, NextResponse } from 'next/server';
import { registerOnOrigo } from '../../../../src/modules/edit/provenance/origo';
import { safeUnderStudio } from '../../../../lib/paths';

export const runtime = 'nodejs';

// POST /api/origo/register — { path, title, author, visibility } → registers a
// specific render file on Origo. This IS the explicit confirmation gate.
export async function POST(req: NextRequest) {
  try {
    const { path, title, author, visibility } = await req.json();
    const p = safeUnderStudio(path || '');
    if (!p) return NextResponse.json({ error: 'bad path' }, { status: 400 });
    const r = await registerOnOrigo(
      p,
      { manifestPath: '' },
      {
        fbid: '',
        components: { audio: 'trainedAlgorithmicMedia (Suno)', video: 'compositeWithTrainedAlgorithmicMedia (Kling)' },
        license: 'remix-with-attribution + revenue-share',
        proofOfHuman: true,
      },
      { title: title || 'FlowStudio Reel', author: author || '', visibility: visibility || 'unlisted' },
    );
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'register failed' }, { status: 500 });
  }
}
