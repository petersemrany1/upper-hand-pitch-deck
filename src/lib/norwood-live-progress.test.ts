import { describe, expect, it } from 'bun:test';
import { mergeSavedViews, nextCaptureView, captureFailureText } from './norwood-live-progress';
import { CapturePreview, previewMessages } from './norwood-live-preview';
import { parseLiveMessage } from './norwood-live';
const id = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
describe('capture recovery', () => {
  it('advances from a database save even when the camera result was lost', () => {
    const saved = mergeSavedViews([], ['front']);
    expect(nextCaptureView('front', saved)).toBe('top');
    expect(nextCaptureView('top', mergeSavedViews(saved, []))).toBe('top');
    expect(mergeSavedViews(saved, [])).toEqual(['front']);
  });
  it('stays on the rejected angle, supports out-of-order angles, and resumes saved work', () => {
    expect(nextCaptureView('front', [])).toBe('front');
    expect(nextCaptureView('crown', ['front', 'left'])).toBe('crown');
    expect(nextCaptureView('crown', ['front', 'left', 'crown'])).toBe('top');
    expect(mergeSavedViews(['crown', 'front'], ['front', 'left'])).toEqual(['front', 'crown', 'left']);
  });
  it('preserves actionable service errors without exposing arbitrary exception details', () => {
    expect(captureFailureText(new Error('This link has expired'))).toBe('This link has expired');
    expect(captureFailureText(new DOMException('aborted', 'TimeoutError'))).toContain('took too long');
    expect(captureFailureText(new Error('secret detail'))).not.toContain('secret');
  });
});
describe('transient checked-photo preview', () => {
  const jpeg = '/9j/' + 'A'.repeat(20000);
  it('chunks a checked photo below mobile data-channel limits and reassembles it exactly', () => {
    const chunks = previewMessages(id, jpeg), buffer = new CapturePreview(); buffer.begin(id);
    expect(chunks.length).toBe(3);
    for (const c of chunks) expect(parseLiveMessage(JSON.stringify(c))).toEqual(c);
    expect(buffer.add(chunks[1])).toBeNull();
    expect(buffer.add(chunks[0])).toBeNull();
    expect(buffer.add(chunks[2])).toBe(`data:image/jpeg;base64,${jpeg}`);
  });
  it('does not show images from an earlier capture or stopped connection', () => {
    const chunks = previewMessages(id, jpeg), buffer = new CapturePreview(); buffer.begin(other);
    expect(buffer.add(chunks[0])).toBeNull();
    buffer.begin(id); buffer.add(chunks[0]); buffer.clear();
    expect(buffer.add(chunks[1])).toBeNull(); expect(buffer.add(chunks[2])).toBeNull();
  });
  it('rejects oversized, non-JPEG, inconsistent and externally referenced previews', () => {
    expect(previewMessages(id, '/9j/' + 'A'.repeat(131072))).toEqual([]);
    expect(previewMessages(id, 'https://example.test/photo')).toEqual([]);
    expect(parseLiveMessage(JSON.stringify({type:'photo-preview',id,index:0,total:17,data:'AA'}))).toBeNull();
    expect(parseLiveMessage(JSON.stringify({type:'photo-preview',id,index:0,total:1,data:'https://example.test/photo'}))).toBeNull();
    const buffer = new CapturePreview(); buffer.begin(id);
    expect(buffer.add({type:'photo-preview',id,index:0,total:2,data:'/9j/'})).toBeNull();
    expect(buffer.add({type:'photo-preview',id,index:1,total:3,data:'AAAA'})).toBeNull();
  });
});
