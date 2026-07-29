-- ENUMS
CREATE TYPE public.app_role AS ENUM ('trainer', 'student');
CREATE TYPE public.question_type AS ENUM ('mcq', 'coding', 'descriptive');
CREATE TYPE public.difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.assessment_kind AS ENUM ('weekly_test', 'mock_nqt', 'coding_test', 'interview');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text,
  roll_number text,
  branch text,
  year text,
  batch text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'trainer'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Trainers insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Trainers delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'trainer'));

-- MODULES
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  hours integer NOT NULL DEFAULT 0,
  weight_percent integer NOT NULL DEFAULT 0,
  deliverable text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone signed in reads modules" ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers write modules" ON public.modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'trainer'));

-- MODULE TOPICS
CREATE TABLE public.module_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  hours numeric NOT NULL DEFAULT 1,
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_topics TO authenticated;
GRANT ALL ON public.module_topics TO service_role;
ALTER TABLE public.module_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone signed in reads topics" ON public.module_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers write topics" ON public.module_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'trainer'));

-- ASSESSMENTS
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind public.assessment_kind NOT NULL DEFAULT 'weekly_test',
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  max_marks integer NOT NULL DEFAULT 30,
  scheduled_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone signed in reads assessments" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers write assessments" ON public.assessments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'trainer'));

-- SCORES
CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  marks numeric NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 1,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, assessment_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own scores" ON public.scores FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'trainer')
    OR student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Trainers write scores" ON public.scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'trainer'));

-- QUESTIONS
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  qtype public.question_type NOT NULL DEFAULT 'mcq',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer text,
  explanation text,
  level public.difficulty NOT NULL DEFAULT 'easy',
  bloom text NOT NULL DEFAULT 'L1',
  marks integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone signed in reads questions" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers write questions" ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'trainer'));

-- CODING PROBLEMS
CREATE TABLE public.coding_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  title text NOT NULL,
  pattern text,
  level public.difficulty NOT NULL DEFAULT 'easy',
  problem text NOT NULL,
  approach text NOT NULL,
  code text NOT NULL,
  expected_output text,
  complexity text,
  follow_ups text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coding_problems TO authenticated;
GRANT ALL ON public.coding_problems TO service_role;
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone signed in reads coding problems" ON public.coding_problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers write coding problems" ON public.coding_problems FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'trainer'));

-- SIGNUP TRIGGER: profile + role (first user is the trainer)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned public.app_role;
BEGIN
  SELECT CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'trainer')
              THEN 'student'::public.app_role ELSE 'trainer'::public.app_role END
    INTO assigned;

  INSERT INTO public.profiles (user_id, full_name, email, roll_number, branch, year, batch)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'roll_number',
    NEW.raw_user_meta_data ->> 'branch',
    NEW.raw_user_meta_data ->> 'year',
    COALESCE(NEW.raw_user_meta_data ->> 'batch', 'CRT-2026-A')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED: MODULES
INSERT INTO public.modules (code, title, description, hours, weight_percent, deliverable, sort_order) VALUES
('M1','Programming Foundations','Data types, control flow, functions, recursion, complexity notation',8,10,'Slides + 40 practice programs with output',1),
('M2','Data Structures','Arrays, strings, linked list, stack, queue, hashing',14,20,'Pattern-wise problem sets + Python solutions',2),
('M3','Algorithms','Searching, sorting, two-pointer, sliding window, greedy, basic DP',14,20,'Graded problem ladder (Easy to Hard)',3),
('M4','CS Core','DBMS, OS, CN, OOPs',12,15,'Interview Q-bank with model answers',4),
('M5','Aptitude & Reasoning','Quant, DI, logical, verbal',10,15,'Topic-wise sheets + shortcut methods',5),
('M6','Company-Specific Prep','TCS NQT, Infosys, Wipro NLTH patterns',8,12,'Pattern analysis + full-length mocks',6),
('M7','Interview Readiness','Resume, project explanation, HR round',6,8,'Resume template + mock interview scripts',7);

