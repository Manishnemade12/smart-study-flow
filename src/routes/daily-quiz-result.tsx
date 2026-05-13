import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DailyQuizResultPage } from "@/components/DailyQuizResultPage";

const search = z.object({
  attemptId: z.string().optional(),
  // legacy fallback
  score: z.coerce.number().optional(),
  percentage: z.coerce.number().optional(),
});

export const Route = createFileRoute("/daily-quiz-result")({
  validateSearch: (s) => search.parse(s),
  component: DailyQuizResultPage,
});
