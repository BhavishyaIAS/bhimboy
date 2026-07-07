import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export async function getUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: (profile as Profile | null) ?? null };
}

export async function requireUser() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/app");
  return { user, profile };
}
