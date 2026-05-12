import { createFileRoute } from "@tanstack/react-router";
import { DailyQuizResultPage } from "../components/DailyQuizResultPage";

export const Route = createFileRoute("/daily-quiz-result")({
  component: DailyQuizResultPage,
});
