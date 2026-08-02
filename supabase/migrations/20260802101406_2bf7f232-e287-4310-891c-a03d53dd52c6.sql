CREATE OR REPLACE FUNCTION private.attempt_review(_test_id uuid)
RETURNS TABLE(
  question_id uuid,
  sort_order integer,
  prompt text,
  options jsonb,
  answer text,
  explanation text,
  marks integer,
  qtype public.question_type,
  given text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile uuid;
  _test public.tests%ROWTYPE;
  _responses jsonb;
  _submitted timestamptz;
BEGIN
  SELECT * INTO _test FROM public.tests WHERE id = _test_id;
  IF _test.id IS NULL THEN
    RAISE EXCEPTION 'Test not found.';
  END IF;

  SELECT id INTO _profile FROM public.profiles WHERE user_id = auth.uid();
  IF _profile IS NULL THEN
    RAISE EXCEPTION 'No profile linked to this account.';
  END IF;

  SELECT ta.responses, ta.submitted_at INTO _responses, _submitted
  FROM public.test_attempts ta
  WHERE ta.test_id = _test_id AND ta.student_id = _profile;

  IF _submitted IS NULL THEN
    RAISE EXCEPTION 'You have not submitted this test yet.';
  END IF;
  IF NOT _test.results_released THEN
    RAISE EXCEPTION 'Results for this test have not been released yet.';
  END IF;

  RETURN QUERY
  SELECT q.id,
         ti.sort_order,
         q.prompt,
         q.options,
         q.answer,
         q.explanation,
         ti.marks,
         q.qtype,
         COALESCE(_responses ->> q.id::text, '')
  FROM public.test_items ti
  JOIN public.questions q ON q.id = ti.question_id
  WHERE ti.test_id = _test_id
  ORDER BY ti.sort_order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.attempt_review(_test_id uuid)
RETURNS TABLE(
  question_id uuid,
  sort_order integer,
  prompt text,
  options jsonb,
  answer text,
  explanation text,
  marks integer,
  qtype public.question_type,
  given text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT * FROM private.attempt_review(_test_id);
$function$;

REVOKE ALL ON FUNCTION public.attempt_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.attempt_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attempt_review(uuid) TO authenticated, service_role;