import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  users,
  theses,
  supervisorAssignments,
  chapters,
  feedback,
  meetings,
  settings,
} from "@/db";
import type { AssignmentFact, PaymentBreakdownRow } from "./finance";

export async function getThesisForStudent(studentId: number) {
  const [thesis] = await db
    .select()
    .from(theses)
    .where(eq(theses.studentId, studentId));
  if (!thesis) return null;
  return { ...thesis, supervisors: await getSupervisors(thesis.id) };
}

export async function getStudentForThesis(thesisId: number) {
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, thesisTitle: theses.title })
    .from(theses)
    .innerJoin(users, eq(users.id, theses.studentId))
    .where(eq(theses.id, thesisId));
  return row ?? null;
}

export async function getSupervisors(thesisId: number) {
  return db
    .select({
      id: supervisorAssignments.id,
      lecturerId: users.id,
      name: users.name,
      email: users.email,
      role: supervisorAssignments.role,
    })
    .from(supervisorAssignments)
    .innerJoin(users, eq(users.id, supervisorAssignments.lecturerId))
    .where(eq(supervisorAssignments.thesisId, thesisId));
}

export async function getChaptersWithFeedback(thesisId: number) {
  const chapterRows = await db
    .select({
      id: chapters.id,
      number: chapters.number,
      title: chapters.title,
      version: chapters.version,
      fileName: chapters.fileName,
      status: chapters.status,
      submittedAt: chapters.submittedAt,
    })
    .from(chapters)
    .where(eq(chapters.thesisId, thesisId))
    .orderBy(chapters.number, desc(chapters.version));

  const ids = chapterRows.map((c) => c.id);
  const feedbackRows = ids.length
    ? await db
        .select({
          id: feedback.id,
          chapterId: feedback.chapterId,
          message: feedback.message,
          statusSet: feedback.statusSet,
          createdAt: feedback.createdAt,
          lecturerName: users.name,
        })
        .from(feedback)
        .innerJoin(users, eq(users.id, feedback.lecturerId))
        .where(inArray(feedback.chapterId, ids))
        .orderBy(desc(feedback.createdAt))
    : [];

  return chapterRows.map((c) => ({
    ...c,
    feedback: feedbackRows.filter((f) => f.chapterId === c.id),
  }));
}

