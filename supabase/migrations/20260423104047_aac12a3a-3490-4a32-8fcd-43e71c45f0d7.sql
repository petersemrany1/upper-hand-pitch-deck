ALTER TABLE public.sent_links ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE POLICY "Authenticated delete sent_links"
ON public.sent_links
FOR DELETE
TO authenticated
USING (true);