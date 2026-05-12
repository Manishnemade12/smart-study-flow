import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { DailyQuizCard } from "./DailyQuizCard";
import { DailyQuizContainer } from "./DailyQuizContainer";
import { TodayQuizStatus } from "../lib/types";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle } from "lucide-react";

export function DailyQuizPage() {
  const [todayDate, setTodayDate] = useState<string>("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodayDate(today);
  }, []);

  // Fetch today's quiz status for all subjects
  const {
    data: quizzes,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["today-quiz-status", todayDate],
    queryFn: async () => {
      if (!todayDate) return [];

      const { data, error } = await supabase
        .from("today_quiz_status")
        .select("*")
        .eq("quiz_date", todayDate);

      if (error) {
        console.error("Error fetching today's quizzes:", error);
        throw error;
      }

      return (data as TodayQuizStatus[]) || [];
    },
    enabled: !!todayDate,
  });

  if (!todayDate) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Daily Quizzes</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {new Date(todayDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load quizzes. Please try again later.
          </AlertDescription>
        </Alert>
      ) : !quizzes || quizzes.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No quizzes available for today. Check back at 12 PM IST for your
            daily quizzes!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <DailyQuizCard
              key={quiz.quizId}
              quiz={quiz}
              onQuizStart={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
