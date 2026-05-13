export type QuizType = "mcq" | "true_false" | "one_line";

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuizType;
  options?: string[];
  answer: string;
  explanation?: string;
}

export interface Term {
  term: string;
  meaning: string;
}

export interface Chunk {
  id: string;
  subjectId: string;
  parentChunkId: string | null;
  title: string;
  order: number;
  summary: string;
  notes: string;
  keyPoints: string[];
  terms: Term[];
  quiz: QuizQuestion[];
  revised: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  createdAt: number;
}

export interface AppData {
  subjects: Subject[];
  chunks: Chunk[];
}

// ============= DAILY QUIZ TYPES =============

export type DailyQuizQuestion = Omit<QuizQuestion, "id"> & { id?: string };

export interface DailyQuiz {
  id: string;
  userId: string;
  subjectId: string;
  quizDate: string;  // YYYY-MM-DD
  questions: DailyQuizQuestion[];
  totalQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  source: "ai" | "pyq" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface QuizAnswer {
  questionIdx: number;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface DailyQuizAttempt {
  id: string;
  userId: string;
  dailyQuizId: string;
  subjectId: string;
  quizDate: string;
  answers: QuizAnswer[];
  score: number;  // correct answers count
  totalQuestions: number;
  percentage: number;
  timeTaken?: number;  // in seconds
  completed: boolean;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyQuizConfig {
  id: string;
  userId: string;
  enabled: boolean;
  scheduleTime: string;  // HH:mm:ss (default 12:00:00)
  timezone: string;  // default Asia/Kolkata
  difficulty: "easy" | "medium" | "hard" | "mixed";
  includePyq: boolean;
  numQuestions: number;  // per quiz
  createdAt: string;
  updatedAt: string;
}

export interface TodayQuizStatus {
  userId: string;
  subjectId: string;
  subjectName: string;
  quizId: string;
  totalQuestions: number;
  difficulty: string;
  attemptsCompleted: number;
  bestScore: number;
  lastAttemptAt?: string;
  isAttempted: boolean;
}

export interface DailyQuizStats {
  userId: string;
  subjectId: string;
  subjectName: string;
  quizDate: string;
  attempts: number;
  avgPercentage: number;
  bestScore: number;
  worstScore: number;
}