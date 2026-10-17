import {expect,test} from 'bun:test';
import {createHash} from 'node:crypto';
import {readFramingReview,signFramingReview,reviewedPhotoMatches,REVIEWABLE_FRAMING,type FramingReview} from './norwood-framing-review.server';
const key='test-only-signing-key',now=1800000000000,photo=Buffer.from('exact test JPEG');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const value:FramingReview={purpose:'framing-review',assessment:a,view:'front',sha256:createHash('sha256').update(photo).digest('hex'),problem:'wrong_angle',expires:now+120000};
test('framing review binds the original bytes, view and assessment',()=>{
 const review=readFramingReview(signFramingReview(value,key),key,'framing-review',now);
 expect(reviewedPhotoMatches(review,a,'front',photo)).toBe(true);
 expect(reviewedPhotoMatches(review,b,'front',photo)).toBe(false);
 expect(reviewedPhotoMatches(review,a,'top',photo)).toBe(false);
 expect(reviewedPhotoMatches(review,a,'front',Buffer.from('substituted'))).toBe(false);
});
test('patient ticket cannot approve a photo; tampering, wrong key and expiry fail closed',()=>{
 const ticket=signFramingReview(value,key);
 expect(()=>readFramingReview(ticket,key,'framing-approved',now)).toThrow();
 expect(()=>readFramingReview(ticket,'wrong-key','framing-review',now)).toThrow();
 expect(()=>readFramingReview(ticket,key,'framing-review',now+120000)).toThrow();
 expect(()=>readFramingReview(ticket.slice(0,-5)+'AAAAA',key,'framing-review',now)).toThrow();
 expect(()=>readFramingReview(signFramingReview({...value,purpose:'framing-approved'},key),key,'framing-approved',now)).toThrow();
 const approved=signFramingReview({...value,purpose:'framing-approved',reviewer:b,room:b},key);
 expect(readFramingReview(approved,key,'framing-approved',now).reviewer).toBe(b);
});
test('quality failures cannot be approved as framing disagreements',()=>{
 expect(REVIEWABLE_FRAMING).toEqual(['wrong_angle','hairline_cut_off','hair_covering']);
 for(const problem of ['no_head','too_dark','blurred','too_far','none'])expect(()=>signFramingReview({...value,problem:problem as any},key)).toThrow();
});
