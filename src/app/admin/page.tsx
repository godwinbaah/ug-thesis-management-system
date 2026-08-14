import { sql } from "drizzle-orm";
import { db, users, theses, supervisorAssignments } from "@/db";
import { requireRole } from "@/lib/auth";
import { getChapterStatusCounts, getSupervisionLoad } from "@/lib/queries";
import { Shell, Card } from "@/components/shell";
import { StackedBar, BarList, StatTile } from "@/components/charts";
import { UsersIcon, BookIcon, CheckCircleIcon, LinkIcon } from "@/components/icons";

// Validated palette (see docs/System_Design.md §6): categorical blue/orange/green
// pass CVD-separation checks together; green/orange double as the status colors
// (good / needs attention) used consistently across the badges elsewhere in the app.
const BLUE = "#2a78d6";
const ORANGE = "#eb6834";
const GREEN = "#0ca30c";

export default async function AdminOverview() {
  const session = await requireRole("ADMIN");
  const [[userCount], [thesisCount], [completedCount], [assignmentCount], chapterCounts, supervisionLoad] =
    await Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(users),
      db.select({ n: sql<number>`count(*)` }).from(theses),
      db.select({ n: sql<number>`count(*)` }).from(theses).where(sql`status = 'COMPLETED'`),
      db.select({ n: sql<number>`count(*)` }).from(supervisorAssignments),
      getChapterStatusCounts(),
      getSupervisionLoad(),
    ]);

  const inProgressCount = thesisCount.n - completedCount.n;

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">Coordinator Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Users" value={userCount.n} icon={UsersIcon} gradient="from-blue-500 to-blue-700" />
        <StatTile label="Theses" value={thesisCount.n} icon={BookIcon} gradient="from-violet-500 to-violet-700" />
        <StatTile
          label="Completed theses"
          value={completedCount.n}
          icon={CheckCircleIcon}
          gradient="from-emerald-500 to-emerald-700"
        />
        <StatTile
          label="Supervision assignments"
          value={assignmentCount.n}
          icon={LinkIcon}
          gradient="from-amber-500 to-amber-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Thesis status">
          <StackedBar
            segments={[
              { label: "In progress", value: inProgressCount, color: BLUE },
              { label: "Completed", value: completedCount.n, color: GREEN },
            ]}
          />
        </Card>

        <Card title="Chapter review status">
          <StackedBar
            segments={[
              { label: "Submitted", value: chapterCounts.SUBMITTED, color: BLUE },
              { label: "Needs correction", value: chapterCounts.NEEDS_CORRECTION, color: ORANGE },
              { label: "Approved", value: chapterCounts.APPROVED, color: GREEN },
            ]}
          />
        </Card>
      </div>

      <Card title="Supervision load per lecturer">
        <BarList
          rows={supervisionLoad.map((r) => ({ label: r.lecturerName, value: r.n }))}
          color={BLUE}
          emptyLabel="No supervisors assigned yet."
        />
      </Card>

      <Card title="What you can do here">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Create accounts for students, lecturers and finance staff under <b>Users</b>.</li>
          <li>Register theses and assign a primary supervisor — plus co-supervisors for collaborative supervision — under <b>Theses</b>.</li>
          <li>Students and lecturers immediately see their assignments when they sign in.</li>
        </ul>
      </Card>
    </Shell>
  );
}
