import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GroupChooser } from "@/components/landing/group-chooser";

export const metadata: Metadata = { title: "APPSC — Choose Your Group" };

export default async function AppscPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <GroupChooser
      loggedIn={!!user}
      commission={{
        short: "APPSC",
        full: "Andhra Pradesh Public Service Commission",
      }}
    />
  );
}
