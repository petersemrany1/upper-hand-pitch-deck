import{test,expect}from'bun:test';
import{isHairProfileGuestEntry,hairProfileShareMeta}from'./norwood-share-meta';
test('guest entry uses scanner social card only on this project preview root',()=>{
 expect(isHairProfileGuestEntry('https://id-preview--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app/')).toBe(true);
 for(const url of ['https://hairtransplantgroup.lovable.app/','https://id-preview--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app/sales-call-test','https://evil.example/','bad'])expect(isHairProfileGuestEntry(url)).toBe(false);
 expect(hairProfileShareMeta().find(m=>m.property==='og:title')?.content).toBe('Hair Profile');
 expect(hairProfileShareMeta().find(m=>m.property==='og:image')?.content).toEndWith('/norwood-hairline-scan.jpg');
});
