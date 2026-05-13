import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DailyQuizContainer } from "@/components/DailyQuizContainer";

const search = z.object({
  quizId: z.string().optional(),
  timer: z.coerce.number().min(1).max(180).optional(),
});

export const Route = createFileRoute("/daily-quiz/")({
  validateSearch: (s) => search.parse(s),
  component: DailyQuizContainer,
});
