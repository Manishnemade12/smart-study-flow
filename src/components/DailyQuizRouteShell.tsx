import { Outlet, useLocation } from "@tanstack/react-router";

import { DailyQuizPage } from "@/components/DailyQuizPage";

export function DailyQuizRouteShell() {
  const { pathname } = useLocation();

  if (pathname === "/daily-quiz" || pathname === "/daily-quiz/") {
    return <DailyQuizPage />;
  }

  return <Outlet />;
}