-- SEED: TOPICS
INSERT INTO public.module_topics (module_id, title, hours, completed, sort_order)
SELECT m.id, t.title, t.hours, t.completed, t.ord FROM public.modules m
JOIN (VALUES
 ('M1','Data types & operators',1.5,true,1),('M1','Control flow & loops',2,true,2),('M1','Functions & scope',2,true,3),('M1','Recursion',1.5,false,4),('M1','Time & space complexity',1,false,5),
 ('M2','Arrays & prefix sums',3,true,1),('M2','Strings',3,false,2),('M2','Linked lists',3,false,3),('M2','Stacks & queues',2.5,false,4),('M2','Hashing',2.5,false,5),
 ('M3','Searching & binary search',3,false,1),('M3','Sorting',2.5,false,2),('M3','Two pointer & sliding window',3,false,3),('M3','Greedy',2.5,false,4),('M3','Basic DP',3,false,5),
 ('M4','DBMS: SQL, joins, normalization',4,false,1),('M4','OS: scheduling, deadlock, memory',3,false,2),('M4','CN: OSI, TCP/IP, subnetting',3,false,3),('M4','OOPs concepts',2,false,4),
 ('M5','Quantitative aptitude',4,false,1),('M5','Data interpretation',2,false,2),('M5','Logical reasoning',2,false,3),('M5','Verbal ability',2,false,4),
 ('M6','TCS NQT pattern & mocks',3,false,1),('M6','Infosys pattern & mocks',2.5,false,2),('M6','Wipro NLTH pattern & mocks',2.5,false,3),
 ('M7','Resume building',2,false,1),('M7','Project defence',2,false,2),('M7','HR round & mock interview',2,false,3)
) AS t(code,title,hours,completed,ord) ON t.code = m.code;

-- SEED: DEMO STUDENTS
INSERT INTO public.profiles (full_name, email, roll_number, branch, year, batch) VALUES
('Aarthi Ramesh','aarthi.r@example.edu','21CSE001','CSE','III','CRT-2026-A'),
('Bhargav Naidu','bhargav.n@example.edu','21CSE014','CSE','III','CRT-2026-A'),
('Chaitra Rao','chaitra.rao@example.edu','21IT022','IT','III','CRT-2026-A'),
('Deepak Menon','deepak.m@example.edu','21ECE008','ECE','III','CRT-2026-A'),
('Esha Fernandes','esha.f@example.edu','21CSE045','CSE','III','CRT-2026-B'),
('Farhan Qureshi','farhan.q@example.edu','21IT031','IT','III','CRT-2026-B'),
('Gowri Shankar','gowri.s@example.edu','21ECE019','ECE','III','CRT-2026-B'),
('Harini Iyer','harini.i@example.edu','21CSE060','CSE','III','CRT-2026-B'),
('Imran Khan','imran.k@example.edu','21CSE072','CSE','IV','CRT-2026-A'),
('Jyothi Reddy','jyothi.r@example.edu','21IT040','IT','IV','CRT-2026-A');

-- SEED: ASSESSMENTS
INSERT INTO public.assessments (title, kind, module_id, max_marks, scheduled_on)
SELECT v.title, v.kind::public.assessment_kind, m.id, v.max_marks, v.d::date
FROM (VALUES
 ('Week 1 Diagnostic - Programming Foundations','weekly_test','M1',30,'2026-06-08'),
 ('Week 2 Test - Data Structures','weekly_test','M2',30,'2026-06-15'),
 ('Coding Test 1 - Arrays & Strings','coding_test','M2',50,'2026-06-22'),
 ('Week 4 Test - Algorithms','weekly_test','M3',30,'2026-06-29'),
 ('CS Core Test - DBMS/OS/CN/OOPs','weekly_test','M4',30,'2026-07-06'),
 ('Aptitude Sheet Test','weekly_test','M5',30,'2026-07-13'),
 ('Full-length Mock NQT','mock_nqt','M6',100,'2026-07-20')
) AS v(title,kind,code,max_marks,d)
LEFT JOIN public.modules m ON m.code = v.code;

-- SEED: SCORES (deterministic spread)
INSERT INTO public.scores (student_id, assessment_id, marks, attempts)
SELECT p.id, a.id,
  ROUND(a.max_marks * (0.42 + ((('x'||substr(md5(p.id::text||a.id::text),1,8))::bit(32)::bigint % 50)::numeric / 100)), 0),
  1 + (('x'||substr(md5(a.id::text||p.id::text),1,8))::bit(32)::bigint % 2)
FROM public.profiles p CROSS JOIN public.assessments a
WHERE p.user_id IS NULL;

