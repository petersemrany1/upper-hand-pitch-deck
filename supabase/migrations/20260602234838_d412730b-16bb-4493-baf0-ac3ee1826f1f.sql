-- 1. CONTENT: the 9-stage call (+ mindset)
CREATE TABLE IF NOT EXISTS public.call_stages (
  stage_no   int PRIMARY KEY,
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  band       text NOT NULL,
  tag        text NOT NULL,
  job        text NOT NULL,
  say_text   text,
  moves      jsonb NOT NULL DEFAULT '[]'::jsonb,
  move_on    text,
  never_do   text,
  gun_tell   text,
  notes      text
);

GRANT SELECT ON public.call_stages TO authenticated;
GRANT ALL ON public.call_stages TO service_role;

ALTER TABLE public.call_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read stages" ON public.call_stages
  FOR SELECT TO authenticated USING (true);

-- 2. CONTENT: the scorecard
CREATE TABLE IF NOT EXISTS public.scorecard_dimensions (
  dim_no     int PRIMARY KEY,
  name       text NOT NULL,
  points     int NOT NULL,
  miss_desc  text NOT NULL,
  gun_desc   text NOT NULL
);

GRANT SELECT ON public.scorecard_dimensions TO authenticated;
GRANT ALL ON public.scorecard_dimensions TO service_role;

ALTER TABLE public.scorecard_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read scorecard" ON public.scorecard_dimensions
  FOR SELECT TO authenticated USING (true);

-- 3. PROGRESS: one row per rep per module
CREATE TABLE IF NOT EXISTS public.rep_module_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_slug     text NOT NULL DEFAULT 'sales-framework',
  hill_done       boolean NOT NULL DEFAULT false,
  beats_done      boolean NOT NULL DEFAULT false,
  drill_done      boolean NOT NULL DEFAULT false,
  seen_beats      jsonb   NOT NULL DEFAULT '[]'::jsonb,
  module_complete boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_module_progress TO authenticated;
GRANT ALL ON public.rep_module_progress TO service_role;

ALTER TABLE public.rep_module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own progress read" ON public.rep_module_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own progress insert" ON public.rep_module_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress update" ON public.rep_module_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- SEED — 10 stages (mindset + 9 beats)
INSERT INTO public.call_stages (stage_no, slug, name, band, tag, job, say_text, moves, move_on, never_do, gun_tell, notes) VALUES
(0, 'mindset', 'Mindset', 'mind', 'Always on',
 'Get your head right before you dial.',
 'I''m here to help this person, not sell them. They''ve been putting this off for years — getting them sorted is the help.',
 '["I''m here to help, not to sell — they enquired, I''m following up","They''ve been putting this off for years; leaving them stuck is the failure","Objections are reflexes — I will not consider them","It''s now or never: hundreds of leads, I''m not getting back to them later","I''m the calm one — slow, warm, certain. An advisor."]'::jsonb,
 'Wraps every call.', 'Dial scared. Treat a callback as a win.', 'Calm, certain, unbothered by the brush-off.', NULL),

(1, 'opening', 'Opening', 'climb', 'Act 1 · beat 1',
 'Buy time. Don''t get hung up on.',
 'Hey {{first name}} … (pause) … it''s {{rep}} from Hair Transplant Group, how are you? You made a Facebook enquiry about a hair transplant, so I wanted to call you straight away — if I don''t call now I won''t get back to you later, it''s so busy today. So — what''s going on with your hair situation?',
 '["Name -> PAUSE -> who you are -> their enquiry -> preempt the callback -> open question","The pause earns an automatic ''good'' and proves you''re not spam"]'::jsonb,
 'They engage, or confirm the enquiry.',
 'Bulldoze it as one robotic sentence; accept a scheduled callback.',
 'Talking within 20 seconds, no sell-feel.',
 'Callback handler: "That''s not a problem at all — I know you weren''t expecting my call. Do you have just one minute now, just to see if it even makes sense for me to call you back later?"'),

