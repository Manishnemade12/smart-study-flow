import { createFileRoute } from "@tanstack/react-router";
import { WeakTopicsPage } from "@/components/WeakTopicsPage";

export const Route = createFileRoute("/daily-quiz/weak")({
  component: WeakTopicsPage,
});
