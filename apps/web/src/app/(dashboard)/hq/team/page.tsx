import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getTeamMembers, getTeamStats } from "@/modules/team/data";
import { TeamMemberList } from "@/modules/team/components/team-member-list";

export const metadata = {
  title: "Team Directory — Orbit by Celestia Studios",
  description: "Manage Celestia Studios team members and client responsibilities.",
};

export const dynamic = "force-dynamic";

export default async function HqTeamPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq/team");
  }

  if (profile.role !== "SUPER_ADMIN") {
    redirect("/client");
  }

  const [members, stats] = await Promise.all([
    getTeamMembers(),
    getTeamStats(),
  ]);

  return (
    <OrbitShell profile={profile} basePath="/hq">
      <div className="max-w-7xl mx-auto space-y-8">
        <TeamMemberList initialMembers={members} stats={stats} />
      </div>
    </OrbitShell>
  );
}
