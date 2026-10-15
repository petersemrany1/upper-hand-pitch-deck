# Guided capture update — preview only

The patient screen uses one viewport (all seven screens tested at 320×568, 375×667 and 390×720), short copy, phone-position and target-region SVG diagrams, and optional spoken positioning/countdown. Normal portrait phone layouts do not scroll; enlarged accessibility text and the help dialog may scroll rather than clip content. No patient login or new public data access was added. The hosting URL remains the existing shared Lovable test URL; production is not published.

After explicit camera-image consent, a 640px JPEG frame is checked server-side with the existing configured Anthropic model. Requests are serial, spaced at least three seconds, with 120 frame checks per two-hour link. A visible head, correct requested region and clear quality are all required before a five-second countdown. The final captured JPEG is independently checked again at up to 1536px before private storage. Rejects stay on the same step; accepted photographs advance without confirmation. The five accepted photographs are still assessed together for the Norwood result. Old links with the earlier five-photo consent must accept the updated camera-frame consent before automatic checking.

Live framing images are transient in the application and are sent to Anthropic; they are not written to the storage bucket. The consent wording covers this. This is periodic server vision, not an instantaneous on-device detector. Network/model latency can delay the timer. A framing pass is not measured clinical accuracy or proof of a correct Norwood grade.

The photo-check prompt explicitly rejects face-only selfies for top/crown, requires surrounding anatomy for the crown, and permits a bald scalp without demanding a visible whorl. Final five-view inference still checks distinct profiles, full evidence and contradictions. Model framing is fallible and requires real-phone field testing, particularly during an active phone call where audio routing varies.

Capture pauses on a hidden page, cancelled timer, help dialog, expired link or unavailable check; the patient can resume or use the phone camera/upload fallback. No camera microphone is requested. Camera permission is still required by the browser. Files are re-encoded to remove EXIF before transmission.

Technical references consulted 15 October 2026:
- [Anthropic vision API](https://platform.claude.com/docs/en/build-with-claude/vision): image blocks, JPEG support, resizing and limitations.
- [MDN SpeechSynthesis.speak](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak): browser speech playback.
- [WebKit camera/speech interaction](https://bugs.webkit.org/show_bug.cgi?id=218815): resume the silent preview after speech on affected Safari versions.

The SMS is exactly: `Hi [NAME] please see link below for our ai norwood scale scanner [link]`. The existing rep gate, expectations popup, clinic handover and lead statuses are unchanged.
