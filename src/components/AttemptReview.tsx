/**
 * Question-wise review of a submitted attempt. Only renders once the trainer
 * releases results — the underlying routine enforces that server-side too.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";

import { getAttemptReview } from "@/lib/tests.functions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewRow = {
  question_id: string;
  sort_order: number;
  prompt: string;
  options: unknown;
  answer: string | null;
  explanation: string | null;
  marks: number;
  qtype: string;
  given: string | null;
};

export function AttemptReview({ testId }: { testId: string }) {
  const fetchReview = useServerFn(getAttemptReview);
  const review = useQuery({
    queryKey: ["attempt-review", testId],
    queryFn: () => fetchReview({ data: { test_id: testId } }),
  });

  if (review.isLoading) return <Skeleton className="h-40 w-full" />;
  if (review.isError)
    return (
      <p className="text-sm text-muted-foreground">
        {(review.error as Error).message || "Review is not available yet."}
      </p>
    );

  const rows = (review.data?.rows ?? []) as ReviewRow[];
  const correct = rows.filter((r) => r.given && r.given === r.answer).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Answer review</CardTitle>
        <CardDescription>
          {correct} of {rows.length} correct
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r, idx) => {
          const options = Array.isArray(r.options) ? (r.options as unknown[]) : [];
          const isCorrect = !!r.given && r.given === r.answer;
          return (
            <div key={r.question_id} className="space-y-1.5 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-start gap-2">
                <Badge variant={isCorrect ? "default" : "destructive"} className="mt-0.5 gap-1">
                  {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {isCorrect ? r.marks : 0}/{r.marks}
                </Badge>
                <p className="text-sm font-medium leading-relaxed">
                  {idx + 1}. {r.prompt}
                </p>
              </div>
              <ul className="ml-1 grid gap-0.5 text-xs sm:grid-cols-2">
                {options.map((opt, i) => {
                  const text = String(opt);
                  const isAnswer = text === r.answer;
                  const isGiven = text === r.given;
                  return (
                    <li
                      key={i}
                      className={
                        isAnswer
                          ? "font-medium text-foreground"
                          : isGiven
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }
                    >
                      {String.fromCharCode(65 + i)}. {text}
                      {isAnswer ? "  ✓ correct" : ""}
                      {isGiven && !isAnswer ? "  ← your answer" : ""}
                    </li>
                  );
                })}
              </ul>
              {!r.given && <p className="text-xs text-muted-foreground">Not answered.</p>}
              {r.explanation && (
                <p className="text-xs text-muted-foreground">Why: {r.explanation}</p>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing to review for this test.</p>
        )}
      </CardContent>
    </Card>
  );
}
