DO $migration$
DECLARE
  parent_id uuid;
BEGIN
  -- Generic helper inlined per chain. Strategy:
  --   1. Find the shortest-named existing row matching any pattern -> parent.
  --   2. If none, insert a parent using the first pattern (with % stripped).
  --   3. Set is_parent = true and apply doctor/owner/address (only when provided).
  --   4. Link all other matching rows via parent_clinic_id.
  -- Idempotent: re-running converges to the same state.

  -- ============ CHAIN 1: Hair and Skin Science ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Hair and Skin Science%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, owner_name, address, is_parent, status)
    VALUES ('Hair and Skin Science', 'Royce Newton',
            'Level 7, Suite 12, 428 George St, Sydney NSW 2000', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      owner_name = 'Royce Newton',
      address = 'Level 7, Suite 12, 428 George St, Sydney NSW 2000'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'Hair and Skin Science%';

  -- ============ CHAIN 2: Martinick / New Hair Clinic ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Martinick%' OR c.clinic_name ILIKE 'New Hair Clinic%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, address, is_parent, status)
    VALUES ('Martinick Hair Restoration', 'Dr Jennifer Martinick',
            'Suite 1, 21 Stirling Hwy, Nedlands WA 6009', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Jennifer Martinick',
      address = 'Suite 1, 21 Stirling Hwy, Nedlands WA 6009'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id
     AND (clinic_name ILIKE 'Martinick%' OR clinic_name ILIKE 'New Hair Clinic%');

  -- ============ CHAIN 3: Knudsen ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE '%Knudsen%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, address, is_parent, status)
    VALUES ('Knudsen Clinic', 'Dr Russell Knudsen',
            'Level 2, 45A Bay St, Double Bay NSW 2028', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Russell Knudsen',
      address = 'Level 2, 45A Bay St, Double Bay NSW 2028'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE '%Knudsen%';

  -- ============ CHAIN 4: Ashley and Martin ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Ashley and Martin%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, address, is_parent, status)
    VALUES ('Ashley and Martin', 'Dr Mario Terri (Medical Director)',
            '640 Murray St, West Perth WA 6005', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Mario Terri (Medical Director)',
      address = '640 Murray St, West Perth WA 6005'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'Ashley and Martin%';

  -- ============ CHAIN 5: Gro (with note) ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Gro%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, owner_name, address, notes, is_parent, status)
    VALUES ('Gro Clinics', 'Owner / Director',
            'Suite 4, Level 6, 75 Crown St, Woolloomooloo NSW 2011',
            'In administration (2024) — confirm owner', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      owner_name = 'Owner / Director',
      address = 'Suite 4, Level 6, 75 Crown St, Woolloomooloo NSW 2011',
      notes = CASE
        WHEN notes IS NULL OR notes = '' THEN 'In administration (2024) — confirm owner'
        WHEN notes ILIKE '%In administration (2024)%' THEN notes
        ELSE notes || E'\n' || 'In administration (2024) — confirm owner'
      END
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'Gro%';

  -- ============ CHAIN 6: Darling Downs / Cutis ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Darling Downs%' OR c.clinic_name ILIKE 'Cutis Clinic%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, address, is_parent, status)
    VALUES ('Cutis Clinic', 'Dr Omi Jiindal',
            'Suite 1/15, 181 Clarence Rd, Indooroopilly QLD 4068', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Omi Jiindal',
      address = 'Suite 1/15, 181 Clarence Rd, Indooroopilly QLD 4068'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id
     AND (clinic_name ILIKE 'Darling Downs%' OR clinic_name ILIKE 'Cutis Clinic%');

  -- ============ CHAIN 7: Medical Hair Institute / Medical Cosmetic Centre ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'The Medical Hair Institute%'
      OR c.clinic_name ILIKE 'Medical Cosmetic Centre%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, address, is_parent, status)
    VALUES ('The Medical Hair Institute', 'Dr Matthew Holman',
            '1 Jamison St, Sydney NSW 2000', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Matthew Holman',
      address = '1 Jamison St, Sydney NSW 2000'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id
     AND (clinic_name ILIKE 'The Medical Hair Institute%'
       OR clinic_name ILIKE 'Medical Cosmetic Centre%');

  -- ============ CHAIN 8: Evolved Hair Clinic (no address) ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Evolved Hair Clinic%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, is_parent, status)
    VALUES ('Evolved Hair Clinic', 'Dr Kristy Truong & Dr Anita Cottee', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Kristy Truong & Dr Anita Cottee'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'Evolved Hair Clinic%';

  -- ============ CHAIN 9: Hair Doctors (no address) ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Hair Doctors%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, is_parent, status)
    VALUES ('Hair Doctors', 'Dr Ateka Khan / Dr Callum', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Ateka Khan / Dr Callum'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'Hair Doctors%';

  -- ============ CHAIN 10: Medihair ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Medihair%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, address, is_parent, status)
    VALUES ('Medihair', 'Dr Mario Marzola',
            'Suite 703, 1 Queens Rd, Melbourne VIC 3004', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Mario Marzola',
      address = 'Suite 703, 1 Queens Rd, Melbourne VIC 3004'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'Medihair%';

  -- ============ CHAIN 11: Brisbane Hair Transplant Clinic ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Brisbane Hair Transplant Clinic%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, is_parent, status)
    VALUES ('Brisbane Hair Transplant Clinic', 'Dr Raj Selvarajan', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Raj Selvarajan'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'Brisbane Hair Transplant Clinic%';

  -- ============ CHAIN 12: Sydney Hair Transplant / Dr Jassim Daood ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'Sydney Hair Transplant%' OR c.clinic_name ILIKE 'Dr Jassim Daood%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, is_parent, status)
    VALUES ('Sydney Hair Transplant', 'Dr Jassim Daood', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Jassim Daood'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id
     AND (clinic_name ILIKE 'Sydney Hair Transplant%' OR clinic_name ILIKE 'Dr Jassim Daood%');

  -- ============ CHAIN 13: The R Clinic ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'The R Clinic%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, is_parent, status)
    VALUES ('The R Clinic', 'Dr Wen-Shan Sung', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Wen-Shan Sung'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'The R Clinic%';

  -- ============ CHAIN 14: BioCell ============
  SELECT c.id INTO parent_id FROM public.clinics c
   WHERE c.clinic_name ILIKE 'BioCell%'
   ORDER BY length(c.clinic_name), c.created_at LIMIT 1;
  IF parent_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, doctor_name, is_parent, status)
    VALUES ('BioCell', 'Dr Ken', true, 'Not Started')
    RETURNING id INTO parent_id;
  ELSE
    UPDATE public.clinics SET is_parent = true,
      doctor_name = 'Dr Ken'
     WHERE id = parent_id;
  END IF;
  UPDATE public.clinics SET parent_clinic_id = parent_id
   WHERE id <> parent_id AND clinic_name ILIKE 'BioCell%';

  -- ============ STANDALONES — set doctor_name only when null ============
  UPDATE public.clinics SET doctor_name = 'Dr Cameron Keating'
   WHERE doctor_name IS NULL AND clinic_name ILIKE 'Hobart Hair Lab%';
  UPDATE public.clinics SET doctor_name = 'Dr Andrew Kim'
   WHERE doctor_name IS NULL AND clinic_name ILIKE 'Australian Institute of Hair Restoration%';
  UPDATE public.clinics SET doctor_name = 'Dr Wayne Young'
   WHERE doctor_name IS NULL AND clinic_name ILIKE 'Young Hair Restoration%';
  UPDATE public.clinics SET doctor_name = 'Dr Weymouth & Dr Salerno'
   WHERE doctor_name IS NULL AND clinic_name ILIKE 'Restore Clinic%';
  UPDATE public.clinics SET doctor_name = 'Amy (co-founder)'
   WHERE doctor_name IS NULL AND clinic_name ILIKE 'The Follicle Experts%';
  UPDATE public.clinics SET doctor_name = 'Kate Dawes'
   WHERE doctor_name IS NULL AND clinic_name ILIKE 'Medical Hair Restoration Australia%';
  UPDATE public.clinics SET doctor_name = 'Dr Mo Khairy Mosa'
   WHERE doctor_name IS NULL AND clinic_name ILIKE 'DR MO%';
  UPDATE public.clinics SET owner_name = 'Tema Wiguna & Karson Bagot'
   WHERE owner_name IS NULL AND clinic_name ILIKE 'Krownd%';

  -- ============ STATUS = Not Applicable ============
  UPDATE public.clinics SET status = 'Not Applicable'
   WHERE status <> 'Not Applicable'
     AND (
          clinic_name ILIKE 'ICCM%'
       OR clinic_name ILIKE 'The Crown Clinic%'
       OR clinic_name ILIKE 'Australian Hair Concierge%'
       OR clinic_name ILIKE 'CosMediTour%'
       OR clinic_name ILIKE 'The Shadow Clinic%'
       OR clinic_name ILIKE 'Platinum Hair Solutions%'
       OR clinic_name ILIKE 'Fierce Hair Growth%'
       OR clinic_name ILIKE 'Eyebrow Hair Transplant%'
       OR clinic_name ILIKE 'Australian Trichology Centre%'
       OR clinic_name ILIKE 'Hair and Scalp Solutions%'
       OR clinic_name ILIKE 'Woden Dermatology%'
       OR clinic_name ILIKE 'The Skin Hospital%'
       OR clinic_name ILIKE 'hairlogica%'
       OR clinic_name ILIKE 'Rejuvenative%'
       OR clinic_name ILIKE 'Precision Hair Works%'
     );
END
$migration$;