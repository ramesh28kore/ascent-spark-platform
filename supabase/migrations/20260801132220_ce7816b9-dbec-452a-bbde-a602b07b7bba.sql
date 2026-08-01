
ALTER TABLE public.practice_problems
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS constraints text,
  ADD COLUMN IF NOT EXISTS starter_code jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS test_cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS time_limit_ms integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS memory_limit_kb integer NOT NULL DEFAULT 128000;

UPDATE public.practice_problems
SET slug = lower(regexp_replace(btrim(title), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 4)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS practice_problems_slug_key ON public.practice_problems (slug);

CREATE TABLE IF NOT EXISTS public.problem_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  language text NOT NULL DEFAULT 'python',
  verdict text NOT NULL DEFAULT 'pending',
  cases_passed integer NOT NULL DEFAULT 0,
  cases_total integer NOT NULL DEFAULT 0,
  runtime_ms integer NOT NULL DEFAULT 0,
  memory_kb integer NOT NULL DEFAULT 0,
  case_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.problem_submissions TO authenticated;
GRANT ALL ON public.problem_submissions TO service_role;

ALTER TABLE public.problem_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or staff submissions" ON public.problem_submissions
  FOR SELECT TO authenticated
  USING (
    private.is_staff(auth.uid())
    OR student_id IN (SELECT private.my_profile_ids(auth.uid()))
  );

CREATE POLICY "Insert own submissions" ON public.problem_submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT private.my_profile_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS problem_submissions_student_idx
  ON public.problem_submissions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS problem_submissions_problem_idx
  ON public.problem_submissions (problem_id);

INSERT INTO public.practice_problems
  (slug, title, platform, level, points, category, company, sort_order, statement, constraints, examples, hints, solution, starter_code, test_cases, tags)
VALUES
('sum-of-two-numbers','Sum of Two Numbers','internal','easy',1,'Basics','TCS',1,
 E'Read two integers from standard input, one per line, and print their sum.',
 E'-10^9 <= a, b <= 10^9',
 '[{"input":"3\n4","output":"7","explanation":"3 + 4 = 7"}]'::jsonb,
 '["Use int() to convert each input line.","Print the result with print()."]'::jsonb,
 E'Read both lines, cast to int, print the sum. O(1) time and space.',
 '{"python":"a = int(input())\nb = int(input())\n# print the sum\n","javascript":"const lines = require(\"fs\").readFileSync(0,\"utf8\").split(\"\\n\");\n// print the sum\n"}'::jsonb,
 '[{"input":"3\n4","expected_output":"7","hidden":false},{"input":"-5\n9","expected_output":"4","hidden":false},{"input":"1000000000\n1000000000","expected_output":"2000000000","hidden":true},{"input":"0\n0","expected_output":"0","hidden":true}]'::jsonb,
 ARRAY['Math','Implementation']),

('reverse-a-string','Reverse a String','internal','easy',1,'Strings','Infosys',2,
 E'Read a single line of text and print it reversed.',
 E'1 <= length <= 10^5',
 '[{"input":"hello","output":"olleh","explanation":"Characters printed back to front."}]'::jsonb,
 '["Slicing with [::-1] reverses a Python string.","Watch out for trailing newlines."]'::jsonb,
 E'Return s[::-1]. O(n) time.',
 '{"python":"s = input()\n# print the reversed string\n","javascript":"const s = require(\"fs\").readFileSync(0,\"utf8\").trim();\n// print the reversed string\n"}'::jsonb,
 '[{"input":"hello","expected_output":"olleh","hidden":false},{"input":"crt","expected_output":"trc","hidden":false},{"input":"a","expected_output":"a","hidden":true},{"input":"racecar","expected_output":"racecar","hidden":true}]'::jsonb,
 ARRAY['Strings','Two Pointers']),

('count-vowels','Count the Vowels','internal','easy',1,'Strings','Wipro',3,
 E'Read a lowercase line of text and print how many vowels (a, e, i, o, u) it contains.',
 E'1 <= length <= 10^5',
 '[{"input":"placement","output":"3","explanation":"a, e, e"}]'::jsonb,
 '["Iterate once and test membership in a set.","A set lookup is O(1)."]'::jsonb,
 E'sum(1 for ch in s if ch in set(\"aeiou\")). O(n) time.',
 '{"python":"s = input()\n# print the vowel count\n","javascript":"const s = require(\"fs\").readFileSync(0,\"utf8\").trim();\n// print the vowel count\n"}'::jsonb,
 '[{"input":"placement","expected_output":"3","hidden":false},{"input":"rhythm","expected_output":"0","hidden":false},{"input":"aeiou","expected_output":"5","hidden":true},{"input":"training console","expected_output":"6","hidden":true}]'::jsonb,
 ARRAY['Strings','Hashing']),

('fizz-buzz-line','FizzBuzz Line','internal','easy',1,'Basics','Capgemini',4,
 E'Read an integer n and print the FizzBuzz sequence from 1 to n on a single line, space separated. Print "Fizz" for multiples of 3, "Buzz" for multiples of 5 and "FizzBuzz" for multiples of both.',
 E'1 <= n <= 10^4',
 '[{"input":"5","output":"1 2 Fizz 4 Buzz","explanation":"3 -> Fizz, 5 -> Buzz"}]'::jsonb,
 '["Check divisibility by 15 first.","Collect tokens in a list and join with a space."]'::jsonb,
 E'Loop 1..n, append the right token, then \" \".join(out). O(n) time.',
 '{"python":"n = int(input())\n# print the fizzbuzz line\n","javascript":"const n = Number(require(\"fs\").readFileSync(0,\"utf8\").trim());\n// print the fizzbuzz line\n"}'::jsonb,
 '[{"input":"5","expected_output":"1 2 Fizz 4 Buzz","hidden":false},{"input":"15","expected_output":"1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz","hidden":false},{"input":"1","expected_output":"1","hidden":true},{"input":"3","expected_output":"1 2 Fizz","hidden":true}]'::jsonb,
 ARRAY['Math','Implementation']),

('second-largest','Second Largest Element','internal','easy',1,'Arrays','TCS',5,
 E'The first line contains n. The second line contains n space separated integers. Print the second largest distinct value, or -1 when it does not exist.',
 E'1 <= n <= 10^5',
 '[{"input":"5\n4 1 7 7 3","output":"4","explanation":"Distinct values sorted: 7, 4, 3"}]'::jsonb,
 '["Deduplicate first.","One pass tracking the top two values is enough."]'::jsonb,
 E'Track largest and second largest in one pass, ignoring duplicates. O(n) time.',
 '{"python":"n = int(input())\narr = list(map(int, input().split()))\n# print the second largest distinct value\n","javascript":"const [a,b] = require(\"fs\").readFileSync(0,\"utf8\").split(\"\\n\");\n// print the second largest distinct value\n"}'::jsonb,
 '[{"input":"5\n4 1 7 7 3","expected_output":"4","hidden":false},{"input":"3\n2 2 2","expected_output":"-1","hidden":false},{"input":"1\n9","expected_output":"-1","hidden":true},{"input":"6\n-1 -5 -3 0 0 8","expected_output":"0","hidden":true}]'::jsonb,
 ARRAY['Arrays','Sorting']),

('binary-search-index','Binary Search Index','internal','easy',1,'Searching','Accenture',6,
 E'The first line contains n and the target separated by a space. The second line contains n sorted integers. Print the zero based index of the target, or -1 when it is absent.',
 E'1 <= n <= 10^5, array is sorted ascending',
 '[{"input":"5 7\n1 3 5 7 9","output":"3","explanation":"7 sits at index 3"}]'::jsonb,
 '["Maintain lo and hi pointers.","Use mid = (lo + hi) // 2."]'::jsonb,
 E'Classic binary search, O(log n) time.',
 '{"python":"n, target = map(int, input().split())\narr = list(map(int, input().split()))\n# print the index or -1\n","javascript":"const lines = require(\"fs\").readFileSync(0,\"utf8\").split(\"\\n\");\n// print the index or -1\n"}'::jsonb,
 '[{"input":"5 7\n1 3 5 7 9","expected_output":"3","hidden":false},{"input":"4 2\n1 3 5 7","expected_output":"-1","hidden":false},{"input":"1 1\n1","expected_output":"0","hidden":true},{"input":"6 11\n2 4 6 8 10 11","expected_output":"5","hidden":true}]'::jsonb,
 ARRAY['Binary Search','Arrays']),

('balanced-brackets','Balanced Brackets','internal','medium',3,'Stacks','Infosys',7,
 E'Read a line containing only the characters ()[]{} and print YES when every bracket is correctly matched and nested, otherwise NO.',
 E'1 <= length <= 10^5',
 '[{"input":"{[()]}","output":"YES","explanation":"Every opener is closed in order."}]'::jsonb,
 '["Push openers onto a stack.","On a closer, the stack top must be its pair."]'::jsonb,
 E'Stack based matching with a pair map. O(n) time, O(n) space.',
 '{"python":"s = input()\n# print YES or NO\n","javascript":"const s = require(\"fs\").readFileSync(0,\"utf8\").trim();\n// print YES or NO\n"}'::jsonb,
 '[{"input":"{[()]}","expected_output":"YES","hidden":false},{"input":"([)]","expected_output":"NO","hidden":false},{"input":"(((","expected_output":"NO","hidden":true},{"input":"()[]{}","expected_output":"YES","hidden":true}]'::jsonb,
 ARRAY['Stack','Strings']),

('maximum-subarray-sum','Maximum Subarray Sum','internal','medium',3,'Dynamic Programming','Amazon',8,
 E'The first line contains n. The second line contains n integers. Print the largest sum obtainable from a contiguous non empty subarray.',
 E'1 <= n <= 10^5, -10^4 <= value <= 10^4',
 '[{"input":"8\n-2 1 -3 4 -1 2 1 -5","output":"6","explanation":"4 + (-1) + 2 + 1"}]'::jsonb,
 '["Kadane keeps a running best ending here.","Reset the run when it drops below the current element."]'::jsonb,
 E'Kadane''s algorithm: best = max(x, best + x) each step. O(n) time.',
 '{"python":"n = int(input())\narr = list(map(int, input().split()))\n# print the maximum subarray sum\n","javascript":"const lines = require(\"fs\").readFileSync(0,\"utf8\").split(\"\\n\");\n// print the maximum subarray sum\n"}'::jsonb,
 '[{"input":"8\n-2 1 -3 4 -1 2 1 -5","expected_output":"6","hidden":false},{"input":"3\n-4 -2 -9","expected_output":"-2","hidden":false},{"input":"1\n5","expected_output":"5","hidden":true},{"input":"5\n1 2 3 4 5","expected_output":"15","hidden":true}]'::jsonb,
 ARRAY['Dynamic Programming','Arrays']),

('anagram-check','Anagram Check','internal','medium',3,'Hashing','Cognizant',9,
 E'Read two lowercase words on separate lines and print YES when they are anagrams of each other, otherwise NO.',
 E'1 <= length <= 10^5',
 '[{"input":"listen\nsilent","output":"YES","explanation":"Same letter counts."}]'::jsonb,
 '["Compare sorted strings, or compare character counters.","Different lengths can never be anagrams."]'::jsonb,
 E'Counter(a) == Counter(b). O(n) time.',
 '{"python":"a = input()\nb = input()\n# print YES or NO\n","javascript":"const [a,b] = require(\"fs\").readFileSync(0,\"utf8\").split(\"\\n\");\n// print YES or NO\n"}'::jsonb,
 '[{"input":"listen\nsilent","expected_output":"YES","hidden":false},{"input":"apple\npaper","expected_output":"NO","hidden":false},{"input":"a\na","expected_output":"YES","hidden":true},{"input":"abc\nabcd","expected_output":"NO","hidden":true}]'::jsonb,
 ARRAY['Hashing','Strings']),

('longest-unique-substring','Longest Substring Without Repeats','internal','medium',3,'Sliding Window','Microsoft',10,
 E'Read a line of lowercase letters and print the length of the longest substring that contains no repeated character.',
 E'1 <= length <= 10^5',
 '[{"input":"abcabcbb","output":"3","explanation":"abc"}]'::jsonb,
 '["Slide a window and remember the last index of each character.","Move the left edge past the previous occurrence."]'::jsonb,
 E'Sliding window with a last seen map. O(n) time.',
 '{"python":"s = input()\n# print the longest unique substring length\n","javascript":"const s = require(\"fs\").readFileSync(0,\"utf8\").trim();\n// print the longest unique substring length\n"}'::jsonb,
 '[{"input":"abcabcbb","expected_output":"3","hidden":false},{"input":"bbbbb","expected_output":"1","hidden":false},{"input":"pwwkew","expected_output":"3","hidden":true},{"input":"abcdefg","expected_output":"7","hidden":true}]'::jsonb,
 ARRAY['Sliding Window','Strings']),

('matrix-diagonal-sum','Matrix Diagonal Sum','internal','medium',3,'Matrix','TCS',11,
 E'The first line contains n. The next n lines each contain n integers. Print the sum of both diagonals, counting the centre cell of an odd sized matrix only once.',
 E'1 <= n <= 300',
 '[{"input":"3\n1 2 3\n4 5 6\n7 8 9","output":"25","explanation":"1+5+9+3+7 = 25"}]'::jsonb,
 '["Add matrix[i][i] and matrix[i][n-1-i].","Subtract the centre when n is odd."]'::jsonb,
 E'Single loop over rows adding both diagonal cells. O(n) time.',
 '{"python":"n = int(input())\nrows = [list(map(int, input().split())) for _ in range(n)]\n# print the diagonal sum\n","javascript":"const lines = require(\"fs\").readFileSync(0,\"utf8\").split(\"\\n\");\n// print the diagonal sum\n"}'::jsonb,
 '[{"input":"3\n1 2 3\n4 5 6\n7 8 9","expected_output":"25","hidden":false},{"input":"2\n1 1\n1 1","expected_output":"4","hidden":false},{"input":"1\n7","expected_output":"7","hidden":true},{"input":"4\n1 0 0 1\n0 2 2 0\n0 2 2 0\n1 0 0 1","expected_output":"12","hidden":true}]'::jsonb,
 ARRAY['Matrix','Arrays']),

('merge-sorted-lists','Merge Two Sorted Lists','internal','hard',5,'Two Pointers','Google',12,
 E'Line 1 contains n and m. Line 2 contains n sorted integers. Line 3 contains m sorted integers. Print the merged sorted sequence on one line, space separated.',
 E'0 <= n, m <= 10^5',
 '[{"input":"3 3\n1 4 6\n2 3 5","output":"1 2 3 4 5 6","explanation":"Standard merge step."}]'::jsonb,
 '["Walk both arrays with two indices.","Append the remaining tail once one list runs out."]'::jsonb,
 E'Two pointer merge, O(n + m) time. Avoid re-sorting the concatenation.',
 '{"python":"n, m = map(int, input().split())\na = list(map(int, input().split())) if n else []\nb = list(map(int, input().split())) if m else []\n# print the merged sequence\n","javascript":"const lines = require(\"fs\").readFileSync(0,\"utf8\").split(\"\\n\");\n// print the merged sequence\n"}'::jsonb,
 '[{"input":"3 3\n1 4 6\n2 3 5","expected_output":"1 2 3 4 5 6","hidden":false},{"input":"2 3\n1 2\n0 3 4","expected_output":"0 1 2 3 4","hidden":false},{"input":"1 1\n5\n5","expected_output":"5 5","hidden":true},{"input":"4 2\n1 3 5 7\n2 8","expected_output":"1 2 3 5 7 8","hidden":true}]'::jsonb,
 ARRAY['Two Pointers','Sorting'])
ON CONFLICT (slug) DO NOTHING;
