-- helpers ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('trainer','admin'));
$$;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.can_view_all(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('trainer','admin','placement'));
$$;
REVOKE ALL ON FUNCTION private.can_view_all(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_view_all(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.my_profile_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id;
$$;
REVOKE ALL ON FUNCTION private.my_profile_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_profile_ids(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- enums ------------------------------------------------------------------
CREATE TYPE public.session_status AS ENUM ('planned','conducted','cancelled');
CREATE TYPE public.practice_status AS ENUM ('todo','attempted','solved');

-- batches ----------------------------------------------------------------
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  academic_year text NOT NULL DEFAULT '2025-26',
  branch text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads batches" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write batches" ON public.batches FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER trg_batches_updated BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;

INSERT INTO public.batches (name, academic_year)
SELECT DISTINCT p.batch, '2025-26' FROM public.profiles p
WHERE p.batch IS NOT NULL AND btrim(p.batch) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE public.profiles p SET batch_id = b.id FROM public.batches b
WHERE p.batch = b.name AND p.batch_id IS NULL;

-- sessions ---------------------------------------------------------------
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.module_topics(id) ON DELETE SET NULL,
  trainer_id uuid,
  trainer_name text,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  duration_min integer NOT NULL DEFAULT 90,
  status public.session_status NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads sessions" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write sessions" ON public.sessions FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_sessions_batch_time ON public.sessions (batch_id, scheduled_at);

-- attendance -------------------------------------------------------------
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or all attendance" ON public.attendance FOR SELECT TO authenticated
  USING (private.can_view_all(auth.uid()) OR student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Staff write attendance" ON public.attendance FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE INDEX idx_attendance_student ON public.attendance (student_id);

-- tests ------------------------------------------------------------------
CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  duration_min integer NOT NULL DEFAULT 30,
  shuffle boolean NOT NULL DEFAULT true,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published or staff tests" ON public.tests FOR SELECT TO authenticated
  USING (published OR private.can_view_all(auth.uid()));
CREATE POLICY "Staff write tests" ON public.tests FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER trg_tests_updated BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.test_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  marks integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (test_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_items TO authenticated;
GRANT ALL ON public.test_items TO service_role;
ALTER TABLE public.test_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads test items" ON public.test_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write test items" ON public.test_items FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  blur_count integer NOT NULL DEFAULT 0,
  UNIQUE (test_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or all attempts" ON public.test_attempts FOR SELECT TO authenticated
  USING (private.can_view_all(auth.uid()) OR student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Students manage own attempts" ON public.test_attempts FOR ALL TO authenticated
  USING (student_id IN (SELECT private.my_profile_ids(auth.uid())))
  WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Staff write attempts" ON public.test_attempts FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- mock interviews ---------------------------------------------------------
CREATE TABLE public.mock_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating numeric NOT NULL DEFAULT 0,
  interviewer text,
  notes text,
  held_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_interviews TO authenticated;
GRANT ALL ON public.mock_interviews TO service_role;
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or all mocks" ON public.mock_interviews FOR SELECT TO authenticated
  USING (private.can_view_all(auth.uid()) OR student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Staff write mocks" ON public.mock_interviews FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- practice ----------------------------------------------------------------
CREATE TABLE public.practice_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  title text NOT NULL,
  platform text NOT NULL DEFAULT 'internal',
  url text,
  level public.difficulty NOT NULL DEFAULT 'easy',
  points integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_problems TO authenticated;
GRANT ALL ON public.practice_problems TO service_role;
ALTER TABLE public.practice_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads practice problems" ON public.practice_problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write practice problems" ON public.practice_problems FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TABLE public.practice_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  status public.practice_status NOT NULL DEFAULT 'todo',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, problem_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_progress TO authenticated;
GRANT ALL ON public.practice_progress TO service_role;
ALTER TABLE public.practice_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or all progress" ON public.practice_progress FOR SELECT TO authenticated
  USING (private.can_view_all(auth.uid()) OR student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Students manage own progress" ON public.practice_progress FOR ALL TO authenticated
  USING (student_id IN (SELECT private.my_profile_ids(auth.uid())))
  WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Staff write progress" ON public.practice_progress FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.practice_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- resources ---------------------------------------------------------------
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'link',
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads resources" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write resources" ON public.resources FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- notifications ------------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff write notifications" ON public.notifications FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE INDEX idx_notifications_user ON public.notifications (user_id, read);

-- widen existing staff policies to include admins ---------------------------
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.can_view_all(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.can_view_all(auth.uid()));
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Trainers insert profiles" ON public.profiles;
CREATE POLICY "Staff insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Trainers delete profiles" ON public.profiles;
CREATE POLICY "Staff delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Students read own scores" ON public.scores;
CREATE POLICY "Read own or all scores" ON public.scores FOR SELECT TO authenticated
  USING (private.can_view_all(auth.uid()) OR student_id IN (SELECT private.my_profile_ids(auth.uid())));
DROP POLICY IF EXISTS "Trainers write scores" ON public.scores;
CREATE POLICY "Staff write scores" ON public.scores FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));