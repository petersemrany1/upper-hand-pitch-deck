
-- ============================================================
-- Phase 1: Re-link any children that currently point at a row we're about to delete
-- ============================================================

-- Ashley and Martin: children pointing at the phantom Western Australia row -> West Perth
UPDATE public.clinics
SET parent_clinic_id = 'c80951af-e4c1-457d-8e82-9fbe521f7771'
WHERE parent_clinic_id = 'c251de15-670a-49cd-a580-667da5664adb';

-- BioCell: children pointing at the phantom NSW row -> Kingsgrove
UPDATE public.clinics
SET parent_clinic_id = '565b6e3b-8816-48ab-8b0e-78b7b84ef9ee'
WHERE parent_clinic_id = 'ec223e55-4c98-464c-8994-f2cdedb89acd';

-- CDSHC: children pointing at the phantom (no-city) row -> Chatswood
UPDATE public.clinics
SET parent_clinic_id = '62f461d4-b4ed-4544-81c4-8b32fd69a94f'
WHERE parent_clinic_id = 'a8bd5a1f-db18-4b3c-9784-0666eb6579db';

-- Gro Clinics: children pointing at the phantom (no-city Gro Clinics) row -> existing 'Gro' Broadbeach
UPDATE public.clinics
SET parent_clinic_id = '185a1600-5ef6-4f8a-a79c-1245082ff106'
WHERE parent_clinic_id = '3d48d5ae-98eb-4c24-aa2d-7e106cef5cf8';

-- Hair and Skin Science: children pointing at any of the four state-only phantoms -> Fitzroy
UPDATE public.clinics
SET parent_clinic_id = 'b9a00670-8aec-48ab-bd99-6951505bd37c'
WHERE parent_clinic_id IN (
  '8b00a555-201b-4cf1-818e-b248e6cfc81b',
  'f744e5f6-1360-4d8d-9255-87da4f1239e9',
  '1e6f2f59-3945-43c2-a8d5-fc9acc930fc0',
  '434e9d84-9bf6-4155-b5be-6c0815c805b9'
);

-- Hair Doctors: children pointing at the phantom (no-city) row -> Bondi Junction
UPDATE public.clinics
SET parent_clinic_id = 'f4acbdf4-d2e4-40e6-98da-fd3d002a6d94'
WHERE parent_clinic_id = 'f99d2714-e6f7-42bf-9a21-01c3e5bd4347';

-- Martinick Hair: children pointing at the phantom NSW row -> Brisbane City
UPDATE public.clinics
SET parent_clinic_id = '0a50ba78-8b47-4f6e-bda2-031fa4580bfe'
WHERE parent_clinic_id = '7b0e1990-4f3f-4b36-a948-41b83625476b';

-- The Crown Clinic: children pointing at the phantom (no-city) row -> Sydney
UPDATE public.clinics
SET parent_clinic_id = '037e6999-a337-4c24-853b-5d0856c25a67'
WHERE parent_clinic_id = '3ef05bdc-8c38-4fc5-b8d8-f978bf2936a4';

-- Darling Downs: children pointing at the phantom (no-city) row -> Cutis Clinic Brisbane (existing parent)
UPDATE public.clinics
SET parent_clinic_id = '312bf494-69d3-43e7-87cb-54fa7fb3d93d'
WHERE parent_clinic_id = 'a0bc6058-69f1-4940-b9e9-3320d9ab4f85';

-- The R Clinic: children pointing at the phantom duplicate -> Belconnen (ACT)
UPDATE public.clinics
SET parent_clinic_id = '949989e3-4c53-4afe-b31c-43b68ca79e0c'
WHERE parent_clinic_id = 'f0a2d287-ff28-4b27-a9ae-284399694d1e';

-- ============================================================
-- Phase 2: Set correct flagships (HQs) per chain
-- ============================================================

-- Ashley and Martin: West Perth is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = 'c80951af-e4c1-457d-8e82-9fbe521f7771';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = 'c80951af-e4c1-457d-8e82-9fbe521f7771' WHERE id IN ('fdd1b76e-44a0-412e-8631-a528b8dd167c','f27972d6-f6ba-4fd8-bade-75f638d03678');

-- BioCell: Kingsgrove is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = '565b6e3b-8816-48ab-8b0e-78b7b84ef9ee';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = '565b6e3b-8816-48ab-8b0e-78b7b84ef9ee' WHERE id = 'd7a50f27-fa49-4861-a321-aad60f1b9d0e';

-- Brisbane Hair Transplant: Springwood is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = 'ba8d1cb3-5cb6-4009-838c-3c4289cf6c8c';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = 'ba8d1cb3-5cb6-4009-838c-3c4289cf6c8c' WHERE id = '8ee632a7-7e03-4ea6-b04e-c31e3e59e9dd';

-- CDSHC: Chatswood is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = '62f461d4-b4ed-4544-81c4-8b32fd69a94f';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = '62f461d4-b4ed-4544-81c4-8b32fd69a94f' WHERE id IN ('31624b9b-922c-425a-bb86-85973a4bd9d8','91c2474d-0ec9-446d-b795-80375054266f');

-- The Crown Clinic: Sydney is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = '037e6999-a337-4c24-853b-5d0856c25a67';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = '037e6999-a337-4c24-853b-5d0856c25a67' WHERE id = '00aa1c33-8ece-4c95-9864-1b053a04c470';

