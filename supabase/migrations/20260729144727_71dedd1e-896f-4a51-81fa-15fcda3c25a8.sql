DROP POLICY IF EXISTS "Trainers write modules" ON public.modules;
CREATE POLICY "Staff write modules" ON public.modules FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Trainers write topics" ON public.module_topics;
CREATE POLICY "Staff write topics" ON public.module_topics FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Trainers write assessments" ON public.assessments;
CREATE POLICY "Staff write assessments" ON public.assessments FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Trainers write questions" ON public.questions;
CREATE POLICY "Staff write questions" ON public.questions FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Trainers write coding problems" ON public.coding_problems;
CREATE POLICY "Staff write coding problems" ON public.coding_problems FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

INSERT INTO public.practice_problems (module_id, title, platform, url, level, points, sort_order)
SELECT m.id, v.title, v.platform, v.url, v.level::public.difficulty, v.points, v.sort_order
FROM (VALUES
  ('M2','Two Sum','leetcode','https://leetcode.com/problems/two-sum/','easy',1,1),
  ('M2','Reverse a linked list','leetcode','https://leetcode.com/problems/reverse-linked-list/','easy',1,2),
  ('M2','Valid parentheses','leetcode','https://leetcode.com/problems/valid-parentheses/','easy',1,3),
  ('M2','Merge intervals','leetcode','https://leetcode.com/problems/merge-intervals/','medium',3,4),
  ('M2','LRU cache','leetcode','https://leetcode.com/problems/lru-cache/','hard',5,5),
  ('M3','Binary search on answer','leetcode','https://leetcode.com/problems/koko-eating-bananas/','medium',3,6),
  ('M3','Longest substring without repeat','leetcode','https://leetcode.com/problems/longest-substring-without-repeating-characters/','medium',3,7),
  ('M3','Number of islands','leetcode','https://leetcode.com/problems/number-of-islands/','medium',3,8),
  ('M3','Course schedule (topo sort)','leetcode','https://leetcode.com/problems/course-schedule/','medium',3,9),
  ('M3','Edit distance','leetcode','https://leetcode.com/problems/edit-distance/','hard',5,10)
) AS v(code,title,platform,url,level,points,sort_order)
LEFT JOIN public.modules m ON m.code = v.code
WHERE NOT EXISTS (SELECT 1 FROM public.practice_problems pp WHERE pp.title = v.title);