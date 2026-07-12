// Hand-maintained database types matching supabase/migrations.
// If the schema changes, update these types alongside the migration.

import type { ExamId } from "@/lib/exams";

export type ContentStatus = "draft" | "published";
export type ExamStage = "prelims" | "mains";
export type Role = "admin" | "student";
export type CorrectOption = "A" | "B" | "C" | "D";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Paper {
  id: string;
  name: string;
  stage: ExamStage;
  exam: ExamId;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  paper_id: string;
  name: string;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface Microtheme {
  id: string;
  topic_id: string;
  name: string;
  code: string;
  slug: string;
  sort_order: number;
  status: ContentStatus;
  // Coverage-plan metadata (added in migration 0004; optional until run)
  priority?: 1 | 2 | 3; // 1 core · 2 important · 3 supporting
  est_minutes?: number | null;
  exam_overlap?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  microtheme_id: string;
  content: unknown; // TipTap JSON document
  content_text: string;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  microtheme_id: string;
  youtube_url: string;
  title: string;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface GlossaryTerm {
  id: string;
  microtheme_id: string;
  term: string;
  definition: string;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface PrelimsQuestion {
  id: string;
  microtheme_id: string;
  year: number;
  paper_label: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: CorrectOption;
  explanation: string | null;
  keywords: string[];
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface MainsQuestion {
  id: string;
  microtheme_id: string;
  year: number;
  paper_label: string;
  question_text: string;
  directive_word: string | null;
  marks: number | null;
  model_answer: unknown | null; // TipTap JSON document
  model_answer_text: string;
  keywords: string[];
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface BulkUploadLog {
  id: string;
  filename: string;
  type: ExamStage;
  rows_total: number;
  rows_inserted: number;
  rows_failed: number;
  error_report: unknown;
  uploaded_by: string | null;
  created_at: string;
}

// Convenience joined shapes used across the app
export interface MicrothemeWithPath extends Microtheme {
  topic: Topic & { subject: Subject & { paper: Paper } };
}

export interface SyllabusTree {
  papers: (Paper & {
    subjects: (Subject & {
      topics: (Topic & { microthemes: Microtheme[] })[];
    })[];
  })[];
}
