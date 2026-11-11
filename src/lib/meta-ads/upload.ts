import { Upload } from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import type { Asset } from './model';
import type { MetaAdsApi } from './api';

export async function replaceThumbnail(api: MetaAdsApi, draftId: string, asset: Asset, file: File, demo = false): Promise<Asset> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choose a JPG, PNG or WebP image up to 10 MB.');
  const bitmap=await createImageBitmap(file);
  let blob:Blob;
  try {
    const canvas=document.createElement('canvas'),scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('This image could not be read.')),'image/jpeg',.9));
  } finally {bitmap.close();}
  if(demo)return {...asset,thumbnailUrl:URL.createObjectURL(blob)};
  const signed=await api.request<any>('thumbnail_url',{id:draftId,assetId:asset.id});
  const uploaded=await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path,signed.token,blob,{contentType:'image/jpeg'});
  if(uploaded.error)throw new Error(uploaded.error.message);
  return api.request<Asset>('complete_thumbnail',{id:draftId,assetId:asset.id,path:signed.path});
}

export async function inspectVideo(file: File): Promise<{ width: number; height: number; duration: number; thumbnail: Blob }> {
  const url = URL.createObjectURL(file), video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = url;
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('This video could not be previewed. Try an MP4 encoded with H.264.')), 20000);
      const fail = () => { clearTimeout(timer); reject(new Error('This browser cannot read the video. Export it as MP4 with H.264 and try again.')); };
      video.onerror = fail;
      video.onloadedmetadata = () => { if (!Number.isFinite(video.duration) || video.duration <= 0) return fail(); video.currentTime = Math.min(1, video.duration / 2); };
      video.onseeked = () => {
        const canvas = document.createElement('canvas'), ratio = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * ratio); canvas.height = Math.round(video.videoHeight * ratio);
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => { clearTimeout(timer); if (!blob) return fail(); resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, thumbnail: blob }); }, 'image/jpeg', 0.88);
      };
    });
  } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}

export async function uploadAsset(api: MetaAdsApi, draftId: string, asset: Asset, file: File, thumbnail: Blob, signal: AbortSignal, onProgress: (percent: number) => void): Promise<Asset> {
  const signed = await api.request<any>('upload_urls', { id: draftId, assetId: asset.id });
  async function transfer(body: File | Blob, path: string, token: string, video: boolean) {
    const host = new URL(signed.storageUrl);
    if (host.hostname.endsWith('.supabase.co') && !host.hostname.endsWith('.storage.supabase.co')) host.hostname = host.hostname.replace('.supabase.co', '.storage.supabase.co');
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => { signal.removeEventListener('abort', abort); error ? reject(error) : resolve(); };
      const upload = new Upload(body, {
        endpoint: `${host.origin}/storage/v1/upload/resumable/sign`,
        headers: { apikey: signed.publishableKey, 'x-signature': token, 'x-upsert': 'true' },
        chunkSize: 6 * 1024 * 1024, retryDelays: [0, 1000, 3000, 5000, 10000],
        uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
        fingerprint: async () => `meta-ads:${draftId}:${asset.id}:${video ? 'video' : 'thumb'}:${body.size}:${body instanceof File ? body.lastModified : 0}`,
        metadata: { bucketName: signed.bucket, objectName: path, contentType: video ? asset.mime : 'image/jpeg', cacheControl: '3600' },
        onProgress: (loaded, total) => { if(video) onProgress(Math.round(loaded / total * 95)); },
        onError: error => finish(new Error(error.message)), onSuccess: () => finish(),
      });
      const abort = () => { void upload.abort(); finish(new Error('Upload paused. Choose the same file to resume.')); };
      signal.addEventListener('abort', abort, { once: true });
      if(signal.aborted) return abort();
      void upload.findPreviousUploads().then(previous => { if(signal.aborted) return; if(previous[0]) upload.resumeFromPreviousUpload(previous[0]); upload.start(); }).catch(error => finish(error));
    });
  }
  await transfer(file, signed.path, signed.videoToken, true);
  await transfer(thumbnail, signed.thumbnailPath, signed.thumbnailToken, false);
  onProgress(98);
  const saved = await api.request<Asset>('complete_upload', { id: draftId, assetId: asset.id });
  onProgress(100);
  return saved;
}
