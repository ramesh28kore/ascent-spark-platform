CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'target',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_plans_read" ON public.study_plans FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));
CREATE POLICY "study_plans_staff_write" ON public.study_plans FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER study_plans_touch BEFORE UPDATE ON public.study_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.study_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  day integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, problem_id)
);
GRANT SELECT ON public.study_plan_items TO authenticated;
GRANT ALL ON public.study_plan_items TO service_role;
ALTER TABLE public.study_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_plan_items_read" ON public.study_plan_items FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));
CREATE POLICY "study_plan_items_staff_write" ON public.study_plan_items FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contests TO authenticated;
GRANT ALL ON public.contests TO service_role;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contests_read" ON public.contests FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()) AND (published OR private.is_staff(auth.uid())));
CREATE POLICY "contests_staff_write" ON public.contests FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER contests_touch BEFORE UPDATE ON public.contests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.contest_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 100,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, problem_id)
);
GRANT SELECT ON public.contest_problems TO authenticated;
GRANT ALL ON public.contest_problems TO service_role;
ALTER TABLE public.contest_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contest_problems_read" ON public.contest_problems FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));
CREATE POLICY "contest_problems_staff_write" ON public.contest_problems FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TABLE public.contest_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, student_id)
);
GRANT SELECT, INSERT, DELETE ON public.contest_registrations TO authenticated;
GRANT ALL ON public.contest_registrations TO service_role;
ALTER TABLE public.contest_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contest_reg_own_read" ON public.contest_registrations FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR private.is_staff(auth.uid()));
CREATE POLICY "contest_reg_own_insert" ON public.contest_registrations FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "contest_reg_own_delete" ON public.contest_registrations FOR DELETE TO authenticated USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR private.is_staff(auth.uid()));

CREATE TABLE public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  on_date date NOT NULL UNIQUE,
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_challenges_read" ON public.daily_challenges FOR SELECT TO authenticated USING (private.is_content_reader(auth.uid()));
CREATE POLICY "daily_challenges_staff_write" ON public.daily_challenges FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));