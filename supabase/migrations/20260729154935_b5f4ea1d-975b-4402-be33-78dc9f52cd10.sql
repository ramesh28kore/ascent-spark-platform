REVOKE EXECUTE ON FUNCTION public.staff_questions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.staff_coding_problems() FROM anon;
REVOKE EXECUTE ON FUNCTION public.grade_attempt(uuid, jsonb, integer) FROM anon;