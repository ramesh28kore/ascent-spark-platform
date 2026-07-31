-- Test cases for coding questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS test_cases jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Per-question coding submissions
CREATE TABLE IF NOT EXISTS public.coding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  language text NOT NULL DEFAULT 'javascript',
  cases_passed integer NOT NULL DEFAULT 0,
  cases_total integer NOT NULL DEFAULT 0,
  ai_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  verdict text NOT NULL DEFAULT 'pending',
  feedback text,
  status text NOT NULL DEFAULT 'graded',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, question_id, student_id)
);

GRANT SELECT, INSERT, UPDATE ON public.coding_submissions TO authenticated;
GRANT ALL ON public.coding_submissions TO service_role;

ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or all coding submissions"
ON public.coding_submissions FOR SELECT TO authenticated
USING (
  private.can_view_all(auth.uid())
  OR student_id IN (SELECT private.my_profile_ids(auth.uid()))
);

CREATE POLICY "Students insert own coding submissions"
ON public.coding_submissions FOR INSERT TO authenticated
WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));

CREATE POLICY "Staff write coding submissions"
ON public.coding_submissions FOR ALL TO authenticated
USING (private.is_staff(auth.uid()))
WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER coding_submissions_touch
BEFORE UPDATE ON public.coding_submissions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Grading: coding items use the recorded submission score instead of string match
CREATE OR REPLACE FUNCTION public.grade_attempt(_test_id uuid, _responses jsonb, _blur_count integer DEFAULT 0)
 RETURNS TABLE(score numeric, max_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _profile   uuid;
  _test      public.tests%ROWTYPE;
  _started   timestamptz;
  _submitted timestamptz;
  _score     numeric := 0;
  _max       numeric := 0;
  _grace     interval := interval '10 seconds';
  r          record;
  given      text;
  sub_score  numeric;
BEGIN
  SELECT id INTO _profile FROM public.profiles WHERE user_id = auth.uid();
  IF _profile IS NULL THEN
    RAISE EXCEPTION 'No student profile linked to this account.';
  END IF;

  SELECT * INTO _test FROM public.tests WHERE id = _test_id AND published;
  IF _test.id IS NULL THEN
    RAISE EXCEPTION 'Test not found or not published.';
  END IF;

  SELECT started_at, submitted_at INTO _started, _submitted
  FROM public.test_attempts
  WHERE test_id = _test_id AND student_id = _profile;

  IF _started IS NULL THEN
    RAISE EXCEPTION 'Attempt has not been started.';
  END IF;
  IF _submitted IS NOT NULL THEN
    RAISE EXCEPTION 'This attempt has already been submitted.';
  END IF;
  IF now() > _started + make_interval(mins => _test.duration_min) + _grace THEN
    RAISE EXCEPTION 'Time limit exceeded.';
  END IF;
  IF _test.ends_at IS NOT NULL AND now() > _test.ends_at + _grace THEN
    RAISE EXCEPTION 'The test window has closed.';
  END IF;

  FOR r IN
    SELECT ti.question_id, ti.marks, q.answer, q.qtype
    FROM public.test_items ti
    JOIN public.questions q ON q.id = ti.question_id
    WHERE ti.test_id = _test_id
  LOOP
    _max := _max + r.marks;

    IF r.qtype = 'coding' THEN
      SELECT cs.ai_score INTO sub_score
      FROM public.coding_submissions cs
      WHERE cs.test_id = _test_id
        AND cs.question_id = r.question_id
        AND cs.student_id = _profile;
      _score := _score + LEAST(COALESCE(sub_score, 0), r.marks);
      CONTINUE;
    END IF;

    given := _responses ->> r.question_id::text;
    IF r.answer IS NOT NULL AND given IS NOT NULL
       AND lower(btrim(regexp_replace(given,    '\s+', ' ', 'g')))
         = lower(btrim(regexp_replace(r.answer, '\s+', ' ', 'g')))
    THEN
      _score := _score + r.marks;
    END IF;
  END LOOP;

  UPDATE public.test_attempts
  SET submitted_at = now(),
      graded_at    = now(),
      score        = _score,
      max_score    = _max,
      responses    = _responses,
      blur_count   = GREATEST(blur_count, COALESCE(_blur_count, 0))
  WHERE test_id = _test_id AND student_id = _profile;

  RETURN QUERY SELECT _score, _max;
END;
$function$;