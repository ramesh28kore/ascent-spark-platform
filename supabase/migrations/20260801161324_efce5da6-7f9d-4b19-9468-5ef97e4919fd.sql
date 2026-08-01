CREATE TABLE public.code_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope_kind text NOT NULL CHECK (scope_kind IN ('practice','exam','playground')),
  problem_id uuid REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'python',
  code text NOT NULL,
  label text NOT NULL DEFAULT 'autosave' CHECK (label IN ('autosave','manual','submitted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_snapshots TO authenticated;
GRANT ALL ON public.code_snapshots TO service_role;

ALTER TABLE public.code_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage their own code snapshots"
ON public.code_snapshots FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.user_id = auth.uid()));

CREATE INDEX code_snapshots_scope_idx
  ON public.code_snapshots (student_id, scope_kind, problem_id, question_id, attempt_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.trim_code_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.code_snapshots c
  WHERE c.id IN (
    SELECT id FROM (
      SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
      FROM public.code_snapshots
      WHERE student_id = NEW.student_id
        AND label = 'autosave'
        AND scope_kind = NEW.scope_kind
        AND problem_id IS NOT DISTINCT FROM NEW.problem_id
        AND question_id IS NOT DISTINCT FROM NEW.question_id
        AND attempt_id IS NOT DISTINCT FROM NEW.attempt_id
    ) ranked
    WHERE ranked.rn > 20
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trim_code_snapshots_trg
AFTER INSERT ON public.code_snapshots
FOR EACH ROW WHEN (NEW.label = 'autosave')
EXECUTE FUNCTION public.trim_code_snapshots();