// Upload a dropped clip to the per-user Supabase Storage bucket so it persists
// and can be handed (as a signed URL) to fal/shotstack for server-side work.
import { createClient } from './supabase/client';
import type { Clip } from './clips';

export async function uploadClip(clip: Clip): Promise<{ path: string; signedUrl: string } | null> {
  if (!clip.file) return null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const safe = clip.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${user.id}/${clip.id}-${safe}`;

  const { error } = await supabase.storage.from('flowstudio').upload(path, clip.file, {
    cacheControl: '3600', upsert: true, contentType: clip.file.type,
  });
  if (error) return null;

  // signed URL valid long enough for a render job to pull it
  const { data: signed } = await supabase.storage.from('flowstudio').createSignedUrl(path, 60 * 60 * 6);
  return signed?.signedUrl ? { path, signedUrl: signed.signedUrl } : null;
}

// Upload an audio file (soundtrack) to the user's private folder → signed URL
// that the server render (Shotstack) can pull as the timeline's music.
export async function uploadAudio(file: File): Promise<{ url: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${user.id}/audio-${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from('flowstudio').upload(path, file, {
    cacheControl: '3600', upsert: true, contentType: file.type || 'audio/mpeg',
  });
  if (error) return null;
  const { data: signed } = await supabase.storage.from('flowstudio').createSignedUrl(path, 60 * 60 * 6);
  return signed?.signedUrl ? { url: signed.signedUrl } : null;
}
