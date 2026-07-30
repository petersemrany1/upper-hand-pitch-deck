INSERT INTO public.clinicflow_clinic_settings (clinic_id, logo_url)
VALUES
 ('97f42d54-5034-4935-a4a8-1feb5b8def79','97f42d54-5034-4935-a4a8-1feb5b8def79/logo-bijan.png'),
 ('d43dfd17-ecc5-4ec9-95ad-2427f4bdf425','d43dfd17-ecc5-4ec9-95ad-2427f4bdf425/logo-byron.png'),
 ('086c8283-756a-4e10-a341-a6b9f5cf6d33','086c8283-756a-4e10-a341-a6b9f5cf6d33/logo-nitai.jpg')
ON CONFLICT (clinic_id) DO UPDATE SET logo_url = EXCLUDED.logo_url;