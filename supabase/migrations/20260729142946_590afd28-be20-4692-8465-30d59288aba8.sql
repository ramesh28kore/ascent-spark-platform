CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'trainer'))
WITH CHECK ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Trainers insert profiles" ON public.profiles;
CREATE POLICY "Trainers insert profiles" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Trainers delete profiles" ON public.profiles;
CREATE POLICY "Trainers delete profiles" ON public.profiles FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Trainers write modules" ON public.modules;
CREATE POLICY "Trainers write modules" ON public.modules FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'trainer')) WITH CHECK (private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Trainers write topics" ON public.module_topics;
CREATE POLICY "Trainers write topics" ON public.module_topics FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'trainer')) WITH CHECK (private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Trainers write assessments" ON public.assessments;
CREATE POLICY "Trainers write assessments" ON public.assessments FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'trainer')) WITH CHECK (private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Students read own scores" ON public.scores;
CREATE POLICY "Students read own scores" ON public.scores FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'trainer') OR (student_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())));

DROP POLICY "Trainers write scores" ON public.scores;
CREATE POLICY "Trainers write scores" ON public.scores FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'trainer')) WITH CHECK (private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Trainers write questions" ON public.questions;
CREATE POLICY "Trainers write questions" ON public.questions FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'trainer')) WITH CHECK (private.has_role(auth.uid(), 'trainer'));

DROP POLICY "Trainers write coding problems" ON public.coding_problems;
CREATE POLICY "Trainers write coding problems" ON public.coding_problems FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'trainer')) WITH CHECK (private.has_role(auth.uid(), 'trainer'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);