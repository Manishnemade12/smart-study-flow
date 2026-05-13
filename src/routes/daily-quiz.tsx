import { createFileRoute } from "@tanstack/react-router";
import { DailyQuizPage } from "@/components/DailyQuizPage";

export const Route = createFileRoute("/daily-quiz")({
  component: DailyQuizPage,
});
