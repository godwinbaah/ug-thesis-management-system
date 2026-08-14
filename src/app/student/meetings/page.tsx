import { requireRole } from "@/lib/auth";
import { getThesisForStudent, getMeetingsForThesis } from "@/lib/queries";
import { cancelMeeting } from "@/app/actions";
import { Shell, Card, StatusBadge } from "@/components/shell";
import { ScheduleMeetingForm } from "@/components/forms";

export default async function StudentMeetings() {
  const session = await requireRole("STUDENT");
  const thesis = await getThesisForStudent(session.id);

  if (!thesis) {
    return (
      <Shell user={session}>
        <Card title="No thesis registered yet">
          <p className="text-sm text-slate-600">
            Your thesis has not been registered by the departmental coordinator yet.
          </p>
        </Card>
      </Shell>
    );
  }

  const meetingList = await getMeetingsForThesis(thesis.id);

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">Meetings</h1>

      <Card title="Schedule a supervision meeting">
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
