# Norwood photo assessment

## Preview delivery

The `codex/norwood-preview` branch now provides two preview-only workflows:

- `/sales-call-test`: the actual rep screen has a **Send AI Norwood link** panel in its right sidebar. It uses the existing selected clinic and reads the test lead's mobile on the server. Once guest preview access is configured, a real SMS opens `/norwood-photo-test#<random-token>` on the patient's phone with no app or staff login. Both devices poll progress independently.
- `/norwood-preview`: the earlier single-tab walkthrough remains available and keeps its photos only in browser memory.

The user approved temporary guest preview access on 15 October 2026. The official “Norwood phone test” share link is stored server-side as `NORWOOD_PREVIEW_GUEST_URL`, with `NORWOOD_PREVIEW_GUEST_EXPIRES_AT` set to 22 October 2026, 04:44:30 UTC. SMS uses that short URL with a patient-only `#norwood-test=<token>` fragment. After Lovable establishes guest access, the preview router sends that exact fragment to `/norwood-photo-test#<token>` before showing the portal. This entry handler runs only on exact preview hosts and accepts no arbitrary redirect target. Staff sign-in is unchanged. Personal Lovable authentication links are never used. The server refuses new links when less than two hours of guest access remains; individual patient links still expire after two hours.

The cross-device test accepts only the existing Peter Test and Test Tested lead UUIDs, enforced in the server and database. It uses `norwood_preview_assessments`, `norwood_preview_reviews`, and the PRIVATE `norwood-preview-photos` bucket, installed by `20261015030000_norwood_preview_phone_test.sql`. The production Norwood migrations are not applied. Patients receive only their own clinic branding, progress and estimate through a hashed, lead-bound, two-hour bearer link. Staff image URLs expire after 60 seconds. No photos are sent to clinics. The audit confirmation RPC does not write leads or appointments; after it succeeds, the existing test selector performs its normal save. No Norwood action changes a lead status or triggers a clinic handover.

The protected SalesCallPortal change is limited to importing the self-contained sandbox panel/hook, placing the panel in the right sidebar, and hooking the existing selector's suggestion highlight and explicit click into the separate audit save. The existing `norwoodGateReady` expression and 6–7 expectations controls are unchanged. The provider exists only on the test route, and all Norwood test server functions reject non-preview hosts and cross-origin requests.

Secrets remain server-side and use the existing Anthropic/Twilio configuration. The phone test stores photos privately for staff review; closing the patient's tab does not delete these cross-device photos. Sending a replacement link revokes the old link. The local walkthrough has different, clearly labelled in-memory storage.

Verification: 28 focused unit tests, the build and TypeScript pass. The isolated PostgreSQL migration test verifies expiry, revocation, consent, all five angles, duplicate-photo rejection, run fencing, staff/clinic/anonymous permissions, a restrictive private-bucket policy, separate review history and no writes to lead or appointment fields. These are software and privacy checks, not a measured clinical accuracy result. Real SMS delivery and real-device photographs still require user testing through the preview button. No production publish is performed.

Implemented 15 October 2026. This is a photo-based estimate to support the existing rep conversation. It is not a diagnosis, treatment recommendation or validated medical device. No measured accuracy percentage is claimed.

## Research used

