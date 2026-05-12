import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import {
  DailyQuiz,
  DailyQuizQuestion,
  QuizAnswer,
  DailyQuizAttempt,
} from "../lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, CheckCircle, X } from "lucide-react";

export function DailyQuizContainer() {
  const { subjectId } = useParams({ from: "/daily-quiz/$subjectId" });
  const navigate = useNavigate();

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [startTime] = useState<number>(Date.now());

  const today = new Date().toISOString().split("T")[0];

  // Fetch quiz
  const {
    data: quiz,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["daily-quiz", subjectId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_quizzes")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("quiz_date", today)
        .single();

      if (error) {
        console.error("Error fetching quiz:", error);
        throw error;
      }

      return data as DailyQuiz;
    },
  });

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!quiz) return;

      // Calculate score
      const answers: QuizAnswer[] = [];
      let score = 0;

      quiz.questions.forEach((q: DailyQuizQuestion, idx: number) => {
        const userAnswer = selectedAnswers[idx];
        const isCorrect = userAnswer === q.answer;
        if (isCorrect) score++;

        answers.push({
          questionIdx: idx,
          selectedAnswer: userAnswer || "",
          isCorrect,
        });
      });

      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const percentage = (score / quiz.questions.length) * 100;

      // Store attempt in database
      const { error } = await supabase.from("daily_quiz_attempts").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        daily_quiz_id: quiz.id,
        subject_id: quiz.subjectId,
        quiz_date: today,
        answers,
        score,
        total_questions: quiz.totalQuestions,
        percentage,
        time_taken: timeTaken,
        completed: true,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      return { score, percentage, timeTaken };
    },
    onSuccess: (data) => {
      if (data) {
        navigate({ to: "/daily-quiz-result", search: { score: data.score, percentage: data.percentage } });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load quiz. Please go back and try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: "/daily-quiz" })} className="mt-4">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIdx] as DailyQuizQuestion;
  const progress = ((currentQuestionIdx + 1) / quiz.questions.length) * 100;
  const selectedAnswer = selectedAnswers[currentQuestionIdx] || "";

  const handleAnswerChange = (answer: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIdx < quiz.questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedAnswers).length < quiz.questions.length) {
      Alert.alert("Please answer all questions before submitting");
      return;
    }
    submitQuizMutation.mutate();
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Daily Quiz</h1>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Question {currentQuestionIdx + 1} of {quiz.questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          <CardDescription>
            Difficulty: {quiz.difficulty} • Select one correct answer
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <RadioGroup value={selectedAnswer} onValueChange={handleAnswerChange}>
            <div className="space-y-4">
              {currentQuestion.options?.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label
                    htmlFor={`option-${idx}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-4 mb-6">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentQuestionIdx === 0}
          className="flex-1"
        >
          ← Previous
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentQuestionIdx === quiz.questions.length - 1}
          className="flex-1"
        >
          Next →
        </Button>
      </div>

      {/* Question Navigation Grid */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-sm font-semibold mb-3">Questions</p>
        <div className="grid grid-cols-5 gap-2">
          {quiz.questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestionIdx(idx)}
              className={`
                aspect-square rounded-lg font-semibold text-sm transition-all
                ${
                  idx === currentQuestionIdx
                    ? "bg-blue-600 text-white border-2 border-blue-700"
                    : selectedAnswers[idx]
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300"
                      : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                }
              `}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        className="w-full"
        size="lg"
        disabled={
          submitQuizMutation.isPending ||
          Object.keys(selectedAnswers).length < quiz.questions.length
        }
      >
        {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
      </Button>
    </div>
  );
}
