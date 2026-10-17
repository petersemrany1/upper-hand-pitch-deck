# Expanded advisor camera and Norwood reference

The AI Norwood photo check has an **Expand camera & chart** button. It opens the current camera and capture controls in a large modal, followed by seven original schematic illustrations and a short description for each stage. Once photos are saved, the same workspace provides a large selected photo with five thumbnail controls. The AI estimate is explicitly labelled; a separately confirmed rep grade is labelled separately.

The chart is a comparison aid, not a selector. **Back to call** returns the rep to the existing Norwood selector and its required confirmation and stage 6–7 expectations gate. No lead, booking, inference, patient page, storage or clinic-handover behaviour changes.

## Evidence and limits

Descriptions and diagrams were checked against the Norwood section (not the earlier Hamilton classification) of [Gupta & Mysore, 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4812885/) and [consultant surgeon Maurice Collins' clinical definitions](https://www.hrbr.ie/hair-classification/). These are original schematic drawings, not copied chart assets or clinical photographs.

The chart deliberately differentiates a retained band between front/crown loss at IV, a narrower and sparser band at V, no separating band at VI, and the narrow low side/back fringe at VII. III vertex has a separate illustration and explanation. A variants and patterns outside the scale are explicitly mentioned. This UI change does not establish measured AI accuracy or replace clinical review.

## Connection and accessibility

A stable React portal container moves between an inline host and a native modal. The camera component, video node, WebRTC peer and pending capture remain mounted. Native modal behaviour makes the background inert; Tab loops inside, Escape/backdrop/close buttons dismiss, focus returns to the expand button, and body scrolling is restored. The layout supports narrow screens with no horizontal overflow. Desktop controls stay beside the camera; the reference is underneath.

Verification: TypeScript and production build; three camera tests including repeated expansion/closure preserving the peer, video node and selected angle; browser checks with synthetic video for capture across closure, saved-photo selection, AI/rep distinction, keyboard focus, and a 390px viewport. No patient photos or credentials are included in test fixtures or screenshots.
