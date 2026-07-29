# Placement Prep Pilot

CRT (Technical) — Assistance Framework

1. Scope of Technical CRT

Technical CRT for CSE/IT/ECE typically splits into four assessable pillars. Most recruiters (TCS NQT, Infosys, Wipro, Capgemini, Cognizant, Accenture, and product/mid-tier firms) draw from these:

PillarWeight in DrivesTypical FormatAptitude + Logical Reasoning30–40%MCQ, timed, adaptive (TCS NQT)Programming Logic + DSA30–40%MCQ + 2 coding problemsCS Core (DBMS, OS, CN, OOPs)15–20%MCQ + technical interviewCommunication / HR / Technical Interview10–15%Face-to-face, project defence

2. Recommended Module Plan (60–75 hours)

ModuleTopicsHoursDeliverable I can buildM1 — Programming FoundationsData types, control flow, functions, recursion, complexity notation8Slides + 40 practice programs with outputM2 — Data StructuresArrays, strings, linked list, stack, queue, hashing14Pattern-wise problem sets + Python solutionsM3 — AlgorithmsSearching, sorting, two-pointer, sliding window, greedy, basic DP14Graded problem ladder (Easy→Medium→Hard)M4 — CS CoreDBMS (SQL, normalization, joins), OS (scheduling, deadlock, memory), CN (OSI, TCP/IP, subnetting), OOPs12Interview Q-bank with model answersM5 — Aptitude & ReasoningQuant, DI, logical, verbal10Topic-wise sheets + shortcut methodsM6 — Company-Specific PrepTCS NQT, Infosys, Wipro NLTH patterns8Pattern analysis + full-length mocksM7 — Interview ReadinessResume, project explanation, HR round6Resume template + mock interview scripts

3. What I Can Produce for You

CategoryArtifactsTeaching materialSession-wise lesson plans, PPT-ready content, whiteboard-friendly derivationsCoding practiceProblem sets with Python solutions, complexity analysis, expected output, edge casesAssessmentsWeekly tests, mock NQT papers, coding tests with rubrics and Bloom's tagging (L1–L6)Answer keysModel answers with marking schemes and common-mistake notesAutomationPython tools — auto question-paper generator, score analyser, attendance-cum-performance dashboard, CO-attainment sheet for CRTDocumentationCRT course file, syllabus mapping, training report for NBA/NAAC placement criteriaStudent handoutsFormula sheets, cheat sheets, "one-page-per-topic" revision notes

4. Sample Deliverable Format

Every coding topic will follow this structure:

Problem → Approach → Code (Python) → Output → Complexity → Interview follow-up questions

python

# Problem: Check whether a string is a palindrome
# Approach: Two-pointer comparison, O(n) time, O(1) space

def is_palindrome(text):
    text = ''.join(ch.lower() for ch in text if ch.isalnum())
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True

name = "Rama"
print(f"{name} -> {is_palindrome(name)}")
print(f"malayalam -> {is_palindrome('malayalam')}")
print(f"A man, a plan, a canal: Panama -> {is_palindrome('A man, a plan, a canal: Panama')}")

# Output:
# Rama -> False
# malayalam -> True
# A man, a plan, a canal: Panama -> True

Interview follow-ups: Why not text[::-1]? Handle Unicode? Recursive variant and its space cost?

5. Suggested Delivery Model

ElementRecommendationClass rhythm60 min concept + 30 min live coding + 30 min timed practiceAssessment cadenceWeekly 30-question test; bi-weekly full mockTrackingSingle spreadsheet: student × module × score × attempt countPractice platformHackerRank/LeetCode curated list, mapped to your module numbersRemedialBottom-quartile batch gets M1–M2 reinforcement in parallel

6. To Calibrate the First Deliverable

Tell me:

Batch profile — year (II/III/IV), branch mix, and approximate strength.

Total contact hours available and whether it is a fixed slot or bootcamp mode.

Priority — general placement readiness, or targeting specific companies (TCS NQT / service-based mass recruiters / product firms).

Once you give these, I will start with the session-wise lesson plan + Week-1 material (slides, 25 programs with output, and a 30-question entry-level diagnostic test with answer key) in a single response."create a dashboard to solve this problem"

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ascent-spark-platform.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0f98ee05-64eb-47b5-a7e3-a26bc58eaeea).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