- [Hair Restoration Blackrock: surgeon-authored Norwood classification](https://www.hrbr.ie/hair-classification/): assess temple recession, crown coverage and the intervening bridge. IV retains a substantial bridge; V has a narrower/sparser one; VI joins the front and crown areas; VII leaves a narrow low horseshoe fringe. Crown-first III vertex and anterior A variants need separate interpretation. The integer selector maps III vertex to 3 and A variants to their base numeral, while the reason preserves the distinction.
- [ISHRS: guide to pattern hair loss](https://ishrs.org/androgenetic-alopecia/): the scale describes male-pattern hair loss, rather than every possible cause or pattern of thinning. Atypical patterns must reduce confidence.
- [Guarrera et al., Reliability of Hamilton–Norwood Classification, 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC2938573/): photographic stage agreement was imperfect even among dermatologists (reported ICC 0.63–0.68 in the first study), with poor repeatability in the second. Agreement with a sales rep is therefore not proof of clinical accuracy.
- [Institute of Medical Illustrators, Hair Loss Photography, 2024](https://www.imi.org.uk/wp-content/uploads/2024/06/NG_HairLoss_1_0_S.pdf): consistent framing, lighting, hair positioning and complementary views matter. The self-capture instructions are a practical adaptation, not a claim to meet a clinical photography protocol.
- [Anthropic vision API documentation](https://platform.claude.com/docs/en/build-with-claude/vision): multiple labelled images can be sent together using base64 image blocks. No public photo URL is needed.

The prompt explicitly checks the hairline, crown, bridge and side/back fringe. It warns against treating a normal whorl, hair part, glare, wet clumps, shaved hair or hidden fringe as clear loss. It does not infer centimetres, future progression, graft count or transplant suitability. All photo problems downgrade confidence to low. Unusable photos may return JSON `null`; validation rejects this and the application displays no invented stage.

### Australian clinical rubric — prompt version 2026-10-15.3

The Australian sources use the established modified Hamilton–Norwood classification; this search did not identify a separate Australian 1–7 definition. The implemented guidance draws on:

- [Iyengar and Li, Australian Prescriber, June 2025](https://australianprescriber.tg.org.au/articles/male-and-female-pattern-hair-loss.html): Melbourne GP/dermatologist authors identify Norwood–Hamilton for male-pattern distribution and distinguish it from central-part/diffuse patterns. Diagnosis also uses history and examination, sometimes trichoscopy; phone photographs cannot establish the cause or microscopic findings.
- [Clarke, RACGP, April 2016](https://www.racgp.org.au/afp/2016/april/male-baldness/): Australian clinical assessment considers other causes and examines the scalp. The app therefore estimates a visible pattern and declines incompatible or unobservable patterns.
- [Nyholt et al., Australian twin research, 2003, Figure 1](https://genepi.qimr.edu.au/contents/p/staff/CV362.pdf): documents Australian use of I–VII, III vertex and A variants. This supports the classification context, not AI accuracy. Its genetic findings are not used to predict an individual's stage.
- [Clinical trial protocol NCT04004325, Appendix D, printed pages 98–99](https://cdn.clinicaltrials.gov/large-docs/25/NCT04004325/Prot_000.pdf): reproduces the detailed Norwood 1975 definitions. Cross-checked with [surgeon Maurice Collins' classification](https://www.hrbr.ie/hair-classification/), especially the low posterior fringe in VII. These describe anatomy; they do not validate automated grading. The original [Norwood 1975 bibliographic record](https://pubmed.ncbi.nlm.nih.gov/1188424/) was checked, but its full paper was not available in this search.

| Grade | Feature used by the prompt |
| --- | --- |
| 1 | Minimal or absent recession. |
| 2 | Shallow temple recession. |
| 3 | Deep, sparsely covered temple recesses; III vertex instead permits crown-first loss with limited frontal recession. |
| 4 | Front/crown loss separated by a substantial band. |
| 5 | A narrower, sparser separating band remains. |
| 6 | The band is lost and the areas join; isolated hairs may remain. |
| 7 | Only a narrow, low side/back horseshoe remains. |

The runtime prompt now explicitly checks each adjacent boundary, both profiles, and the crown/back fringe. It does not equate scalp visibility with loss, a frontal tuft with the separating band, or a bare top with VII. It avoids mixing older Hamilton numbering with modified Norwood grades. A variants retain their separate anatomical rules; the app's integer mapping and mandatory low confidence are implementation decisions, not additional official grades.

`observations.boundary_uncertain` records a debatable adjacent boundary. The server forces such results to low confidence and adds the ambiguity to the rep's reason even if the provider claims high confidence. Unknown essential anatomy still causes abstention. This new field is saved in the existing private observation JSON; no database change is needed. Historical results keep their original prompt version and are not regraded.

This is evidence-informed prompting, not proof that the model interprets real photographs correctly. No live-model accuracy claim follows from the research or the software tests. The user chose this rubric update instead of pursuing supplier contact; no enquiry is pending.

Version 3 verification: 27 focused tests (164 assertions), app/evaluation-runner TypeScript checks and the production build passed. The mocked provider-request test verifies that the runtime sends this exact updated system prompt with all five images. The new boundary test verifies forced low confidence, the rep's ambiguity explanation and rejection when the bridge is unknown. No live model request was made. `SalesCallPortal.tsx` remained unchanged during this rubric update (SHA-256 `185d6f382b83e21ff41b4f1b17079f28e01911fa4e394f31f7d57529bff47f3b`).

## Data flow and boundaries

1. An authenticated active admin/rep selects a clinic and sends a link. The server loads the lead's phone itself, creates a cryptographically random 256-bit bearer token, and stores only its SHA-256 hash. The token is in the URL fragment, not the URL query or path. The SMS log contains a redacted link. A link is tied to one lead and clinic, lasts exactly two hours, and a fresh link revokes the previous one. Sending is limited to once a minute per lead.
2. The public page returns only the clinic name, expiry, consent/progress flags and its own estimate. It never returns a lead ID, patient name/contact details, storage path, photo URL, rep decision or model reason. Clinic branding is a text wordmark and monogram using the selected clinic's saved name; no remote tracking images are added.
3. The patient agrees to storage, AI processing and advisory-team review, then takes five guided photos. The browser requests video only (no microphone), offers a five-second timer, and falls back to the native camera/file picker. It downscales/re-encodes to JPEG, removing camera EXIF/location metadata, and runs conservative darkness/blur checks before each upload. These checks are heuristics and require calibration on real devices and hair/skin tones; they do not establish clinical adequacy.
4. The server checks consent, token validity, JPEG signature/size and permitted angle. Images go into the private `norwood-photos` bucket. Immutable object paths and locked database updates prevent uploads changing the five-photo snapshot once analysis begins. Exact duplicate files across angles are rejected. Uploads are limited to 30 per link.
5. All five labelled images go in one server-only request to the same Anthropic Messages setup and model used in `auto-analyse-call`: `claude-haiku-4-5-20251001`. The current prompt version is `2026-10-15.3`. The model returns structured observations in addition to the four result fields. Server-side consistency checks reject unsupported stage/evidence combinations; displayed reasons are generated from the checked fields. These checks are conservative and unvalidated: they can reject an inconsistent answer but cannot prove the model saw the images correctly. Analysis is limited to three attempts, with a 45-second provider timeout and a 90-second recoverable run lease. Run IDs prevent late responses overwriting a newer attempt. The observations are retained privately in `ai_observations`; they do not enter clinic handover. No lead status is changed.
6. The rep panel polls every three seconds without refreshing the page. The phone polls every four seconds. Staff-only previews use signed URLs valid for 60 seconds, renewed every 45 seconds. A restrictive storage policy blocks direct access to this bucket even where older broad policies exist. Clinic users, inactive reps, callers and anonymous users cannot read assessment records or obtain image links.
7. The AI value highlights the existing selector as a suggestion. The confirmed `norwood` state remains empty until the rep taps a number and the audit save succeeds. The existing booking gate and 6–7 expectations prompt remain in place. Saves are serialised so rapid taps cannot leave an older review as the final choice. The AI value is immutable; the rep's final number and revision history are recorded separately.
8. Clinic handover remains unchanged: it receives the existing final Norwood field. No image paths, photos, AI reason or confidence are added to clinic appointments or handover emails.

Link expiry is an access limit, not automatic photo deletion. No photo-retention interval was specified; records/photos remain private for subsequent staff review. A future retention policy should also remove storage objects, including orphaned uploads from interrupted requests.

## Deployment

Apply `supabase/migrations/20261015010000_norwood_photo_assessments.sql` followed by `supabase/migrations/20261015020000_norwood_observation_audit.sql` to the existing Supabase project, then deploy the app through its existing Lovable workflow. The migration expects the existing `booking_sales_actor()` function and current Norwood fields.

The web server needs the existing server-only `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`, plus the existing Supabase URL/publishable key. Do not add secrets to `VITE_*` variables. Optional server-only `NORWOOD_MODEL` changes the model used and recorded for each assessment; benchmark a candidate before selecting it. Optional `NORWOOD_PUBLIC_ORIGIN` overrides the default `https://hairtransplantgroup.lovable.app`; it must be the deployed HTTPS origin serving `/norwood-photo`.

This checkout contains only public Supabase settings. The migration has been tested in isolated PostgreSQL, not applied to production. No real SMS or AI request has been sent during implementation.

## Verification and first personal trial

### Accuracy audit — 15 October 2026

Accuracy remains unmeasured: no live model requests or comparisons against independently clinician-graded cases have been performed. Haiku 4.5 was selected to match the existing call-analysis setup, not because it has demonstrated Norwood grading accuracy. The model's low/medium/high confidence is self-reported and uncalibrated.

The broad stage rubric matches the cited classification, but correct instructions do not establish that the model applies them reliably. A [2025 primary study](https://www.nature.com/articles/s41598-025-23561-3) evaluated a separately trained Mask R-CNN model using controlled photography and did not include stage VII. Its results do not validate this model, prompt or five-selfie workflow.

Before the follow-up improvements, two synthetic probes confirmed the limits of the original safeguards: a non-scalp checkerboard passes the basic darkness/blur filter, and a JSON result pairing stage 7 with a reason describing preserved hairline/crown passes schema validation. These are deliberately constructed inputs, not observed live-model errors. Version 2 now requires explicit regional observations, rejects inconsistent stage/evidence combinations, and uses a reason generated from checked observations. It still depends on the model to recognise anatomy correctly; a checkerboard can still pass the preliminary brightness/blur check. The patient retains the requested provisional number, with an additional calm review message for low-confidence results. Staff are told that confidence is self-reported rather than measured accuracy.

Keep the implementation in testing until the exact deployed image-processing/model/prompt pipeline has been evaluated on consented, independently clinician-graded cases across stages 1–7 and relevant variants. Record exact and within-one-stage agreement, errors crossing the 5/6 boundary, unusable-photo rejection, incorrect high-confidence results and repeatability. Compare candidate models on the same held-out cases before choosing one; a more expensive model or agreement between two models does not itself establish accuracy. A personal trial is useful for usability and one comparison, not an overall accuracy estimate.

Automated checks cover strict JSON, all five angles in one provider request, unusable/truncated responses, photo heuristics, patient response redaction, expiry/revocation, consent, concurrency fencing, retry/upload limits, private storage, role separation and audit history. Existing Norwood threshold tests are retained. TypeScript and production build are checked separately.

Run:

```sh
bun test src/lib/norwood.test.ts src/lib/norwood-assessment.test.ts src/lib/norwood-evidence.test.ts src/lib/norwood-evaluation.test.ts src/utils/norwood-assessment.server.test.ts
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js bun scripts/test-norwood-migration.mjs
bunx tsc --noEmit
bun run build
```

Mobile browser checks used synthetic JPEGs and mocked backend estimates: consent, camera permission fallback, dark-image retake, five ordered uploads, analysis and result copy. Rep browser checks used a mocked status progression: live update, five thumbnails, enlarged image, low-confidence warning and SMS failure. These verify software behaviour, not model performance. A real iPhone/Android camera and a live phone call still need testing.

After deployment, use the existing Peter Test lead, select the intended clinic and send its photo link during a call. Complete the five angles yourself and have a clinician independently assign a stage before showing them the AI result. Confirm/change the rep selector and verify the 6–7 expectations gate. Check that the clinic receives only the final number.

One person's trial tests usability and offers one comparison. To estimate accuracy, use a consented set spanning stages, crown/anterior variants, skin/hair characteristics, phones and lighting, independently graded by clinicians. Track exact agreement, within-one-stage agreement, low-confidence/failed rates and especially errors crossing the 5/6 boundary. Rep agreement is a separate operational measure and is subject to anchoring because the rep sees the AI suggestion first.

Staff-only comparison data is available in `norwood_assessment_comparison`; individual revisions are in `norwood_assessment_reviews`. For an admin's SQL report:

```sql
select model, prompt_version, ai_confidence,
       count(*) as reviewed,
       round(100.0 * avg(exact_agreement::int), 1) as exact_rep_agreement_pct,
       round(100.0 * avg((stage_difference <= 1)::int), 1) as within_one_stage_pct
from public.norwood_assessment_comparison
where reviewed_at is not null
group by model, prompt_version, ai_confidence;
```


## Follow-up evidence search and data acquisition — 15 October 2026

The search covered the clinical grading rubric, original human reliability research, primary hair-loss AI studies, photographic guidance, and datasets on Hugging Face/Kaggle and research repositories. No validation for the exact Haiku model, versioned prompt, and five-selfie capture flow was found. This is a search finding, not a claim that all possible publications have been exhausted.

| Source | What was verified | Applicability and next action |
| --- | --- | --- |
| [Norwood definitions, Innovations Hair Institute](https://dallashairdoctor.com/home/faqs/hair-loss/classification) and [clinical trial protocol, Appendix D](https://cdn.clinicaltrials.gov/large-docs/25/NCT04004325/Prot_000.pdf) | A variants concern the entire frontal border; distinguishing IIa/IIIa formally uses a measured offset before the ear-canal plane. | Prompt now describes the anterior landmarks, avoids invented distances, and treats A estimates conservatively. No conversion from apparent scalp percentage to Norwood. |
| [Xi et al., 2025](https://www.nature.com/articles/s41598-025-23561-3) | Custom Mask R-CNN, clinician annotation, controlled camera/lighting; no stage VII. Data available from corresponding author on reasonable request. | A potential research-data route, but the capture conditions differ. Published segmentation precision is not our staging accuracy. |
| [GATEWAYS, Pediatric Dermatology](https://pmc.ncbi.nlm.nih.gov/articles/PMC13422994/) | GPT-4o used four-view photographs for SALT scoring of alopecia areata. View recognition was imperfect, and score correlation did not mean identical scores. | Different disease, scale and model. Supports measuring view recognition and systematic error; cannot establish Norwood performance. |
| [Image-based hair-disease identification study, 2024](https://www.sciencedirect.com/science/article/pii/S0027968424001160) | Reported performance differences across skin-tone groups for ChatGPT disease identification. | Different task and model; motivates subgroup evaluation, not a numerical prediction of our performance. |
| [HairComb, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9857252/) | A separately developed algorithm estimates hair-loss density across alopecia types. | Density/percentage estimation is not a seven-stage five-selfie Norwood benchmark. |
| [Suh et al., 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12362284/) | ResNet-based binary early-AGA classification from trichoscopy. | Neither ordinary phone photos nor seven-class Norwood staging. |
| [2026 trichoscopy preprint](https://arxiv.org/html/2610.02421v1) | Magnified, calibrated imagery; patient-disjoint splits; formal automated staging was not validated against all clinical labels. Data access subject to approval. | Useful study-design lessons; not interchangeable with phone selfies or evidence of this app's accuracy. |
| [UniDataPro five-view listing](https://huggingface.co/datasets/UniDataPro/hair-loss-male-norwood-scale) | Public viewer has 25 images and five class names, 1–5, although the full commercial offering advertises seven stages. Public licence: CC BY-NC-ND 4.0. | Best matching commercial lead, but public sample omits the important 6/7 classes. Commercial rights, subject grouping, grade provenance and hosted-processing permission need confirmation. No photos downloaded or purchased. |
| [UniqueData listing](https://huggingface.co/datasets/UniqueData/bald_classification) | A commercial 5,000-photo offering with a limited public example, CC BY-ND 4.0 on its card. | Both listings point to UniData; these are not independent suppliers or independent validation evidence. Five-view completeness and clinical labels are not established by the card. |
| [UniData collection case study](https://unidata.pro/cases/alopecia-image-collection-for-medical-research/) | Vendor describes 350 five-view sets, assessor training, medical input and review. | A concrete route to obtaining or commissioning a benchmark. The vendor's quality claims are not an independent audit; confirm clinician credentials and review each label's provenance. |

The supplier enquiry was cancelled at the user's direction on 15 October 2026. No supplier/researcher was contacted and no purchase was made. The listings above are retained as research history only.

## Running the benchmark

`src/utils/norwood-inference.server.ts` is shared by production analysis and `scripts/evaluate-norwood.ts`. This avoids benchmarking a different prompt or parser. It uses the same five JPEG payloads in one request. The runner never sends the reference grade, subject ID, dataset tags or filename to the model. It does not send SMS, create leads, or write production records.

Copy `docs/norwood-benchmark.example.json` outside the repository into private storage with the dataset. The example is intentionally non-runnable until actual rights/provenance and photo paths are provided. Each person appears once, with five distinct photos. Reference `null` means an intentionally ungradable control; synthetic and supplier-only labels remain exploratory even if the model agrees perfectly. Only held-out, blinded, adjudicated references from at least two clinicians enter the clinical section. These are recorded attestations, not automatically verified credentials.

Use the actual JPEG bytes produced by the app's capture pipeline (`jpeg-1536-q88-v1`: longest dimension at most 1536, JPEG quality .88, canvas re-encoding strips EXIF). The manifest records this pipeline; it cannot prove where the files came from. A model-payload benchmark still needs a separate end-to-end phone-capture trial. Do not substitute a schematic Norwood chart, altered patient photos or AI-generated examples for clinical test cases.

Preflight does not call the model:

```sh
bun scripts/evaluate-norwood.ts --manifest /private/dataset/manifest.json --limit 20
```

With a server-side `ANTHROPIC_API_KEY` configured, execute the selected, bounded number of paid requests:

```sh
bun scripts/evaluate-norwood.ts --manifest /private/dataset/manifest.json --output /private/results/haiku-v3.json --limit 20 --repeats 3 --run
```

For model comparison, use `--model` with an available Anthropic vision model ID and a different output file. Keep the cases, bytes, prompt, parser and run count fixed. Select the model using a development set, then freeze the choice before the held-out evaluation. Larger or more expensive models, and agreement between models, are not substitutes for reference labels.

Reports include model/prompt/dataset/image fingerprints, first-run exact and within-one-stage agreement, Wilson 95% intervals, score coverage, missing grades, per-stage and supplied-tag results, severe-boundary mistakes, confidently wrong answers, ungradable-control acceptance, latency and separate repeatability. Refusals/errors are included in the all-case denominator. Repeats do not increase independent sample size. Reports contain no image bytes, image paths, patient names or model free-text reasons. They are written with mode 0600 and refuse to overwrite an existing report.

Before collecting the final benchmark, agree acceptable error rates and sample sizes with the responsible clinician. Include enough independent 6/7 cases to estimate the risk of missing the expectations threshold, and independently sampled phone captures for real-world performance. As a statistical illustration, zero mistakes in 5 cases still has a Wilson 95% upper error bound of about 43%; zero in 100 is about 3.7%. Neither establishes accuracy for an omitted stage or subgroup. The report deliberately never converts a software pass or small sample into a claim of clinical validation.

Current execution status: zero live model requests, zero eligible clinical benchmark cases, no measured accuracy, and no production migration/deployment. This workspace has no configured Anthropic server key or Supabase service key. The prepared code and benchmark can run once authorised data and the existing server credentials are made available through the deployment environment; secrets should not be pasted into chat.

Follow-up verification: 26 focused tests (157 assertions), TypeScript for both the app and evaluation script, production build, and the isolated PostgreSQL migration/access tests passed. Local browser checks verified the new patient uncertainty message and that a failed estimate does not keep spinning. A preflight against five generated striped JPEGs passed with zero network requests; a live invocation stopped at the missing-key check before any model request. These generated files are test fixtures only. The protected `SalesCallPortal.tsx` hash was unchanged during this follow-up; no pitch-deck or unrelated-page changes were made.


## Capture redesign — 16 October 2026

The previous UI automatically started and repeated countdowns, then paused after four rejections. Its empty-camera placeholder could incorrectly say photos were saved even at zero. The replacement removes both behaviours and adds controlled rejection diagnostics.

The opening Hair Profile page, artwork, consent and branding are unchanged. Capture now separates a large original position illustration from a full-size camera view. The user opens the camera, then deliberately starts a 5-second timer (front/sides) or 8-second timer (top/crown). A three-frame burst spans a further 1.3 seconds. There is no microphone, spoken guidance, automatic repeat, or rush into the next pose. Successful saves advance to the next guide, waiting for the patient. Native phone-camera input is available as a fallback.

Each burst is sent in one bounded server-side request. The model evaluates each original independently and chooses a usable frame; the server validates the selected index, anatomy flags and rejection code together, and privately stores only those exact original bytes. There is no second contradictory framing pass. Rejections show one fixed actionable correction. Transport/upload errors retain the same burst in memory for Retry; hiding or leaving clears it. The camera opens from a user gesture, waits for decoded frames, times out at 15 seconds, and releases late streams after cancellation. Every final Norwood estimate still considers all five saved views and retains the existing observation/grade consistency checks and abstention rules.

The [IMI 2024 photography guidance](https://www.imi.org.uk/wp-content/uploads/2024/06/NG_HairLoss_1_0_S.pdf) describes superior hairline, both lateral and crown views for Hamilton–Norwood assessment. It requires hair away from the frontal boundary and the crown centred in its view. This supports collecting complementary anatomy; it does not validate this app's self-photography poses. The extra top view helps expose the bridge between the frontal and vertex regions. The illustrations are original, not copied from the copyrighted guide.

New diagnostics contain only the view, burst count, accepted flag and a controlled problem enum. They contain no images, identifiers, tokens, storage paths or raw model text. The staff readiness check now exercises the actual three-image burst schema with a generated hairline illustration (the existing opening-page artwork) between two grey images; the middle frame must be selected. It also sends the frontal artwork as a crown, which must be rejected. These non-patient fixtures verify service transport, response parsing and basic angle selection, not clinical accuracy. Neither local synthetic-camera tests nor a single personal trial establish agreement with independently graded clinician cases.

Provider schema compatibility was checked against [Anthropic structured-output limits](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#json-schema-limitations): array minItems supports only 0 or 1, and maxItems is unsupported. The sent schema uses minItems 1; the local parser enforces the exact burst length and usable selected index.
