import { requireRole } from "@/lib/auth";
import { getThesisForStudent, getChaptersWithFeedback } from "@/lib/queries";
import { Shell, Card, StatusBadge } from "@/components/shell";
import { UploadChapterForm } from "@/components/forms";

export default async function StudentChapters() {
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

  const chapterList = await getChaptersWithFeedback(thesis.id);

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">Chapters</h1>

      <Card title="Upload a chapter">
        <UploadChapterForm />
      </Card>

      <Card title={`My chapters (${chapterList.length})`}>
        {chapterList.length === 0 && (
          <p className="text-sm text-slate-500">Nothing uploaded yet. Upload Chapter 1 above to get started.</p>
        )}
        <ul className="space-y-3">
          {chapterList.map((c) => (
            <li key={c.id} className="rounded border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Chapter {c.number}: {c.title}</span>
                <span className="text-xs text-slate-500">v{c.version}</span>
                <StatusBadge status={c.status} />
                <a
                  className="ml-auto text-sm text-blue-700 hover:underline"
                  href={`/api/chapters/${c.id}/download`}
                >
                  Download
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
            </li>
          ))}
        </ul>
      </Card>
    </Shell>
  );
}
