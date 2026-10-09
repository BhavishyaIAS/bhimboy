// Commission / group model for the preparation workspaces.
//
// NOTE ON CONTENT: the real syllabus, PYQs, model answers and materials
// currently loaded are all for **APPSC Group 1**. Until content is tagged by
// commission + group in the database, APPSC Group 1 is the only populated
// track; every other track shows empty states with admin upload options.

import type { Commission, ExamGroup } from "@/lib/database.types";

export type { Commission, ExamGroup };

export const COMMISSIONS: Record<Commission, string> = {
  appsc: "Andhra Pradesh Public Service Commission",
  tgpsc: "Telangana Public Service Commission",
};

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