export async function getThesesForLecturer(lecturerId: number) {
  return db
    .select({
      thesisId: theses.id,
      title: theses.title,
      status: theses.status,
      academicYear: theses.academicYear,
      myRole: supervisorAssignments.role,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(supervisorAssignments)
    .innerJoin(theses, eq(theses.id, supervisorAssignments.thesisId))
    .innerJoin(users, eq(users.id, theses.studentId))
    .where(eq(supervisorAssignments.lecturerId, lecturerId))
    .orderBy(theses.status, theses.title);
}

/** True if this lecturer supervises this thesis (any role). */
export async function lecturerSupervises(lecturerId: number, thesisId: number) {
  const [row] = await db
    .select({ id: supervisorAssignments.id, role: supervisorAssignments.role })
    .from(supervisorAssignments)
    .where(
      and(
        eq(supervisorAssignments.thesisId, thesisId),
        eq(supervisorAssignments.lecturerId, lecturerId),
      ),
    );
  return row ?? null;
}

export async function getMeetingsForThesis(thesisId: number) {
  return db
    .select({
      id: meetings.id,
      title: meetings.title,
      agenda: meetings.agenda,
      scheduledAt: meetings.scheduledAt,
      durationMinutes: meetings.durationMinutes,
      jitsiUrl: meetings.jitsiUrl,
      status: meetings.status,
      createdByName: users.name,
    })
    .from(meetings)
    .innerJoin(users, eq(users.id, meetings.createdBy))
    .where(eq(meetings.thesisId, thesisId))
    .orderBy(desc(meetings.scheduledAt));
}

export async function getAllUsers() {
  return db.select().from(users).orderBy(users.role, users.name);
}

export async function getAllTheses() {
  const rows = await db
    .select({
      id: theses.id,
      title: theses.title,
      academicYear: theses.academicYear,
      status: theses.status,
      studentName: users.name,
    })
    .from(theses)
    .innerJoin(users, eq(users.id, theses.studentId))
    .orderBy(desc(theses.createdAt));
  const supervisors = await db
    .select({
      thesisId: supervisorAssignments.thesisId,
      assignmentId: supervisorAssignments.id,
      name: users.name,
      role: supervisorAssignments.role,
    })
    .from(supervisorAssignments)
    .innerJoin(users, eq(users.id, supervisorAssignments.lecturerId));
  return rows.map((t) => ({
    ...t,
    supervisors: supervisors.filter((s) => s.thesisId === t.id),
  }));
}

/** Facts for the finance computation (src/lib/finance.ts). */
export async function getAssignmentFacts(): Promise<AssignmentFact[]> {
  const counts = db
    .select({
      thesisId: supervisorAssignments.thesisId,
      n: sql<number>`count(*)`.as("n"),
    })
    .from(supervisorAssignments)
    .groupBy(supervisorAssignments.thesisId)
    .as("counts");

  return db
    .select({
      thesisId: supervisorAssignments.thesisId,
      lecturerId: supervisorAssignments.lecturerId,
      lecturerName: users.name,
      thesisStatus: theses.status,
      supervisorsOnThesis: counts.n,
    })
    .from(supervisorAssignments)
    .innerJoin(users, eq(users.id, supervisorAssignments.lecturerId))
    .innerJoin(theses, eq(theses.id, supervisorAssignments.thesisId))
    .innerJoin(counts, eq(counts.thesisId, supervisorAssignments.thesisId));
}

export async function getPaymentRate(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "payment_rate_per_thesis"));
  return row ? Number(row.value) : 0;
}

/** Chapter review-status breakdown across the whole system, for the admin analytics cards. */
export async function getChapterStatusCounts() {
  const rows = await db
    .select({ status: chapters.status, n: sql<number>`count(*)` })
    .from(chapters)
    .groupBy(chapters.status);
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.n]));
  return {
    SUBMITTED: byStatus.SUBMITTED ?? 0,
    NEEDS_CORRECTION: byStatus.NEEDS_CORRECTION ?? 0,
    APPROVED: byStatus.APPROVED ?? 0,
  };
}

/** Number of theses each lecturer supervises, for the admin supervision-load chart. */
export async function getSupervisionLoad() {
  return db
    .select({ lecturerName: users.name, n: sql<number>`count(*)` })
    .from(supervisorAssignments)
    .innerJoin(users, eq(users.id, supervisorAssignments.lecturerId))
    .groupBy(supervisorAssignments.lecturerId, users.name)
    .orderBy(desc(sql`count(*)`));
}

/** Chapters awaiting this lecturer's review, across every thesis they supervise. */
export async function getPendingChaptersForLecturer(lecturerId: number) {
  return db
    .select({
      chapterId: chapters.id,
      number: chapters.number,
      title: chapters.title,
      thesisId: chapters.thesisId,
      thesisTitle: theses.title,
      studentName: users.name,
      submittedAt: chapters.submittedAt,
    })
    .from(chapters)
    .innerJoin(supervisorAssignments, eq(supervisorAssignments.thesisId, chapters.thesisId))
    .innerJoin(theses, eq(theses.id, chapters.thesisId))
    .innerJoin(users, eq(users.id, theses.studentId))
    .where(and(eq(supervisorAssignments.lecturerId, lecturerId), eq(chapters.status, "SUBMITTED")))
    .orderBy(chapters.submittedAt);
}

