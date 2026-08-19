import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, FolderKanban, ArrowRight } from "lucide-react";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getClientStats } from "@/modules/clients/data";
import { getProjectStats } from "@/modules/projects/data";
import { getUpcomingMeetingsForAdmin } from "@/modules/meetings/data";
import { UpcomingMeetingsHqCard } from "@/modules/meetings/components/upcoming-meetings-hq-card";

export const metadata = {
  title: "HQ — Orbit",
  description: "Internal operating system for Celestia Studios.",
};

export const dynamic = "force-dynamic";

export default async function HqPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq");
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const [clientStats, projectStats, upcomingMeetings] = await Promise.all([
    getClientStats(),
    getProjectStats(),
    getUpcomingMeetingsForAdmin(3),
  ]);

  const firstName = profile.first_name || "there";

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title={`Namaste, ${firstName}`}
      description="Celestia Studios Headquarters"
    >
      <div className="space-y-8">
        {/* Operational Metric Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-mono">
                Active Clients
              </CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {clientStats.active}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Total clients registered: {clientStats.total}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-mono">
                Active Projects
              </CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {projectStats.active}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Total projects tracked: {projectStats.total}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Meetings Widget */}
        <UpcomingMeetingsHqCard meetings={upcomingMeetings} />

        {/* Operational Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/hq/clients" className="block group">
            <Card className="border-border/70 bg-card group-hover:border-border transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 group-hover:text-primary transition-colors">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Clients</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Manage company accounts and client workspace records.
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-xs text-muted-foreground">
                  View full client directory, contact information, and linked projects.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hq/projects" className="block group">
            <Card className="border-border/70 bg-card group-hover:border-border transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40 group-hover:text-primary transition-colors">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Projects</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Track service engagements, delivery milestones, and tasks.
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Manage active deliverables across Brand Foundation, SaaS, and Growth systems.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </OrbitShell>
  );
}
