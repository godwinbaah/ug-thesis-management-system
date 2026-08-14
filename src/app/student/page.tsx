import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getThesisForStudent, getChaptersWithFeedback, getMeetingsForThesis } from "@/lib/queries";
import { Shell, Card, StatusBadge } from "@/components/shell";

export default async function StudentOverview() {
  const session = await requireRole("STUDENT");
  const thesis = await getThesisForStudent(session.id);

  if (!thesis) {
    return (
      <Shell user={session}>
        <Card title="No thesis registered yet">
          <p className="text-sm text-slate-600">
            Your thesis has not been registered by the departmental coordinator yet.
            Please check back later or contact the department.
          </p>
        </Card>
      </Shell>
    );
  }

  const [chapters, meetings] = await Promise.all([
    getChaptersWithFeedback(thesis.id),
    getMeetingsForThesis(thesis.id),
  ]);
  const upcomingMeetings = meetings.filter((m) => m.status === "SCHEDULED").length;
  const needsCorrection = chapters.filter((c) => c.status === "NEEDS_CORRECTION").length;

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">Overview</h1>

      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{thesis.title}</h2>
          <StatusBadge status={thesis.status} />
        </div>
        {thesis.description && (
          <p className="mb-3 text-sm text-slate-600">{thesis.description}</p>
        )}
        <h3 className="mb-1 text-sm font-medium text-slate-700">My supervisor(s)</h3>
        {thesis.supervisors.length === 0 ? (
          <p className="text-sm text-amber-700">No supervisor assigned yet — the coordinator will assign one.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {thesis.supervisors.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={s.role} />
                <span className="font-medium">{s.name}</span>
                <a className="text-blue-700 hover:underline" href={`mailto:${s.email}`}>{s.email}</a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/student/chapters">
          <Card>
            <p className="text-2xl font-bold text-blue-800">{chapters.length}</p>
            <p className="text-sm text-slate-500">
              Chapters uploaded
              {needsCorrection > 0 && (
                <span className="ml-1 text-red-600">· {needsCorrection} need correction</span>
              )}
            </p>
          </Card>
        </Link>
        <Link href="/student/meetings">
          <Card>
            <p className="text-2xl font-bold text-blue-800">{upcomingMeetings}</p>
            <p className="text-sm text-slate-500">Upcoming meetings</p>
          </Card>
        </Link>
      </div>
    </Shell>
  );
}
