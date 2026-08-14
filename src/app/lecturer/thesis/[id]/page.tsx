import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db, theses, users } from "@/db";
import { requireRole } from "@/lib/auth";
import {
  lecturerSupervises,
  getChaptersWithFeedback,
  getMeetingsForThesis,
  getSupervisors,
} from "@/lib/queries";
import { markThesisCompleted, cancelMeeting } from "@/app/actions";
import { Shell, Card, StatusBadge } from "@/components/shell";
import { FeedbackForm, ScheduleMeetingForm } from "@/components/forms";

export default async function LecturerThesisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("LECTURER");
  const thesisId = Number((await params).id);
  if (!Number.isInteger(thesisId)) notFound();

  const assignment = await lecturerSupervises(session.id, thesisId);
  if (!assignment) redirect("/lecturer");

  const [thesis] = await db
    .select({
      id: theses.id,
      title: theses.title,
      description: theses.description,
      status: theses.status,
      academicYear: theses.academicYear,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(theses)
    .innerJoin(users, eq(users.id, theses.studentId))
    .where(eq(theses.id, thesisId));
  if (!thesis) notFound();

  const [chapterList, meetingList, supervisors] = await Promise.all([
    getChaptersWithFeedback(thesisId),
    getMeetingsForThesis(thesisId),
    getSupervisors(thesisId),
  ]);

  return (
    <Shell user={session}>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{thesis.title}</h1>
          <StatusBadge status={thesis.status} />
          <StatusBadge status={assignment.role} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Student: <b>{thesis.studentName}</b> ·{" "}
          <a className="text-blue-700 hover:underline" href={`mailto:${thesis.studentEmail}`}>
            {thesis.studentEmail}
          </a>{" "}
          · {thesis.academicYear}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Supervision team: {supervisors.map((s) => `${s.name} (${s.role === "PRIMARY" ? "Primary" : "Co"})`).join(", ")}
        </p>
        {thesis.status === "IN_PROGRESS" && assignment.role === "PRIMARY" && (
          <form action={markThesisCompleted} className="mt-3">
            <input type="hidden" name="thesisId" value={thesis.id} />
            <button className="rounded border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50">
              Mark thesis completed
            </button>
          </form>
        )}
      </Card>

      <Card title={`Submitted chapters (${chapterList.length})`}>
        {chapterList.length === 0 && (
          <p className="text-sm text-slate-500">The student has not uploaded any chapters yet.</p>
        )}
        <ul className="space-y-3">
          {chapterList.map((c) => (
            <li
              key={c.id}
              className={`rounded border p-3 ${
                c.status === "SUBMITTED"
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Chapter {c.number}: {c.title}</span>
                <span className="text-xs text-slate-500">v{c.version}</span>
                <StatusBadge status={c.status} />
                <a
                  className="ml-auto text-sm text-blue-700 hover:underline"
                  href={`/api/chapters/${c.id}/download`}
                >
                  Download {c.fileName}
                </a>
              </div>
              <p className="text-xs text-slate-400">Submitted {c.submittedAt} UTC</p>
              {c.feedback.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                  {c.feedback.map((f) => (
                    <p key={f.id} className="text-sm text-slate-700">
                      <b>{f.lecturerName}</b>{" "}
                      <span className="text-xs text-slate-400">({f.createdAt} UTC)</span>: {f.message}
                    </p>
                  ))}
                </div>
              )}
              <FeedbackForm chapterId={c.id} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Schedule a meeting with the student">
        <ScheduleMeetingForm thesisId={thesis.id} />
      </Card>

      <Card title="Meetings">
        {meetingList.length === 0 && <p className="text-sm text-slate-500">No meetings yet.</p>}
        <ul className="space-y-2">
          {meetingList.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(m.scheduledAt).toLocaleString()} · {m.durationMinutes} min · by {m.createdByName}
                </p>
                {m.agenda && <p className="text-xs text-slate-500">Agenda: {m.agenda}</p>}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <StatusBadge status={m.status} />
                {m.status === "SCHEDULED" && (
                  <>
                    <a className="text-blue-700 hover:underline" href={m.jitsiUrl} target="_blank">
                      Join video call
                    </a>
                    <a className="text-blue-700 hover:underline" href={`/api/meetings/${m.id}/ics`}>
                      Add to calendar
                    </a>
                    <form action={cancelMeeting}>
                      <input type="hidden" name="meetingId" value={m.id} />
                      <button className="text-xs text-red-600 hover:underline">Cancel</button>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Shell>
  );
}
