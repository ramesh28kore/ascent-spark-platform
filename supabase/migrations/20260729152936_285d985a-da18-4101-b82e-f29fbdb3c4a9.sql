
-- Build coding questions from the existing coding problem library
INSERT INTO public.questions (module_id, prompt, qtype, options, answer, explanation, level, bloom, marks)
SELECT c.module_id,
       c.title || E'\n\n' || c.problem,
       'coding'::question_type,
       '[]'::jsonb,
       NULL,
       c.approach,
       c.level,
       'L3',
       10
FROM public.coding_problems c
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q
  WHERE q.qtype = 'coding' AND q.prompt LIKE c.title || '%'
);

-- Extra coding questions for modules with no coding problems yet
INSERT INTO public.questions (module_id, prompt, qtype, options, answer, explanation, level, bloom, marks)
SELECT m.id, v.prompt, 'coding'::question_type, '[]'::jsonb, NULL, v.explanation, v.level::difficulty, 'L3', v.marks
FROM (VALUES
  ('M1','Reverse the digits of an integer\n\nWrite a program that reads an integer and prints its digits reversed. Handle negative numbers.','Use modulo/division in a loop; keep the sign separately.','easy',10),
  ('M1','FizzBuzz variant\n\nPrint numbers 1..N, replacing multiples of 3 with "Fizz", 5 with "Buzz" and both with "FizzBuzz".','Single loop with modulo checks; test both conditions first.','easy',10),
  ('M1','Count vowels and consonants\n\nGiven a string, print the count of vowels and consonants ignoring case and non-letters.','Normalise case, iterate characters, classify with a vowel set.','easy',10),
  ('M4','Second highest salary (SQL)\n\nWrite a SQL query returning the second highest salary from an employees table. Return NULL when it does not exist.','Use DISTINCT with OFFSET 1 LIMIT 1 or a subquery with MAX.','medium',10),
  ('M4','Simulate FCFS scheduling\n\nGiven arrival and burst times, compute average waiting and turnaround time under First Come First Served.','Sort by arrival, accumulate completion time per process.','medium',10),
  ('M7','Design a rate limiter\n\nImplement a function allowing at most K requests per user in a sliding 60 second window.','Store timestamps per user, drop expired entries, compare length with K.','hard',10)
) AS v(code, prompt, explanation, level, marks)
JOIN public.modules m ON m.code = v.code
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q WHERE q.prompt = v.prompt
);
