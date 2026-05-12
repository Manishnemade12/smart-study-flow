import { createFileRoute } from "@tanstack/react-router";
import { DailyQuizContainer } from "../components/DailyQuizContainer";

export const Route = createFileRoute("/daily-quiz/$subjectId")({
  component: DailyQuizContainer,
});
