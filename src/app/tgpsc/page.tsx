import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GroupChooser } from "@/components/landing/group-chooser";

export const metadata: Metadata = { title: "TGPSC — Choose Your Group" };

export default async function TgpscPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <GroupChooser
      loggedIn={!!user}
      commission={{
        key: "tgpsc",
        short: "TGPSC",
        full: "Telangana Public Service Commission",
      }}
    />
  );
}