-- SEED: QUESTIONS
INSERT INTO public.questions (module_id, prompt, qtype, options, answer, explanation, level, bloom, marks)
SELECT m.id, v.prompt, v.qtype::public.question_type, v.options::jsonb, v.answer, v.explanation, v.level::public.difficulty, v.bloom, v.marks
FROM (VALUES
 ('M1','What is the time complexity of accessing an element by index in a Python list?','mcq','["O(1)","O(log n)","O(n)","O(n log n)"]','O(1)','Lists are contiguous arrays, so indexing is constant time.','easy','L1',1),
 ('M1','What does a recursive function need to terminate?','mcq','["A loop","A base case","A global variable","A try block"]','A base case','Without a base case recursion never unwinds.','easy','L1',1),
 ('M1','Predict the output: print(type(5/2))','mcq','["int","float","str","complex"]','float','True division always returns float in Python 3.','easy','L2',1),
 ('M1','Which notation describes the worst-case upper bound?','mcq','["Big Omega","Big Theta","Big O","Little o"]','Big O','Big O is the asymptotic upper bound.','easy','L1',1),
 ('M2','Which data structure gives O(1) average lookup?','mcq','["Array","Hash table","Linked list","Binary tree"]','Hash table','Hashing gives average constant-time lookup.','easy','L1',1),
 ('M2','Reversing a singly linked list iteratively uses how much extra space?','mcq','["O(1)","O(log n)","O(n)","O(n^2)"]','O(1)','Only a few pointers are needed.','medium','L3',2),
 ('M2','Which structure suits an undo feature?','mcq','["Queue","Stack","Heap","Trie"]','Stack','LIFO matches undo semantics.','easy','L2',1),
 ('M2','Detecting a cycle in a linked list optimally uses:','mcq','["Hash set","Floyd cycle detection","Sorting","Binary search"]','Floyd cycle detection','Slow/fast pointers use O(1) space.','medium','L3',2),
 ('M3','Binary search requires the input to be:','mcq','["Unsorted","Sorted","Unique","Positive"]','Sorted','Halving needs ordering.','easy','L1',1),
 ('M3','Best case complexity of quicksort:','mcq','["O(n)","O(n log n)","O(n^2)","O(log n)"]','O(n log n)','Balanced partitions give n log n.','medium','L2',1),
 ('M3','Maximum sum subarray of size k is best solved with:','mcq','["Sliding window","Backtracking","Dijkstra","Union find"]','Sliding window','Fixed-size window in O(n).','medium','L3',2),
 ('M3','Which problem is a classic DP example?','mcq','["Longest common subsequence","Linear search","Bubble sort","Stack push"]','Longest common subsequence','LCS has overlapping subproblems.','medium','L2',1),
 ('M4','Which normal form removes partial dependency?','mcq','["1NF","2NF","3NF","BCNF"]','2NF','2NF eliminates partial dependency on a composite key.','medium','L2',1),
 ('M4','Deadlock requires all of the following EXCEPT:','mcq','["Mutual exclusion","Hold and wait","Preemption","Circular wait"]','Preemption','Deadlock needs no-preemption, not preemption.','medium','L3',2),
 ('M4','Which OSI layer does TCP belong to?','mcq','["Network","Transport","Session","Data link"]','Transport','TCP is a transport-layer protocol.','easy','L1',1),
 ('M4','Runtime polymorphism in Java is achieved by:','mcq','["Overloading","Overriding","Static methods","Final methods"]','Overriding','Dynamic dispatch happens on overridden methods.','easy','L2',1),
 ('M5','A train 150 m long crosses a pole in 15 s. Its speed is:','mcq','["10 m/s","15 m/s","20 m/s","36 m/s"]','10 m/s','150/15 = 10 m/s.','easy','L3',1),
 ('M5','If 20% of a number is 45, the number is:','mcq','["180","225","250","300"]','225','45/0.2 = 225.','easy','L3',1),
 ('M5','Find the odd one: 2, 3, 5, 7, 9, 11','mcq','["3","5","9","11"]','9','9 is not prime.','easy','L2',1),
 ('M6','TCS NQT adaptive sections mean:','mcq','["Questions get harder as you answer correctly","All students get the same paper","Only coding is graded","Negative marking is absent"]','Questions get harder as you answer correctly','Adaptive testing adjusts difficulty.','easy','L1',1),
 ('M7','Best way to open a project explanation in an interview:','mcq','["List all libraries used","State the problem and your role","Show the code first","Talk about the marks scored"]','State the problem and your role','Context and ownership come first.','easy','L2',1)
) AS v(code,prompt,qtype,options,answer,explanation,level,bloom,marks)
LEFT JOIN public.modules m ON m.code = v.code;

