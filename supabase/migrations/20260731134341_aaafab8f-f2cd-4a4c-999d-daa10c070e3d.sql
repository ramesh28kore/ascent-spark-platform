-- ============ Exam kinds =====================================================
DO $$ BEGIN
  CREATE TYPE public.exam_kind AS ENUM ('mcq_quiz','theory','programming','debugging','challenge','viva');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS exam_kind public.exam_kind NOT NULL DEFAULT 'mcq_quiz',
  ADD COLUMN IF NOT EXISTS negative_marking numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty public.difficulty NOT NULL DEFAULT 'easy',
  ADD COLUMN IF NOT EXISTS leaderboard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS results_released boolean NOT NULL DEFAULT true;

-- ============ Question bank extensions =======================================
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'python_basics',
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS hints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS solution text,
  ADD COLUMN IF NOT EXISTS starter_code text,
  ADD COLUMN IF NOT EXISTS buggy_code text,
  ADD COLUMN IF NOT EXISTS time_limit_ms integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS memory_limit_kb integer NOT NULL DEFAULT 128000;

REVOKE SELECT (solution, buggy_code) ON public.questions FROM authenticated;
GRANT SELECT (id, module_id, prompt, qtype, options, level, bloom, marks, created_at,
              test_cases, category, company, hints, starter_code, buggy_code,
              time_limit_ms, memory_limit_kb)
  ON public.questions TO authenticated;

ALTER TABLE public.practice_problems
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'python_basics',
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS hints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS solution text,
  ADD COLUMN IF NOT EXISTS statement text;

-- ============ Coding submission judge metadata ===============================
ALTER TABLE public.coding_submissions
  ADD COLUMN IF NOT EXISTS runtime_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS memory_kb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS case_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS judged_by text NOT NULL DEFAULT 'ai';

-- ============ Rubrics ========================================================
CREATE TABLE IF NOT EXISTS public.rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind public.exam_kind NOT NULL DEFAULT 'theory',
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_marks numeric NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rubrics TO authenticated;
GRANT ALL ON public.rubrics TO service_role;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads rubrics" ON public.rubrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write rubrics" ON public.rubrics FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
GRANT INSERT, UPDATE, DELETE ON public.rubrics TO authenticated;

CREATE TABLE IF NOT EXISTS public.rubric_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid REFERENCES public.rubrics(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  kind public.exam_kind NOT NULL DEFAULT 'theory',
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  max_total numeric NOT NULL DEFAULT 30,
  comments text,
  evaluator_id uuid,
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rubric_scores TO authenticated;
GRANT ALL ON public.rubric_scores TO service_role;
ALTER TABLE public.rubric_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage rubric scores" ON public.rubric_scores FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Students read released rubric scores" ON public.rubric_scores FOR SELECT TO authenticated
  USING (released AND student_id IN (SELECT private.my_profile_ids(auth.uid())));

-- ============ Theory answers =================================================
CREATE TABLE IF NOT EXISTS public.theory_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer text NOT NULL DEFAULT '',
  awarded numeric,
  max_marks numeric NOT NULL DEFAULT 1,
  comment text,
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, question_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theory_answers TO authenticated;
GRANT ALL ON public.theory_answers TO service_role;
ALTER TABLE public.theory_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage theory answers" ON public.theory_answers FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Students read own theory answers" ON public.theory_answers FOR SELECT TO authenticated
  USING (student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Students write own theory answers" ON public.theory_answers FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Students update own ungraded answers" ON public.theory_answers FOR UPDATE TO authenticated
  USING (student_id IN (SELECT private.my_profile_ids(auth.uid())) AND evaluated_at IS NULL)
  WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));

-- ============ Bookmarks, hint reveals, discussions ===========================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookmarks" ON public.bookmarks FOR ALL TO authenticated
  USING (student_id IN (SELECT private.my_profile_ids(auth.uid())))
  WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));

CREATE TABLE IF NOT EXISTS public.discussion_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_id uuid REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_posts TO authenticated;
GRANT ALL ON public.discussion_posts TO service_role;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads discussion" ON public.discussion_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write own posts" ON public.discussion_posts FOR INSERT TO authenticated
  WITH CHECK (author_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Edit own posts" ON public.discussion_posts FOR UPDATE TO authenticated
  USING (author_id IN (SELECT private.my_profile_ids(auth.uid())))
  WITH CHECK (author_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Delete own or staff posts" ON public.discussion_posts FOR DELETE TO authenticated
  USING (author_id IN (SELECT private.my_profile_ids(auth.uid())) OR private.is_staff(auth.uid()));

-- ============ Playground snippets ============================================
CREATE TABLE IF NOT EXISTS public.snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  language text NOT NULL DEFAULT 'python',
  code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.snippets TO authenticated;
GRANT ALL ON public.snippets TO service_role;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own snippets" ON public.snippets FOR ALL TO authenticated
  USING (owner_id IN (SELECT private.my_profile_ids(auth.uid())))
  WITH CHECK (owner_id IN (SELECT private.my_profile_ids(auth.uid())));

-- ============ Certificates ===================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'module',
  title text NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100,
  code text NOT NULL UNIQUE,
  holder_name text NOT NULL,
  issued_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can verify a certificate" ON public.certificates FOR SELECT TO anon USING (true);
CREATE POLICY "Read own or all certificates" ON public.certificates FOR SELECT TO authenticated
  USING (private.can_view_all(auth.uid()) OR student_id IN (SELECT private.my_profile_ids(auth.uid())));
CREATE POLICY "Staff write certificates" ON public.certificates FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Students issue own certificates" ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));

-- ============ Announcements ==================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff write announcements" ON public.announcements FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- ============ Audit log ======================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (private.can_view_all(auth.uid()));
CREATE POLICY "Signed in append audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============ Timestamps =====================================================
DROP TRIGGER IF EXISTS touch_rubrics ON public.rubrics;
CREATE TRIGGER touch_rubrics BEFORE UPDATE ON public.rubrics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS touch_rubric_scores ON public.rubric_scores;
CREATE TRIGGER touch_rubric_scores BEFORE UPDATE ON public.rubric_scores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS touch_theory_answers ON public.theory_answers;
CREATE TRIGGER touch_theory_answers BEFORE UPDATE ON public.theory_answers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS touch_snippets ON public.snippets;
CREATE TRIGGER touch_snippets BEFORE UPDATE ON public.snippets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Leaderboard ====================================================
CREATE OR REPLACE FUNCTION public.test_leaderboard(_test_id uuid)
RETURNS TABLE(student_id uuid, full_name text, roll_number text, score numeric,
              max_score numeric, seconds numeric, submitted_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.student_id,
         p.full_name,
         p.roll_number,
         a.score,
         a.max_score,
         EXTRACT(EPOCH FROM (a.submitted_at - a.started_at)) AS seconds,
         a.submitted_at
  FROM public.test_attempts a
  JOIN public.profiles p ON p.id = a.student_id
  JOIN public.tests t ON t.id = a.test_id
  WHERE a.test_id = _test_id
    AND a.submitted_at IS NOT NULL
    AND t.leaderboard
    AND t.published
  ORDER BY a.score DESC, seconds ASC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.test_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.test_leaderboard(uuid) TO authenticated, service_role;