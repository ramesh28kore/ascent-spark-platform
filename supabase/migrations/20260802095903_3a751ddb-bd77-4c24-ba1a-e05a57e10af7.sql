ALTER TABLE public.practice_problems
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visible_to_all_batches boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS editorial text,
  ADD COLUMN IF NOT EXISTS company_frequency integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.practice_problems
  DROP CONSTRAINT IF EXISTS practice_problems_status_check;
ALTER TABLE public.practice_problems
  ADD CONSTRAINT practice_problems_status_check CHECK (status IN ('draft','published'));

UPDATE public.practice_problems
   SET status = 'published',
       visible_to_all_batches = true,
       published_at = COALESCE(published_at, created_at)
 WHERE published_at IS NULL;

DROP TRIGGER IF EXISTS practice_problems_touch ON public.practice_problems;
CREATE TRIGGER practice_problems_touch
  BEFORE UPDATE ON public.practice_problems
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.problem_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, batch_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_batches TO authenticated;
GRANT ALL ON public.problem_batches TO service_role;

ALTER TABLE public.problem_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed in reads problem batches" ON public.problem_batches;
CREATE POLICY "Signed in reads problem batches"
  ON public.problem_batches FOR SELECT TO authenticated
  USING (private.is_content_reader(auth.uid()));

DROP POLICY IF EXISTS "Staff write problem batches" ON public.problem_batches;
CREATE POLICY "Staff write problem batches"
  ON public.problem_batches FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION private.my_batch_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT batch_id FROM public.profiles
   WHERE user_id = _user_id AND batch_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION private.my_batch_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.my_batch_ids(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_see_problem(_user_id uuid, _problem_id uuid, _status text, _all_batches boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_staff(_user_id)
      OR (
        private.is_content_reader(_user_id)
        AND _status = 'published'
        AND (
          _all_batches
          OR EXISTS (
            SELECT 1 FROM public.problem_batches pb
             WHERE pb.problem_id = _problem_id
               AND pb.batch_id IN (SELECT private.my_batch_ids(_user_id))
          )
        )
      );
$$;

REVOKE ALL ON FUNCTION private.can_see_problem(uuid, uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_see_problem(uuid, uuid, text, boolean) TO authenticated;

DROP POLICY IF EXISTS "Signed in reads practice problems" ON public.practice_problems;
CREATE POLICY "Signed in reads visible practice problems"
  ON public.practice_problems FOR SELECT TO authenticated
  USING (private.can_see_problem(auth.uid(), id, status, visible_to_all_batches));
