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