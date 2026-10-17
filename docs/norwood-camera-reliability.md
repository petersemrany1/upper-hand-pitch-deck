# Hair Profile preview: camera recovery and framing review

The preview formerly closed both video peers after any failed signalling poll, even when the video transport still worked. Poll failures and stale heartbeats now get 30 seconds of continuous failure to recover. A transport `disconnected` state gets 15 seconds; recovery cancels its deadline. Explicit stop, access denial, revocation and the ten-minute room deadline still close the camera. Hiding the patient's page stops it immediately. Stop diagnostics contain only side/reason enums, never photos, tokens, SDP or patient information.

## Advisor framing review

For AI `wrong_angle`, `hairline_cut_off` or `hair_covering` results, the patient temporarily retains the exact rejected JPEG in memory. The advisor sees a resized preview of that same original and must explicitly confirm the required anatomy is clearly visible before using **Use reviewed photo**. The button is unavailable until the image loads. Darkness, blur, no head and distance failures do not offer this action.

A two-minute server-signed ticket binds assessment, view, original JPEG digest and problem. Only the authenticated advisor/client in the current room can exchange it for approval. Upload verifies the exact bytes, assessment, view, room, advisor and unexpired live session, then records reviewer/time/problem alongside the private stored photo. The patient cannot approve their own frame. Failed saves retain the still for retry; stopping or changing angle discards it. Staff framing review does not assign a Norwood grade. All five photos still go through the existing evidence checks, and the rep must separately confirm the final stage.

## SMS card

The existing approved Lovable guest link redirects to the preview root before the browser can read the patient token fragment. Crawlers therefore received the portal's social metadata. Only this project's preview root now provides Hair Profile social metadata; the production portal and other routes retain their existing metadata. The image is the existing decorative hairline scan asset at an immutable public GitHub URL, because private preview asset URLs return 401 to unauthenticated image fetches. No patient photo is used. Already-cached message cards cannot be retroactively replaced by the app.

## Verification

- Patient and advisor component tests cover transient poll failure, recovery, immediate stop, exact-photo review, failed-save retry and advancement with existing saved photos.
- Server tests reject different photos/views/assessments, expired or tampered approvals, wrong rooms/advisors, ended cameras and patient approval requests.
- Protocol/evidence/privacy tests and the production build pass; signing code is absent from client assets.
- A synthetic browser test advances 3/5 → 4/5 with one capture, one peer and zero closes. No patient images or AI calls are used in that fixture.

These checks establish software behavior. They do not establish clinical accuracy or reproduce every iPhone/mobile-network failure. The historical server records lacked client stop reasons, so the exact cause of the reported disconnect cannot be proven retrospectively.
