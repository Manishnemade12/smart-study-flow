import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { DailyQuizConfig } from "../lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";

export function DailyQuizSettingsPage() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<DailyQuizConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch quiz config
  const { data, isLoading, error } = useQuery({
    queryKey: ["daily-quiz-config"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error("Not authenticated");

      const { data: configData, error } = await supabase
        .from("daily_quiz_config")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return configData as DailyQuizConfig | null;
    },
  });

  useEffect(() => {
    if (data) {
      setConfig(data);
    }
  }, [data]);

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updatedConfig: Partial<DailyQuizConfig>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("daily_quiz_config")
        .update(updatedConfig as any)
        .eq("user_id", userData.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-quiz-config"] });
      toast.success("Settings saved successfully!");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const handleConfigChange = async (
    key: keyof DailyQuizConfig,
    value: any
  ) => {
    const updatedConfig = { ...config, [key]: value } as DailyQuizConfig;
    setConfig(updatedConfig);
    await updateConfigMutation.mutateAsync({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl space-y-6">
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load settings. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Daily Quiz Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your daily quiz preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Configuration</CardTitle>
          <CardDescription>
            Customize how your daily quizzes are generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <Label className="text-base font-semibold">Enable Daily Quizzes</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Receive daily quizzes every day at your scheduled time
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                handleConfigChange("enabled", checked)
              }
            />
          </div>

          {config.enabled && (
            <>
              {/* Schedule Time */}
              <div>
                <Label htmlFor="schedule-time" className="font-semibold mb-2 block">
                  Quiz Time
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="schedule-time"
                    type="time"
                    value={config.scheduleTime.substring(0, 5)}
                    onChange={(e) => {
                      const time = `${e.target.value}:00`;
                      handleConfigChange("scheduleTime", time);
                    }}
                    className="max-w-32"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {config.timezone}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Quizzes will be generated daily at this time
                </p>
              </div>

              {/* Difficulty Level */}
              <div>
                <Label htmlFor="difficulty" className="font-semibold mb-2 block">
                  Default Difficulty
                </Label>
                <Select
                  value={config.difficulty}
                  onValueChange={(value) =>
                    handleConfigChange(
                      "difficulty",
                      value as "easy" | "medium" | "hard" | "mixed"
                    )
                  }
                >
                  <SelectTrigger id="difficulty" className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Choose the difficulty level for your quizzes
                </p>
              </div>

              {/* Number of Questions */}
              <div>
                <Label htmlFor="num-questions" className="font-semibold mb-2 block">
                  Questions Per Quiz
                </Label>
                <Input
                  id="num-questions"
                  type="number"
                  min="5"
                  max="50"
                  value={config.numQuestions}
                  onChange={(e) =>
                    handleConfigChange(
                      "numQuestions",
                      Math.max(5, Math.min(50, parseInt(e.target.value) || 10))
                    )
                  }
                  className="max-w-32"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Number of questions per quiz (5-50)
                </p>
              </div>

              {/* Include PYQ */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <Label className="text-base font-semibold">
                    Include Previous Year Questions
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Include PYQs from official SSC exams
                  </p>
                </div>
                <Switch
                  checked={config.includePyq}
                  onCheckedChange={(checked) =>
                    handleConfigChange("includePyq", checked)
                  }
                />
              </div>
            </>
          )}

          {/* Status Message */}
          {config.enabled && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Your daily quizzes are enabled! You'll receive {config.numQuestions} questions
                at {config.scheduleTime.substring(0, 5)} {config.timezone} daily for each subject.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div >
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="text-2xl font-bold">
                {config.enabled ? (
                  <span className="text-green-600">✓ Active</span>
                ) : (
                  <span className="text-gray-500">○ Inactive</span>
                )}
              </p>
            </div>
            <div >
              <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled Time</p>
              <p className="text-2xl font-bold">{config.scheduleTime.substring(0, 5)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