(2, 'discovery', 'Discovery', 'climb', 'Act 1 · beat 2',
 'Get them talking. Clinical -> emotional. Get the WHY NOW.',
 'So — what''s going on with your hair situation? … then keep pulling: "tell me more about that."',
 '["Clinical first: where (hairline -> temples -> crown), how long, hereditary?","The map: hairline -> temples -> crown -> density -> shedding -> donor (''let''s have a close look at the back and sides'')","WHY NOW (critical): ''What''s made you look into this now?'' — wedding, photo, milestone. This fuels the Audiobook moment.","Emotional pivot, after the clinical: ''How does that actually make you feel?''","ECHO everything back and dig in — never a checklist"]'::jsonb,
 'You''ve got why-now, history, the map, the impact, and their dream outcome.',
 'Run a checklist (''okay, gotcha''); ask yes/no questions; give the price.',
 'Prospect talks 70%+ and you''ve captured a specific why-now scene.', NULL),

(3, 'amplification', 'Amplification', 'climb', 'Act 1 · beat 3',
 'Feed all the pain back in ONE sentence.',
 'So — you''ve got the thinning at the crown and the receding corners, it runs in the family, you''ve put up with it for about {{years}} years, it''s slowly getting worse, you''ve tried {{tried}} with no luck — is that right?',
 '["One concentrated sentence, not a paragraph","End on ''is that right?'' and wait for the yes"]'::jsonb,
 'A clear ''yes, that''s right.''',
 'Invent pain they didn''t give you; ramble; rush past ''is that right?''',
 'They go quiet or say ''yeah… exactly'' — they feel heard, not pitched.', NULL),

