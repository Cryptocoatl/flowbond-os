export const MEDIA_BUCKET = 'studio-media';

export interface MediaItem {
  id: string;
  owner_fbid: string;
  kind: 'photo' | 'video';
  storage_path: string;
  title: string | null;
  content_hash: string | null;
  origo_cert_id: string | null;
  size_bytes: number | null;
  visibility: 'private' | 'unlisted' | 'public';
  created_at: string;
}
