import { notFound, redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { isCommission, isGroup } from "@/lib/exam";

export default async function GroupIndex({
  params,
}: {
  params: Promise<{ commission: string; group: string }>;
}) {
  const { commission, group } = await params;
  if (!isCommission(commission) || !isGroup(group)) notFound();

  const { profile } = await getUserAndProfile();
  const dest = profile?.role === "admin" ? "syllabus" : "prelims";
  redirect(`/app/g/${commission}/${group}/${dest}`);
}