-- Evolved Hair Clinic: South Perth is HQ (already), make sure Brisbane row links
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = 'b1570e1e-cc0b-4e3e-bc69-c6c6eeac9c54';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = 'b1570e1e-cc0b-4e3e-bc69-c6c6eeac9c54' WHERE id IN ('7188cf20-8c1d-4d58-9dfa-330618202c8f','a0da5912-7583-4983-92b3-4efb1d70b153');

-- Gro Clinics: Broadbeach (the "Gro" row) is HQ; rename it to "Gro Clinics" for consistency
UPDATE public.clinics SET clinic_name = 'Gro Clinics', is_parent = TRUE, parent_clinic_id = NULL          WHERE id = '185a1600-5ef6-4f8a-a79c-1245082ff106';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = '185a1600-5ef6-4f8a-a79c-1245082ff106' WHERE id IN ('957026f4-3433-4ace-898a-148dc01cf69b','d810b79a-e972-4765-a5b8-3828d87685c7','d31ced75-e2e1-4337-a885-7c8c5b204557');

-- Hair and Skin Science: Fitzroy is HQ; Canberra branch links to it
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = 'b9a00670-8aec-48ab-bd99-6951505bd37c';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = 'b9a00670-8aec-48ab-bd99-6951505bd37c' WHERE id = 'b54ec365-2e75-4997-b772-cbcfe0e29822';

-- Hair Doctors: Bondi Junction is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = 'f4acbdf4-d2e4-40e6-98da-fd3d002a6d94';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = 'f4acbdf4-d2e4-40e6-98da-fd3d002a6d94' WHERE id = 'd8adb818-af25-405c-9e5b-e92a09aa3563';

-- Martinick Hair: Brisbane City is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = '0a50ba78-8b47-4f6e-bda2-031fa4580bfe';

-- The Knudsen Clinic: Toowong stays HQ; link Dr Russell Knudsen Double Bay row in too
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = '4778c880-b260-41d4-863c-4dbdc7ee147f';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = '4778c880-b260-41d4-863c-4dbdc7ee147f' WHERE id IN ('b112f3f0-57c9-48c6-b653-513f4089d2f6','ced6c60a-899f-4ab8-888e-e47c197dae5e','7219eb56-0cac-4796-bf7f-3201c9dcba74');

-- The Medical Hair Institute: North Adelaide is HQ (was wrongly pointing at "Medical Cosmetic Centre")
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = 'a19c42a8-352b-4e4e-b725-682ccb9ff734';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = 'a19c42a8-352b-4e4e-b725-682ccb9ff734' WHERE id = 'c05c47dd-4f58-4b7b-873f-29a88f9a7579';

-- The R Clinic: Belconnen (ACT) is HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = '949989e3-4c53-4afe-b31c-43b68ca79e0c';

-- Darling Downs: Cutis Clinic Brisbane (existing parent) keeps HQ
UPDATE public.clinics SET is_parent = TRUE,  parent_clinic_id = NULL                                     WHERE id = '312bf494-69d3-43e7-87cb-54fa7fb3d93d';
UPDATE public.clinics SET is_parent = FALSE, parent_clinic_id = '312bf494-69d3-43e7-87cb-54fa7fb3d93d' WHERE id IN ('47e85275-639a-458f-9b43-b63e061049e6','3d49e98b-54cb-4f77-930b-4e3645566122');

-- ============================================================
-- Phase 3: Delete the 16 phantom rows
-- ============================================================
DELETE FROM public.clinics
WHERE id IN (
  'c251de15-670a-49cd-a580-667da5664adb', -- Ashley and Martin (no city)
  '0daf1848-5eac-4f1e-b364-189fabaea223', -- Australian Hair Concierge (no city/state)
  'ec223e55-4c98-464c-8994-f2cdedb89acd', -- BioCell (no city)
  'a8bd5a1f-db18-4b3c-9784-0666eb6579db', -- CDSHC (no city — old parent)
  'a0bc6058-69f1-4940-b9e9-3320d9ab4f85', -- Darling Downs (no city)
  'e38c0745-b69d-4d8b-8952-68f3f1d7b0f7', -- Elite Hair Clinic (no city/state)
  '3d48d5ae-98eb-4c24-aa2d-7e106cef5cf8', -- Gro Clinics (no city)
  '8b00a555-201b-4cf1-818e-b248e6cfc81b', -- HSS WA placeholder
  'f744e5f6-1360-4d8d-9255-87da4f1239e9', -- HSS VIC placeholder
  '1e6f2f59-3945-43c2-a8d5-fc9acc930fc0', -- HSS NSW placeholder
  '434e9d84-9bf6-4155-b5be-6c0815c805b9', -- HSS QLD placeholder
  '9558a547-8642-427c-97ce-786f4ccb90f2', -- HSS Canberra duplicate
  'f99d2714-e6f7-42bf-9a21-01c3e5bd4347', -- Hair Doctors (no city)
  '7b0e1990-4f3f-4b36-a948-41b83625476b', -- Martinick (no city)
  '3ef05bdc-8c38-4fc5-b8d8-f978bf2936a4', -- The Crown Clinic (no city — old parent)
  'f0a2d287-ff28-4b27-a9ae-284399694d1e'  -- The R Clinic duplicate
);