/** Count of chapters awaiting review, grouped by thesis — for per-thesis badges. */
export async function getPendingReviewCountsByThesis(lecturerId: number) {
  const rows = await db
    .select({ thesisId: chapters.thesisId, n: sql<number>`count(*)` })
    .from(chapters)
    .innerJoin(supervisorAssignments, eq(supervisorAssignments.thesisId, chapters.thesisId))
    .where(and(eq(supervisorAssignments.lecturerId, lecturerId), eq(chapters.status, "SUBMITTED")))
    .groupBy(chapters.thesisId);
  return new Map(rows.map((r) => [r.thesisId, r.n]));
}

/** Upcoming (scheduled, not yet passed) meetings across every thesis this lecturer supervises. */
export async function getUpcomingMeetingsForLecturer(lecturerId: number) {
  const nowIso = new Date().toISOString();
  return db
    .select({
      id: meetings.id,
      title: meetings.title,
      scheduledAt: meetings.scheduledAt,
      durationMinutes: meetings.durationMinutes,
      jitsiUrl: meetings.jitsiUrl,
      thesisId: meetings.thesisId,
      thesisTitle: theses.title,
    })
    .from(meetings)
    .innerJoin(supervisorAssignments, eq(supervisorAssignments.thesisId, meetings.thesisId))
    .innerJoin(theses, eq(theses.id, meetings.thesisId))
    .where(
      and(
        eq(supervisorAssignments.lecturerId, lecturerId),
        eq(meetings.status, "SCHEDULED"),
        sql`${meetings.scheduledAt} >= ${nowIso}`,
      ),
    )
    .orderBy(meetings.scheduledAt);
}

/** One row per supervisor assignment on a COMPLETED thesis, with paid status — the finance paid/outstanding view. */
export async function getPaymentBreakdown(): Promise<PaymentBreakdownRow[]> {
  const counts = db
    .select({
      thesisId: supervisorAssignments.thesisId,
      n: sql<number>`count(*)`.as("n"),
    })
    .from(supervisorAssignments)
    .groupBy(supervisorAssignments.thesisId)
    .as("counts");

  const rows = await db
    .select({
      assignmentId: supervisorAssignments.id,
      thesisId: theses.id,
      thesisTitle: theses.title,
      lecturerId: users.id,
      lecturerName: users.name,
      supervisorsOnThesis: counts.n,
      paid: supervisorAssignments.paid,
      paidAt: supervisorAssignments.paidAt,
    })
    .from(supervisorAssignments)
    .innerJoin(theses, eq(theses.id, supervisorAssignments.thesisId))
    .innerJoin(users, eq(users.id, supervisorAssignments.lecturerId))
    .innerJoin(counts, eq(counts.thesisId, supervisorAssignments.thesisId))
    .where(eq(theses.status, "COMPLETED"))
    .orderBy(theses.title, users.name);

  return rows.map((r) => ({ ...r, paid: r.paid === 1 }));
}

/** A lecturer's own payment status for each of their completed theses. */
export async function getPaymentStatusForLecturer(lecturerId: number) {
  const counts = db
    .select({
      thesisId: supervisorAssignments.thesisId,
      n: sql<number>`count(*)`.as("n"),
    })
    .from(supervisorAssignments)
    .groupBy(supervisorAssignments.thesisId)
    .as("counts");

  const rows = await db
    .select({
      thesisId: theses.id,
      thesisTitle: theses.title,
      supervisorsOnThesis: counts.n,
      paid: supervisorAssignments.paid,
      paidAt: supervisorAssignments.paidAt,
    })
    .from(supervisorAssignments)
    .innerJoin(theses, eq(theses.id, supervisorAssignments.thesisId))
    .innerJoin(counts, eq(counts.thesisId, supervisorAssignments.thesisId))
    .where(and(eq(supervisorAssignments.lecturerId, lecturerId), eq(theses.status, "COMPLETED")));

  return rows.map((r) => ({ ...r, paid: r.paid === 1 }));
}
