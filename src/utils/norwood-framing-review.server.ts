import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { NORWOOD_VIEWS } from '@/lib/norwood-assessment';

// Only framing disagreements can be reviewed. No-head/dark/blurred/too-far
// failures never produce a review ticket. The ticket binds the EXACT JPEG.
export const REVIEWABLE_FRAMING = ['wrong_angle','hairline_cut_off','hair_covering'] as const;
const payloadSchema = z.object({
  purpose:z.enum(['framing-review','framing-approved']), assessment:z.string().uuid(),
  view:z.enum(NORWOOD_VIEWS), sha256:z.string().regex(/^[a-f0-9]{64}$/),
  problem:z.enum(REVIEWABLE_FRAMING), expires:z.number().int(), reviewer:z.string().uuid().optional(), room:z.string().uuid().optional(),
}).strict();
export type FramingReview = z.infer<typeof payloadSchema>;
function signature(payload:string,key:string) {
  if(!key) throw new Error('Photo review is unavailable.');
  return createHmac('sha256',key).update('norwood-framing-v1\0'+payload).digest();
}
export function signFramingReview(value:FramingReview,key:string) {
  const payload=Buffer.from(JSON.stringify(payloadSchema.parse(value))).toString('base64url');
  return payload+'.'+signature(payload,key).toString('base64url');
}
export function readFramingReview(ticket:string,key:string,purpose:FramingReview['purpose'],now=Date.now()) {
  if(ticket.length>1600)throw new Error('Photo review is invalid.');
  const parts=ticket.split('.');if(parts.length!==2)throw new Error('Photo review is invalid.');
  const actual=Buffer.from(parts[1],'base64url'),expected=signature(parts[0],key);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('Photo review is invalid.');
  const result=payloadSchema.parse(JSON.parse(Buffer.from(parts[0],'base64url').toString()));
  if(result.purpose!==purpose||result.expires<=now||result.expires>now+5*60_000||(purpose==='framing-approved'&&(!result.reviewer||!result.room)))throw new Error('Photo review expired. Please capture this angle again.');
  return result;
}
export function reviewedPhotoMatches(review:FramingReview,assessment:string,view:string,photo:Uint8Array) {
  return review.assessment===assessment&&review.view===view&&review.sha256===createHash('sha256').update(photo).digest('hex');
}
