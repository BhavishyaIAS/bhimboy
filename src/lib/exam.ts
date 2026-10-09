// Commission / group model for the preparation workspaces.
//
// NOTE ON CONTENT: the real syllabus, PYQs, model answers and materials
// currently loaded are all for **APPSC Group 1**. Until content is tagged by
// commission + group in the database, APPSC Group 1 is the only populated
// track; every other track shows empty states with admin upload options.

export const COMMISSIONS = {
  appsc: "Andhra Pradesh Public Service Commission",
  tgpsc: "Telangana Public Service Commission",
} as const;

export type Commission = keyof typeof COMMISSIONS;
export type ExamGroup = "1" | "2";

export function isCommission(x: string): x is Commission {
  return x === "appsc" || x === "tgpsc";
}

export function isGroup(x: string): x is ExamGroup {
  return x === "1" || x === "2";
}

export function commissionShort(c: Commission): string {
  return c.toUpperCase();
}

export function commissionFull(c: Commission): string {
  return COMMISSIONS[c];
}

/** The only track with real content right now is APPSC Group 1. */
export function trackHasContent(c: Commission, g: ExamGroup): boolean {
  return c === "appsc" && g === "1";
}
