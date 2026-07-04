// Client-side clip model — wraps a user-dropped File as a playable source.
export interface Clip {
  id: string;
  file: File;
  url: string; // object URL
  type: 'video' | 'image';
  name: string;
  duration: number; // seconds (images get a default hold)
  width: number;
  height: number;
  thumb: string; // data URL thumbnail
}

let counter = 0;
const uid = () => `c${++counter}_${Math.round(performance.now())}`;

const IMAGE_HOLD = 4; // seconds an image is held on the timeline

export async function clipFromFile(file: File): Promise<Clip | null> {
  const isVideo = file.type.startsWith('video');
  const isImage = file.type.startsWith('image');
  if (!isVideo && !isImage) return null;
  const url = URL.createObjectURL(file);

  if (isImage) {
    const img = await loadImage(url);
    return {
      id: uid(), file, url, type: 'image', name: file.name,
      duration: IMAGE_HOLD, width: img.naturalWidth, height: img.naturalHeight,
      thumb: thumbFromDrawable(img, img.naturalWidth, img.naturalHeight),
    };
  }

  const { video, duration, w, h } = await loadVideoMeta(url);
  // grab a thumbnail at ~1s
  await seek(video, Math.min(1, duration * 0.3));
  const thumb = thumbFromDrawable(video, w, h);
  return { id: uid(), file, url, type: 'video', name: file.name, duration, width: w, height: h, thumb };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function loadVideoMeta(url: string): Promise<{ video: HTMLVideoElement; duration: number; w: number; h: number }> {
  return new Promise((res, rej) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () =>
      res({ video, duration: video.duration || 0, w: video.videoWidth, h: video.videoHeight });
    video.onerror = rej;
    video.src = url;
  });
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((res) => {
    const done = () => { video.removeEventListener('seeked', done); res(); };
    video.addEventListener('seeked', done);
    video.currentTime = t;
  });
}

function thumbFromDrawable(d: CanvasImageSource, w: number, h: number): string {
  const tw = 320;
  const th = Math.round((tw * h) / w) || 180;
  const c = document.createElement('canvas');
  c.width = tw; c.height = th;
  const ctx = c.getContext('2d');
  if (ctx) ctx.drawImage(d, 0, 0, tw, th);
  try { return c.toDataURL('image/jpeg', 0.6); } catch { return ''; }
}
