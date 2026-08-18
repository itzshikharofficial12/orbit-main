import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";

export default async function HomePage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  redirect("/hq");
}
