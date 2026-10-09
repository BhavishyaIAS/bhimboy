import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";

export default async function GroupIndex({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const { profile } = await getUserAndProfile();
  // Admins land on the Syllabus Detailer (tab 1); students on Prelims PYQs.
  const dest = profile?.role === "admin" ? "syllabus" : "prelims";
  redirect(`/app/g/${group}/${dest}`);
}
