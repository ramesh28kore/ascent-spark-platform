-- 1. Certificates: remove blanket anon read, replace with code-scoped lookup
DROP POLICY IF EXISTS "Anyone can verify a certificate" ON public.certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE(code text, holder_name text, title text, kind text, score numeric, max_score numeric, issued_on date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.code, c.holder_name, c.title, c.kind, c.score, c.max_score, c.issued_on
  FROM public.certificates c
  WHERE upper(btrim(_code)) <> ''
    AND c.code = upper(btrim(_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO service_role;

-- 2. Move privileged SECURITY DEFINER routines out of the exposed API schema
CREATE OR REPLACE FUNCTION private.grade_attempt(_test_id uuid, _responses jsonb, _blur_count integer DEFAULT 0)
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

CREATE OR REPLACE FUNCTION private.test_leaderboard(_test_id uuid)
RETURNS TABLE(student_id uuid, full_name text, roll_number text, score numeric, max_score numeric, seconds numeric, submitted_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION private.staff_questions()
RETURNS SETOF public.questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT q.* FROM public.questions q WHERE private.is_staff(auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.staff_coding_problems()
RETURNS SETOF public.coding_problems
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.* FROM public.coding_problems c WHERE private.is_staff(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION private.grade_attempt(uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.test_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.staff_questions() TO authenticated;
GRANT EXECUTE ON FUNCTION private.staff_coding_problems() TO authenticated;

DROP FUNCTION IF EXISTS public.grade_attempt(uuid, jsonb, integer);
DROP FUNCTION IF EXISTS public.test_leaderboard(uuid);
DROP FUNCTION IF EXISTS public.staff_questions();
DROP FUNCTION IF EXISTS public.staff_coding_problems();

CREATE FUNCTION public.grade_attempt(_test_id uuid, _responses jsonb, _blur_count integer DEFAULT 0)
RETURNS TABLE(score numeric, max_score numeric)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT * FROM private.grade_attempt(_test_id, _responses, _blur_count);
$$;

CREATE FUNCTION public.test_leaderboard(_test_id uuid)
RETURNS TABLE(student_id uuid, full_name text, roll_number text, score numeric, max_score numeric, seconds numeric, submitted_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT * FROM private.test_leaderboard(_test_id);
$$;

CREATE FUNCTION public.staff_questions()
RETURNS SETOF public.questions
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT * FROM private.staff_questions();
$$;

CREATE FUNCTION public.staff_coding_problems()
RETURNS SETOF public.coding_problems
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT * FROM private.staff_coding_problems();
$$;

REVOKE ALL ON FUNCTION public.grade_attempt(uuid, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.test_leaderboard(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_questions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_coding_problems() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_attempt(uuid, jsonb, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.test_leaderboard(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.staff_questions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.staff_coding_problems() TO authenticated, service_role;

-- 3. Staff oversight on problem submissions
CREATE POLICY "Staff manage problem submissions"
ON public.problem_submissions
FOR DELETE
TO authenticated
USING (private.is_staff(auth.uid()));