-- SEED: CODING PROBLEMS
INSERT INTO public.coding_problems (module_id, title, pattern, level, problem, approach, code, expected_output, complexity, follow_ups)
SELECT m.id, v.title, v.pattern, v.level::public.difficulty, v.problem, v.approach, v.solution, v.expected_output, v.complexity, v.follow_ups
FROM (VALUES
('M2','Palindrome check','Two pointer','easy',
'Check whether a string is a palindrome, ignoring case and non-alphanumeric characters.',
'Normalise the text, then compare characters from both ends moving inward.',
'def is_palindrome(text):
    text = ''''.join(ch.lower() for ch in text if ch.isalnum())
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome("Rama"))
print(is_palindrome("malayalam"))
print(is_palindrome("A man, a plan, a canal: Panama"))',
'False
True
True','Time O(n), Space O(1)',
'Why not text[::-1]? How would you handle Unicode? Write a recursive variant and state its space cost.'),

('M2','Two sum','Hashing','easy',
'Given an array and a target, return indices of the two numbers that add up to the target.',
'Store each seen value with its index in a dictionary and look up the complement in one pass.',
'def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []

print(two_sum([2, 7, 11, 15], 9))
print(two_sum([3, 2, 4], 6))',
'[0, 1]
[1, 2]','Time O(n), Space O(n)',
'What if multiple pairs exist? What changes when the array is sorted? Can you do it in O(1) space?'),

('M2','Reverse a linked list','Linked list','medium',
'Reverse a singly linked list and return the new head.',
'Walk the list once, re-pointing each node to its predecessor with three pointers.',
'class Node:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev

head = Node(1, Node(2, Node(3)))
out = []
node = reverse(head)
while node:
    out.append(node.val)
    node = node.next
print(out)',
'[3, 2, 1]','Time O(n), Space O(1)',
'Recursive version and its stack cost? How would you reverse in groups of k?'),

('M2','Valid parentheses','Stack','easy',
'Check whether a string of brackets is correctly balanced.',
'Push opening brackets and pop on the matching closing bracket.',
'def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack

print(is_valid("({[]})"))
print(is_valid("(]"))',
'True
False','Time O(n), Space O(n)',
'How do you extend it to handle other tokens? What about a very long stream?'),

('M2','First non-repeating character','Hashing','easy',
'Return the first character in a string that does not repeat.',
'Count frequencies in one pass, then scan again for the first count of one.',
'from collections import Counter

def first_unique(s):
    counts = Counter(s)
    for ch in s:
        if counts[ch] == 1:
            return ch
    return None

print(first_unique("swiss"))
print(first_unique("aabb"))',
'w
None','Time O(n), Space O(1) for a fixed alphabet',
'Can you do it in one pass? What if the input is a stream?'),

('M3','Binary search','Searching','easy',
'Find the index of a target in a sorted array, or -1 if absent.',
'Repeatedly halve the search range by comparing the middle element.',
'def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(binary_search([1, 3, 5, 7, 9], 7))
print(binary_search([1, 3, 5], 4))',
'3
-1','Time O(log n), Space O(1)',
'Why (lo+hi)//2 can overflow in Java but not Python? Write the first-occurrence variant.'),

('M3','Maximum sum subarray of size k','Sliding window','medium',
'Find the maximum sum of any contiguous subarray of length k.',
'Build the first window, then slide it adding the incoming and removing the outgoing element.',
'def max_window(nums, k):
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]
        best = max(best, window)
    return best

print(max_window([2, 1, 5, 1, 3, 2], 3))',
'9','Time O(n), Space O(1)',
'What changes for a variable-size window? How about the maximum in each window?'),

('M3','Kadane maximum subarray','Dynamic programming','medium',
'Find the largest sum of a contiguous subarray, allowing negatives.',
'Track the best sum ending at each index; restart when the running sum turns negative.',
'def kadane(nums):
    best = current = nums[0]
    for n in nums[1:]:
        current = max(n, current + n)
        best = max(best, current)
    return best

print(kadane([-2, 1, -3, 4, -1, 2, 1, -5, 4]))',
'6','Time O(n), Space O(1)',
'How do you return the subarray itself? What about a circular array?'),

('M3','Merge two sorted arrays','Two pointer','easy',
'Merge two sorted arrays into one sorted array.',
'Advance two pointers, always taking the smaller head element.',
'def merge(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:]); out.extend(b[j:])
    return out

print(merge([1, 4, 7], [2, 3, 9]))',
'[1, 2, 3, 4, 7, 9]','Time O(n+m), Space O(n+m)',
'How would you merge in place? What if there are k arrays?'),

('M3','Coin change (minimum coins)','Dynamic programming','hard',
'Find the fewest coins needed to make an amount, or -1 if impossible.',
'Bottom-up DP where dp[x] is the best count for amount x.',
'def coin_change(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x:
                dp[x] = min(dp[x], dp[x - c] + 1)
    return -1 if dp[amount] == INF else dp[amount]

print(coin_change([1, 2, 5], 11))
print(coin_change([2], 3))',
'3
-1','Time O(amount * coins), Space O(amount)',
'Why is greedy wrong here? How do you reconstruct the actual coins used?')
) AS v(mcode,title,pattern,level,problem,approach,solution,expected_output,complexity,follow_ups)
LEFT JOIN public.modules m ON m.code = v.mcode;