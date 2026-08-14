import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  getThesesForLecturer,
  getPendingChaptersForLecturer,
  getPendingReviewCountsByThesis,
  getUpcomingMeetingsForLecturer,
  getPaymentStatusForLecturer,
  getPaymentRate,
} from "@/lib/queries";
import { Shell, Card, StatusBadge } from "@/components/shell";
import { StackedBar, StatTile } from "@/components/charts";
import { BookIcon, DocumentIcon, CalendarIcon, CheckCircleIcon } from "@/components/icons";

const BLUE = "#2a78d6";
const GREEN = "#0ca30c";

export default async function LecturerDashboard() {
  const session = await requireRole("LECTURER");
  const [assigned, pendingChapters, pendingByThesis, upcomingMeetings, paymentStatus, rate] =
    await Promise.all([
      getThesesForLecturer(session.id),
      getPendingChaptersForLecturer(session.id),
      getPendingReviewCountsByThesis(session.id),
      getUpcomingMeetingsForLecturer(session.id),
      getPaymentStatusForLecturer(session.id),
      getPaymentRate(),
    ]);

  const completedCount = assigned.filter((t) => t.status === "COMPLETED").length;
  const inProgressCount = assigned.length - completedCount;

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">My Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Theses supervised" value={assigned.length} icon={BookIcon} gradient="from-blue-500 to-blue-700" />
        <StatTile
          label="Awaiting your review"
          value={pendingChapters.length}
          icon={DocumentIcon}
          gradient="from-amber-500 to-amber-600"
        />
        <StatTile
          label="Upcoming meetings"
          value={upcomingMeetings.length}
          icon={CalendarIcon}
          gradient="from-violet-500 to-violet-700"
        />
        <StatTile
          label="Completed"
          value={completedCount}
          icon={CheckCircleIcon}
          gradient="from-emerald-500 to-emerald-700"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="My theses by status">
          <StackedBar
            segments={[
              { label: "In progress", value: inProgressCount, color: BLUE },
              { label: "Completed", value: completedCount, color: GREEN },
            ]}
          />
        </Card>

        <Card title="Chapters awaiting your review">
          {pendingChapters.length === 0 ? (
            <p className="text-sm text-slate-500">You&apos;re all caught up — nothing pending.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingChapters.map((c) => (
                <li key={c.chapterId} className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">
                      Ch. {c.number}: {c.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {c.studentName} · {c.thesisTitle}
                    </p>
                  </div>
                  <Link
                    href={`/lecturer/thesis/${c.thesisId}`}
                    className="shrink-0 text-blue-700 hover:underline"
                  >
                    Review →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Upcoming meetings">
        {upcomingMeetings.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingMeetings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{m.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(m.scheduledAt).toLocaleString()} · {m.durationMinutes} min · {m.thesisTitle}
                  </p>
                </div>
                <a className="text-blue-700 hover:underline" href={m.jitsiUrl} target="_blank">
                  Join video call
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="My payments">
        {paymentStatus.length === 0 ? (
          <p className="text-sm text-slate-500">No completed theses yet — payment applies once a thesis is marked complete.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {paymentStatus.map((p) => (
              <li key={p.thesisId} className="flex flex-wrap items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{p.thesisTitle}</p>
                  {p.supervisorsOnThesis > 1 && (
                    <p className="text-xs text-slate-500">Your share (1 of {p.supervisorsOnThesis} supervisors)</p>
                  )}
                </div>
                <span className="font-semibold text-slate-900">
                  GH₵ {(rate / p.supervisorsOnThesis).toFixed(2)}
                </span>
                {p.paid ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Paid
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Pending
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="mb-3 mt-6 text-base font-semibold">Theses assigned to me</h2>
      {assigned.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">No theses assigned to you yet.</p>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {assigned.map((t) => {
          const pending = pendingByThesis.get(t.thesisId) ?? 0;
          return (
            <Link key={t.thesisId} href={`/lecturer/thesis/${t.thesisId}`}>
              <Card>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-blue-800">{t.title}</span>
                  <StatusBadge status={t.status} />
                  <StatusBadge status={t.myRole} />
                  {pending > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {pending} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Student: <b>{t.studentName}</b> · {t.academicYear}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}
