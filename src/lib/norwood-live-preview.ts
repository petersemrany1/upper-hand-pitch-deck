import type { LiveMessage } from './norwood-live';

// Small chunks stay below mobile WebRTC message limits. Photos remain in memory;
// neither signalling, browser storage nor logs ever receive these previews.
export const PREVIEW_CHUNK_SIZE = 8192;
export const PREVIEW_MAX_CHUNKS = 16;
type PreviewChunk = Extract<LiveMessage, { type: 'photo-preview' }>;
export function previewMessages(id: string, jpeg: string): PreviewChunk[] {
  if (!jpeg.startsWith('/9j/') || !/^[A-Za-z0-9+/]+={0,2}$/.test(jpeg) || jpeg.length > PREVIEW_CHUNK_SIZE * PREVIEW_MAX_CHUNKS) return [];
  const total = Math.ceil(jpeg.length / PREVIEW_CHUNK_SIZE);
  return Array.from({ length: total }, (_, index) => ({ type: 'photo-preview', id, index, total, data: jpeg.slice(index * PREVIEW_CHUNK_SIZE, (index + 1) * PREVIEW_CHUNK_SIZE) }));
}
export class CapturePreview {
  private id = '';
  private chunks = new Map<number, string>();
  private total = 0;
  begin(id: string) { this.id = id; this.chunks.clear(); this.total = 0; }
  clear() { this.begin(''); }
  add(message: PreviewChunk): string | null {
    if (!this.id || message.id !== this.id || message.total > PREVIEW_MAX_CHUNKS || message.index >= message.total || message.data.length > PREVIEW_CHUNK_SIZE) return null;
    if (this.total && this.total !== message.total) return null;
    this.total = message.total; this.chunks.set(message.index, message.data);
    if (this.chunks.size !== this.total) return null;
    const jpeg = Array.from({ length: this.total }, (_, i) => this.chunks.get(i)!).join('');
    this.chunks.clear();
    return jpeg.startsWith('/9j/') && /^[A-Za-z0-9+/]+={0,2}$/.test(jpeg) ? `data:image/jpeg;base64,${jpeg}` : null;
  }
}
export async function makeCapturePreview(photo: string): Promise<string> {
  const img = new Image(); img.src = `data:image/jpeg;base64,${photo}`; await img.decode();
  const canvas = document.createElement('canvas'), scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
  const context = canvas.getContext('2d'); if (!context) return '';
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Display only. Full-resolution originals still go to AI and private storage.
  return canvas.toDataURL('image/jpeg', .65).split(',')[1];
}
