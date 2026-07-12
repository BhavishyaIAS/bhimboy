import { redirect } from "next/navigation";
import { DEFAULT_EXAM } from "@/lib/exams";

// The syllabus module is split into exam verticals (APPSC / UPSC).
// Old links to /app/syllabus land on the default exam.
export default function SyllabusIndexPage() {
  redirect(`/app/syllabus/${DEFAULT_EXAM}`);
}
