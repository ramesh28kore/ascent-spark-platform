DROP POLICY IF EXISTS "Students start own attempts" ON public.test_attempts;
CREATE POLICY "Students start own attempts"
ON public.test_attempts FOR INSERT TO authenticated
WITH CHECK (
  student_id IN (SELECT private.my_profile_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_attempts.test_id
      AND t.published
      AND (t.ends_at IS NULL OR now() <= t.ends_at)
  )
);

DROP POLICY IF EXISTS "Students read items of live attempt" ON public.test_items;
CREATE POLICY "Students read items of live attempt"
ON public.test_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.test_attempts a
    JOIN public.tests t ON t.id = a.test_id
    WHERE a.test_id = test_items.test_id
      AND a.student_id IN (SELECT private.my_profile_ids(auth.uid()))
      AND a.submitted_at IS NULL
      AND t.published
  )
);