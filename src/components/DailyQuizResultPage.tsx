import { useSearch } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { CheckCircle, Circle } from "lucide-react";

export function DailyQuizResultPage() {
  const search = useSearch({ from: "/daily-quiz-result" });
  const router = useRouter();

  const score = (search as any)?.score || 0;
  const percentage = (search as any)?.percentage || 0;

  const getGrade = (pct: number): { grade: string; color: string; message: string } => {
    if (pct >= 90) return { grade: "A+", color: "text-green-600", message: "Excellent!" };
    if (pct >= 80) return { grade: "A", color: "text-green-500", message: "Great Job!" };
    if (pct >= 70) return { grade: "B", color: "text-blue-500", message: "Good!" };
    if (pct >= 60) return { grade: "C", color: "text-yellow-600", message: "Okay" };
    return { grade: "F", color: "text-red-600", message: "Keep Practicing!" };
  };

  const gradeInfo = getGrade(percentage);

  return (
    <div className="container mx-auto py-12 max-w-md">
      <Card className="text-center">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
          <CardDescription>{gradeInfo.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grade Circle */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-5xl font-bold ${gradeInfo.color}`}>
                  {gradeInfo.grade}
                </div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Score Details */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Correct Answers</span>
              <span className="font-semibold">{score}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Your Score</span>
              <span className="font-semibold">{percentage.toFixed(1)}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-sm text-left">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <Circle className="h-4 w-4 fill-blue-500 text-blue-500" />
              Tips for Better Performance
            </p>
            <ul className="space-y-1 text-gray-700 dark:text-gray-300">
              <li>✓ Review topics where you scored lower</li>
              <li>✓ Practice similar questions daily</li>
              <li>✓ Take the quiz again to improve</li>
              <li>✓ Focus on weak areas</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={() => router.navigate({ to: "/daily-quiz" })}
              className="w-full"
            >
              Back to Quizzes
            </Button>
            <Button
              onClick={() => router.navigate({ to: "/dashboard" })}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
