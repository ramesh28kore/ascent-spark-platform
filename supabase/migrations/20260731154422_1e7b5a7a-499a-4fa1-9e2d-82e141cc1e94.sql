
-- Content reader: any signed-in user who is NOT an admin-only account.
CREATE OR REPLACE FUNCTION private.is_content_reader(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
     );
$$;

REVOKE ALL ON FUNCTION private.is_content_reader(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_content_reader(uuid) TO authenticated, service_role;

-- Replace the blanket "any signed-in user" reads with content-reader reads.
DROP POLICY IF EXISTS "Signed in reads announcements" ON public.announcements;
CREATE POLICY "Signed in reads announcements" ON public.announcements
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Everyone signed in reads assessments" ON public.assessments;
CREATE POLICY "Everyone signed in reads assessments" ON public.assessments
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Signed in reads batches" ON public.batches;
CREATE POLICY "Signed in reads batches" ON public.batches
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Everyone signed in reads coding problems" ON public.coding_problems;
CREATE POLICY "Everyone signed in reads coding problems" ON public.coding_problems
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Signed in reads discussion" ON public.discussion_posts;
CREATE POLICY "Signed in reads discussion" ON public.discussion_posts
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Everyone signed in reads topics" ON public.module_topics;
CREATE POLICY "Everyone signed in reads topics" ON public.module_topics
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Everyone signed in reads modules" ON public.modules;
CREATE POLICY "Everyone signed in reads modules" ON public.modules
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Signed in reads practice problems" ON public.practice_problems;
CREATE POLICY "Signed in reads practice problems" ON public.practice_problems
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Everyone signed in reads questions" ON public.questions;
CREATE POLICY "Everyone signed in reads questions" ON public.questions
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Signed in reads resources" ON public.resources;
CREATE POLICY "Signed in reads resources" ON public.resources
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Signed in reads rubrics" ON public.rubrics;
CREATE POLICY "Signed in reads rubrics" ON public.rubrics
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Signed in reads sessions" ON public.sessions;
CREATE POLICY "Signed in reads sessions" ON public.sessions
  FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Read published or staff tests" ON public.tests;
CREATE POLICY "Read published or staff tests" ON public.tests
  FOR SELECT TO authenticated
  USING ((published AND private.is_content_reader(auth.uid())) OR private.can_view_all(auth.uid()));

-- Credential settings are a super-admin surface only.
DROP POLICY IF EXISTS "Staff can view credential settings" ON public.credential_settings;
CREATE POLICY "Admins can view credential settings" ON public.credential_settings
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));
