import { createFileRoute } from "@tanstack/react-router";
import { RevisionReportPage } from "@/components/RevisionReportPage";

export const Route = createFileRoute("/daily-quiz/revision")({
  component: RevisionReportPage,
});