(4, 'education', 'Education', 'climb', 'Act 1 · beat 4',
 'Teach the fix and give a breather. Ask first, then fill the gaps. Show, don''t tell.',
 'What do you know about hair transplants? … (then fill the gaps only)',
 '["Knowledge check first, then fill gaps — don''t lecture","Grafts from the permanent donor zone -> never falls out -> your own real hair, for life","Natural vs un-natural: angle and direction is the whole game; done right, even your barber can''t tell","Donor = a garden: strong grass over bare dirt, finite, and the bare patch slowly spreads","Send photos while you talk: natural-vs-unnatural + before/afters","Eligibility framing: the real question is whether you''re a good candidate — that''s the assessment"]'::jsonb,
 'They can explain back, in their own words, why it works for them.',
 'Lecture; skip the understanding check; leak the price.',
 '''Oh, so it''s actually my own hair'' — the penny dropped, in their words.', NULL),

(5, 'audiobook', 'Audiobook Moment', 'peak', 'The peak · the sigh',
 'Make them SEE their future in one sentence — then STOP. This is where the sale happens.',
 'I could talk grafts and angles all day — but what I''m really saying is: picture {{why-now scene}} … you run your hand through your hair without a second thought … how would that actually make you feel?',
 '["Use their why-now scene and their exact words — they wrote this script in Discovery","Specific and sensory, never abstract or cheesy","Then STOP. The silence is working for you."]'::jsonb,
 'You hear it — the exhale, the quiet ''yeah'', the voice change. That''s the sale.',
 'Speak into the silence; go abstract (''imagine having great hair'').',
 'The sigh.', NULL),

(6, 'commitment', 'Commitment', 'paper', 'Act 2 · beat 5',
 'Lock the yes with an open question — then presume the booking.',
 'So — where are you at with all of this? Is it something you want to get sorted now?',
 '["Open question — let them tell you where they''re at","On ''yes'', presume the booking: ''Fantastic — I want to get you in with Dr X…''"]'::jsonb,
 'They say they want it.',
 '''Would you like to book?''; ''want to think about it?''; ''no pressure''; and NEVER the parachute ''are you just gathering info?''',
 'Treats the yes as done and rolls straight into the specialist with no hesitation.', NULL),

(7, 'price-specialist', 'Price & The Specialist', 'paper', 'Act 2 · beat 6',
 'Frame the value, name the specialist in THEIR words, walk the price journey, then stop.',
 'That''ll be with {{Dr X}}, one of our senior specialists — and based on what you told me about {{their words}}, she''s exactly the right person for you. The consult includes a full assessment, hair design and imaging. Normally $395 … we do have some complimentary spots … there''s just a $75 deposit to secure it … fully refunded the moment you arrive … we do this because we turn people away. Does that sound fair?',
 '["Locate them -> book the CLOSEST clinic (so they show better)","Name the senior specialist + a reason in their exact words","Price journey in order: includes -> $395 -> complimentary -> $75 -> refunded -> we turn people away -> ''sound fair?''","STOP after ''does that sound fair?''"]'::jsonb,
 'They accept (''yeah, that''s fair'').',
 'Fill the silence after ''sound fair?''; slip back into selling — they''ve already bought.',
 'The specialist reason quotes their own words back; the rep goes silent and waits.', NULL),

(8, 'finance', 'Finance Check', 'paper', 'Act 2 · beat 7',
 'Six quick questions, framed as zero-commitment.',
 'One of our policies is to find every payment option for you — six quick questions, no commitment, won''t touch your credit rating. Most people use it. Shall I run it now?',
 '["Questions: full name · citizen/PR · earning $50k+ · not bankrupt · DOB · home owner","Approved -> celebrate the mini-win before moving on"]'::jsonb,
 'Result in hand (tick / X).',
 'Present it as a big scary application.',
 'Celebrates the approval as a win, then moves.', NULL),

(9, 'deposit-book', 'Deposit & Book', 'paper', 'Act 2 · beat 8',
 'Lock the date and take the $75 before they hang up.',
 'Perfect — let me lock you in. I''m sending the secure $75 to your phone now, refunded the second you arrive. Did it come through?',
 '["The $75 is a commitment device — psychology, not money. Once paid, they show.","Confirm closest clinic, gender, funding, date, time"]'::jsonb,
 'Payment through = booked. Breathe, then dial the next.',
 'Let them off without a date — if you can''t get one, book the follow-up call before they go.',
 'Deposit taken and date confirmed in one breath, no wobble.', NULL)
ON CONFLICT (stage_no) DO UPDATE SET
  slug=EXCLUDED.slug, name=EXCLUDED.name, band=EXCLUDED.band, tag=EXCLUDED.tag,
  job=EXCLUDED.job, say_text=EXCLUDED.say_text, moves=EXCLUDED.moves,
  move_on=EXCLUDED.move_on, never_do=EXCLUDED.never_do, gun_tell=EXCLUDED.gun_tell, notes=EXCLUDED.notes;

INSERT INTO public.scorecard_dimensions (dim_no, name, points, miss_desc, gun_desc) VALUES
(1,  'Opening & adherence',        10, 'Bulldozed it or accepted a callback',            'Name+pause earned ''good'', talking in 20s, callback handled'),
(2,  'Discovery + why-now',        15, 'No why-now; shallow; gave the price',            'Specific why-now scene captured; clinical -> emotional done'),
(3,  'Echoing / listening',        15, 'Ran a checklist (''okay, gotcha'')',               'Handed words back, dug in, prospect felt heard'),
(4,  'Amplification',               8, 'Skipped it or rambled',                          'One concentrated sentence -> a clear yes'),
(5,  'Education',                   8, 'Lectured; leaked price; no photos',              'Asked-then-filled; sent photos; checked understanding'),
(6,  'Audiobook / the sigh',       14, 'Abstract or cheesy; talked over the silence',    'Their scene in their words; stopped; got the exhale'),
(7,  'Commitment',                  5, 'Used a yes/no close or the parachute',           'Open question; presumed the yes'),
(8,  'Price & specialist',         10, 'Generic specialist; wrong order; filled silence','Specialist tied to their words; price journey in order; stopped'),
(9,  'Close: deposit & booking',    5, 'No date; no deposit',                            '$75 taken + date locked, closest clinic'),
(10, 'Tonality & control',         10, 'Robotic, pushy, or lost control',                'Calm advisor, not corny, kept control without bulldozing')
ON CONFLICT (dim_no) DO UPDATE SET
  name=EXCLUDED.name, points=EXCLUDED.points, miss_desc=EXCLUDED.miss_desc, gun_desc=EXCLUDED.gun_desc;