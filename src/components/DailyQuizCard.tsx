import { TodayQuizStatus } from "../lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle, Clock, BookOpen } from "lucide-react";

interface DailyQuizCardProps {
  quiz: TodayQuizStatus;
  onQuizStart?: () => void;
}

export function DailyQuizCard({ quiz, onQuizStart }: DailyQuizCardProps) {
  const router = useRouter();

  const handleStartQuiz = () => {
    router.navigate({
      to: `/daily-quiz/$subjectId`,
      params: { subjectId: quiz.subjectId },
    });
    onQuizStart?.();
  };

  const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{quiz.subjectName}</CardTitle>
            <CardDescription>
              {quiz.totalQuestions} Questions • {quiz.difficulty}
            </CardDescription>
          </div>
          <Badge className={difficultyColors[quiz.difficulty]}>
            {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-gray-600 dark:text-gray-400">Questions</p>
                <p className="font-semibold">{quiz.totalQuestions}</p>
              </div>
            </div>
            {quiz.isAttempted && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Best Score</p>
                  <p className="font-semibold">{quiz.bestScore.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Attempt Status */}
          {quiz.isAttempted && quiz.lastAttemptAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Last attempt:{" "}
              {new Date(quiz.lastAttemptAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleStartQuiz}
            className="w-full"
            variant={quiz.isAttempted ? "outline" : "default"}
          >
            {quiz.isAttempted ? "Retake Quiz" : "Start Quiz"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
