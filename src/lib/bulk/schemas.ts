// Shared bulk-upload row schemas and template definitions, used by both
// the client (template generation, error report) and server (validation).
import { z } from "zod";

export const PRELIMS_COLUMNS = [
  "microtheme_code",
  "year",
  "paper_label",
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
  "explanation",
  "tags",
  "keywords",
  "status",
] as const;

export const MAINS_COLUMNS = [
  "microtheme_code",
  "year",
  "paper_label",
  "question_text",
  "directive_word",
  "marks",
  "model_answer",
  "tags",
  "keywords",
  "status",
] as const;

const commaList = z
  .string()
  .optional()
  .default("")
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  );

const cell = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export const prelimsRowSchema = z.object({
  microtheme_code: z.string().min(1, "microtheme_code is required"),
  year: z.coerce
    .number({ message: "year must be a number like 2019" })
    .int("year must be a whole number")
    .min(1950, "year looks too old")
    .max(2100, "year looks wrong"),
  paper_label: z.string().min(1, "paper_label is required"),
  question_text: z.string().min(1, "question_text is required"),
  option_a: z.string().min(1, "option_a is required"),
  option_b: z.string().min(1, "option_b is required"),
  option_c: z.string().min(1, "option_c is required"),
  option_d: z.string().min(1, "option_d is required"),
  correct_option: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["A", "B", "C", "D"], { message: "correct_option must be A, B, C or D" })),
  explanation: z.string().optional().default(""),
  tags: commaList,
  keywords: commaList,
  status: z
    .string()
    .optional()
    .default("")
    .transform((s) => s.toLowerCase().trim())
    .pipe(
      z
        .enum(["draft", "published", ""], {
          message: "status must be draft or published",
        })
        .transform((s) => (s === "" ? "draft" : s))
    ),
});

export const mainsRowSchema = z.object({
  microtheme_code: z.string().min(1, "microtheme_code is required"),
  year: z.coerce
    .number({ message: "year must be a number like 2019" })
    .int("year must be a whole number")
    .min(1950, "year looks too old")
    .max(2100, "year looks wrong"),
  paper_label: z.string().min(1, "paper_label is required"),
  question_text: z.string().min(1, "question_text is required"),
  directive_word: z.string().optional().default(""),
  marks: z
    .string()
    .optional()
    .default("")
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 1 || n > 250) {
        ctx.addIssue({ code: "custom", message: "marks must be a whole number between 1 and 250" });
        return z.NEVER;
      }
      return n;
    }),
  model_answer: z.string().optional().default(""),
  tags: commaList,
  keywords: commaList,
  status: z
    .string()
    .optional()
    .default("")
    .transform((s) => s.toLowerCase().trim())
    .pipe(
      z
        .enum(["draft", "published", ""], {
          message: "status must be draft or published",
        })
        .transform((s) => (s === "" ? "draft" : s))
    ),
});

export type PrelimsRow = z.output<typeof prelimsRowSchema>;
export type MainsRow = z.output<typeof mainsRowSchema>;

// Normalize a raw sheet row (keys may have stray case/spacing; cells may be
// numbers) into a string-record keyed by our canonical column names.
export function normalizeRow(
  raw: Record<string, unknown>,
  columns: readonly string[]
): Record<string, string> {
  const lookup = new Map<string, unknown>();
  for (const [k, v] of Object.entries(raw)) {
    lookup.set(k.trim().toLowerCase(), v);
  }
  const out: Record<string, string> = {};
  for (const col of columns) {
    out[col] = cell(lookup.get(col));
  }
  return out;
}

export interface RowValidation {
  rowNumber: number; // 1-based spreadsheet row (headers = row 1)
  raw: Record<string, string>;
  errors: string[];
}

export const SAMPLE_PRELIMS_ROW: Record<(typeof PRELIMS_COLUMNS)[number], string> = {
  microtheme_code: "POL-CF-001",
  year: "2019",
  paper_label: "Prelims Paper 1",
  question_text:
    "Which Constitutional Amendment Act gave constitutional status to Panchayati Raj Institutions?",
  option_a: "71st Amendment",
  option_b: "72nd Amendment",
  option_c: "73rd Amendment",
  option_d: "74th Amendment",
  correct_option: "C",
  explanation:
    "The 73rd Constitutional Amendment Act, 1992 gave constitutional status to PRIs.",
  tags: "panchayati raj, amendments",
  keywords: "73rd amendment, local government",
  status: "draft",
};

export const SAMPLE_MAINS_ROW: Record<(typeof MAINS_COLUMNS)[number], string> = {
  microtheme_code: "POL-CF-001",
  year: "2020",
  paper_label: "Mains Paper 3",
  question_text:
    "Critically examine the working of the 73rd Constitutional Amendment in Andhra Pradesh.",
  directive_word: "critically examine",
  marks: "15",
  model_answer:
    "Introduce the 73rd Amendment, then examine devolution of funds, functions and functionaries in AP, and conclude with reforms.",
  tags: "panchayati raj, devolution",
  keywords: "73rd amendment, three Fs",
  status: "draft",
};
