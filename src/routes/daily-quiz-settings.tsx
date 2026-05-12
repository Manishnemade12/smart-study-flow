import { createFileRoute } from "@tanstack/react-router";
import { DailyQuizSettingsPage } from "../components/DailyQuizSettingsPage";

export const Route = createFileRoute("/daily-quiz-settings")({
  component: DailyQuizSettingsPage,
});
