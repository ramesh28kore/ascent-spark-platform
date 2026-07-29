CREATE OR REPLACE FUNCTION public.grade_attempt(
  _test_id     uuid,
  _responses   jsonb,
  _blur_count  integer DEFAULT 0
)
RETURNS TABLE (score numeric, max_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT ti.question_id, ti.marks, q.answer
    FROM public.test_items ti
    JOIN public.questions q ON q.id = ti.question_id
    WHERE ti.test_id = _test_id
  LOOP
    _max := _max + r.marks;
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
$$;

REVOKE ALL ON FUNCTION public.grade_attempt(uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_attempt(uuid, jsonb, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.grade_attempt(uuid, jsonb, integer) IS
  'Sole authoritative grading path. Students have no UPDATE rights on test_attempts.';