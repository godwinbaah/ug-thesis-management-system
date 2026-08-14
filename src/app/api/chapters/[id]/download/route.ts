import { eq } from "drizzle-orm";
import { db, chapters, theses } from "@/db";
import { getSession } from "@/lib/auth";
import { lecturerSupervises } from "@/lib/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Bad request", { status: 400 });

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
  if (!chapter) return new Response("Not found", { status: 404 });

  // Authorization: the owning student, a supervising lecturer, or an admin.
  let allowed = session.role === "ADMIN";
  if (!allowed && session.role === "STUDENT") {
    const [own] = await db
      .select({ sid: theses.studentId })
      .from(theses)
      .where(eq(theses.id, chapter.thesisId));
    allowed = own?.sid === session.id;
  }
  if (!allowed && session.role === "LECTURER") {
    allowed = !!(await lecturerSupervises(session.id, chapter.thesisId));
  }
  if (!allowed) return new Response("Forbidden", { status: 403 });

  return new Response(new Uint8Array(chapter.fileData), {
    headers: {
      "Content-Type": chapter.mimeType,
      "Content-Disposition": `attachment; filename="${chapter.fileName.replace(/[^\w.\- ]/g, "_")}"`,
    },
  });
}
