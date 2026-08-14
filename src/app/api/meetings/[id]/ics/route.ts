import { eq } from "drizzle-orm";
import { db, meetings, theses } from "@/db";
import { getSession } from "@/lib/auth";
import { lecturerSupervises } from "@/lib/queries";
import { buildIcs } from "@/lib/meetings";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Bad request", { status: 400 });

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting) return new Response("Not found", { status: 404 });

  // Only parties to the thesis (student, supervisors) or admin may download.
  let allowed = session.role === "ADMIN";
  if (!allowed && session.role === "STUDENT") {
    const [own] = await db
      .select({ sid: theses.studentId })
      .from(theses)
      .where(eq(theses.id, meeting.thesisId));
    allowed = own?.sid === session.id;
  }
  if (!allowed && session.role === "LECTURER") {
    allowed = !!(await lecturerSupervises(session.id, meeting.thesisId));
  }
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const ics = buildIcs({
    uid: `meeting-${meeting.id}`,
    title: meeting.title,
    description: meeting.agenda || "Thesis supervision meeting",
    startIso: meeting.scheduledAt,
    durationMinutes: meeting.durationMinutes,
    url: meeting.jitsiUrl,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="meeting-${meeting.id}.ics"`,
    },
  });
}
