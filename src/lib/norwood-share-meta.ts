export const HAIR_PROFILE_SHARE_IMAGE='https://raw.githubusercontent.com/petersemrany1/upper-hand-pitch-deck/ae07c5065b1a055a0a25b5cbf99f9a742cd9eda5/src/assets/norwood-hairline-scan.jpg';
// The approved guest link redirects to preview / before the private URL
// fragment is read. Crawlers never receive that fragment or patient token.
export function isHairProfileGuestEntry(url:string){
 try{const u=new URL(url);return u.hostname==='id-preview--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app'&&u.pathname==='/';}catch{return false;}
}
export function hairProfileShareMeta(){return[
 {property:'og:title',content:'Hair Profile'},
 {property:'og:description',content:'Your private, guided hair assessment.'},
 {property:'og:image',content:HAIR_PROFILE_SHARE_IMAGE},
 {property:'og:image:alt',content:'Hairline with a subtle scan outline'},
 {property:'og:type',content:'website'},
 {name:'twitter:card',content:'summary_large_image'},
 {name:'twitter:title',content:'Hair Profile'},
 {name:'twitter:description',content:'Your private, guided hair assessment.'},
 {name:'twitter:image',content:HAIR_PROFILE_SHARE_IMAGE},
];}
