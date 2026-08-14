import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { requireRole } from "@/lib/auth";
import { getAllTheses } from "@/lib/queries";
import { removeSupervisor, markThesisCompleted } from "@/app/actions";
import { Shell, Card, StatusBadge } from "@/components/shell";
import { CreateThesisForm, AssignSupervisorForm } from "@/components/forms";

export default async function AdminTheses() {
  const session = await requireRole("ADMIN");
  const [allTheses, students, lecturers] = await Promise.all([
    getAllTheses(),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "STUDENT")),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "LECTURER")),
  ]);

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">Theses & Supervision</h1>
      <Card title="Register a thesis">
        <CreateThesisForm students={students} />
      </Card>
      {allTheses.map((t) => (
        <Card key={t.id}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{t.title}</h3>
            <StatusBadge status={t.status} />
            <span className="text-xs text-slate-500">{t.academicYear}</span>
          </div>
          <p className="mb-3 text-sm text-slate-600">
            Student: <b>{t.studentName}</b>
          </p>
          <div className="mb-3 space-y-1">
            {t.supervisors.length === 0 && (
              <p className="text-sm text-amber-700">No supervisor assigned yet.</p>
            )}
            {t.supervisors.map((s) => (
              <div key={s.assignmentId} className="flex items-center gap-2 text-sm">
                <StatusBadge status={s.role} />
                <span>{s.name}</span>
                <form action={removeSupervisor}>
                  <input type="hidden" name="assignmentId" value={s.assignmentId} />
                  <button className="text-xs text-red-600 hover:underline">remove</button>
                </form>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <AssignSupervisorForm thesisId={t.id} lecturers={lecturers} />
            {t.status === "IN_PROGRESS" && (
              <form action={markThesisCompleted}>
                <input type="hidden" name="thesisId" value={t.id} />
                <button className="rounded border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50">
                  Mark completed
                </button>
              </form>
            )}
          </div>
        </Card>
      ))}
    </Shell>
  );
}
