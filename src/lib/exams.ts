// Exam verticals hosted on the platform. Each exam owns its own
// papers → subjects → topics → micro-themes tree (papers.exam).
//
// Shared by server and client code — keep this file dependency-free.

export type ExamId = "appsc" | "upsc";

export interface ExamMeta {
  id: ExamId;
  /** Short name used in navigation. */
  label: string;
  /** Full name used in page titles. */
  name: string;
  /** One-line student-facing description for the explorer page. */
  tagline: string;
}

export const EXAMS: Record<ExamId, ExamMeta> = {
  appsc: {
    id: "appsc",
    label: "APPSC",
    name: "APPSC Group-1",
    tagline:
      "The living APPSC Group-1 syllabus. Walk it paper by paper — every branch a topic, every leaf a micro-theme.",
  },
  upsc: {
    id: "upsc",
    label: "UPSC",
    name: "UPSC Civil Services",
    tagline:
      "The UPSC Civil Services syllabus, paper by paper — every branch a topic, every leaf a micro-theme.",
  },
};

export const EXAM_IDS = Object.keys(EXAMS) as ExamId[];

export function isExamId(value: string): value is ExamId {
  return value in EXAMS;
}

export const DEFAULT_EXAM: ExamId = "appsc";
