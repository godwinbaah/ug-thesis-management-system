"use server";

import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import {
  createSession,
  destroySession,
  requireRole,
  type Role,
} from "@/lib/auth";
import { generateJitsiUrl } from "@/lib/meetings";
import { lecturerSupervises, getSupervisors, getStudentForThesis } from "@/lib/queries";
import {
  notifyChapterSubmitted,
  notifyFeedbackGiven,
  notifyMeetingScheduled,
  notifyPaymentProcessed,
  notifyThesisCompleted,
} from "@/lib/email";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function homeFor(role: Role): string {
  return { ADMIN: "/admin", STUDENT: "/student", LECTURER: "/lecturer", FINANCE: "/finance" }[role];
}

// ---------- Auth ----------

export async function login(_prev: { error?: string }, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || user.active !== 1 || !bcrypt.compareSync(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }
  await createSession(user);
  redirect(homeFor(user.role as Role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- Admin: users ----------

export async function createUser(_prev: { error?: string }, formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!name || !email || password.length < 8 || !["ADMIN", "STUDENT", "LECTURER", "FINANCE"].includes(role)) {
    return { error: "All fields are required; password must be at least 8 characters." };
  }
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) return { error: "A user with that email already exists." };
  await db.insert(users).values({ name, email, role, passwordHash: bcrypt.hashSync(password, 10) });
  revalidatePath("/admin/users");
  return {};
}

export async function toggleUserActive(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = Number(formData.get("userId"));
  if (!Number.isInteger(id) || id === session.id) return; // cannot deactivate self
  await db
    .update(users)
    .set({ active: sql`1 - ${users.active}` })
    .where(eq(users.id, id));
  revalidatePath("/admin/users");
}

// ---------- Admin: theses & supervision ----------

export async function createThesis(_prev: { error?: string }, formData: FormData) {
  await requireRole("ADMIN");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const academicYear = String(formData.get("academicYear") ?? "").trim();
  const studentId = Number(formData.get("studentId"));
  if (!title || !academicYear || !Number.isInteger(studentId)) {
    return { error: "Title, academic year and student are required." };
  }
  const [student] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "STUDENT")));
  if (!student) return { error: "Selected user is not a student." };
  await db.insert(theses).values({ title, description, academicYear, studentId });
  revalidatePath("/admin/theses");
  return {};
}

export async function assignSupervisor(_prev: { error?: string }, formData: FormData) {
  await requireRole("ADMIN");
  const thesisId = Number(formData.get("thesisId"));
  const lecturerId = Number(formData.get("lecturerId"));
  const role = String(formData.get("role")) as "PRIMARY" | "CO_SUPERVISOR";
  if (!Number.isInteger(thesisId) || !Number.isInteger(lecturerId) || !["PRIMARY", "CO_SUPERVISOR"].includes(role)) {
    return { error: "Thesis, lecturer and role are required." };
  }
  const [lect] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, lecturerId), eq(users.role, "LECTURER")));
  if (!lect) return { error: "Selected user is not a lecturer." };
  const [dup] = await db
    .select({ id: supervisorAssignments.id })
    .from(supervisorAssignments)
    .where(and(eq(supervisorAssignments.thesisId, thesisId), eq(supervisorAssignments.lecturerId, lecturerId)));
  if (dup) return { error: "That lecturer is already assigned to this thesis." };
  if (role === "PRIMARY") {
    const [primary] = await db
      .select({ id: supervisorAssignments.id })
      .from(supervisorAssignments)
      .where(and(eq(supervisorAssignments.thesisId, thesisId), eq(supervisorAssignments.role, "PRIMARY")));
    if (primary) return { error: "This thesis already has a primary supervisor." };
  }
  await db.insert(supervisorAssignments).values({ thesisId, lecturerId, role });
  revalidatePath("/admin/theses");
  return {};
}

export async function removeSupervisor(formData: FormData) {
  await requireRole("ADMIN");
  const id = Number(formData.get("assignmentId"));
  if (!Number.isInteger(id)) return;
  await db.delete(supervisorAssignments).where(eq(supervisorAssignments.id, id));
  revalidatePath("/admin/theses");
}

export async function markThesisCompleted(formData: FormData) {
  const session = await requireRole("ADMIN", "LECTURER");
  const thesisId = Number(formData.get("thesisId"));
  if (!Number.isInteger(thesisId)) return;
  if (session.role === "LECTURER") {
    const assignment = await lecturerSupervises(session.id, thesisId);
    if (!assignment || assignment.role !== "PRIMARY") return;
  }
  await db
    .update(theses)
    .set({ status: "COMPLETED", completedAt: new Date().toISOString() })
    .where(eq(theses.id, thesisId));
  revalidatePath("/lecturer");
  revalidatePath("/finance");
  revalidatePath("/student");

  const student = await getStudentForThesis(thesisId);
  if (student) {
    await notifyThesisCompleted({ to: student.email, thesisTitle: student.thesisTitle });
  }
}

// ---------- Student: chapters ----------

export async function uploadChapter(_prev: { error?: string }, formData: FormData) {
  const session = await requireRole("STUDENT");
  const number = Number(formData.get("number"));
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!Number.isInteger(number) || number < 1 || number > 20 || !title) {
    return { error: "Chapter number (1–20) and title are required." };
  }
  if (!file || file.size === 0) return { error: "A file is required." };
  if (file.size > MAX_FILE_BYTES) return { error: "File exceeds the 10 MB limit." };
  if (!ALLOWED_MIME.includes(file.type)) return { error: "Only PDF or Word documents are accepted." };

  const [thesis] = await db
    .select({ id: theses.id, title: theses.title })
    .from(theses)
    .where(eq(theses.studentId, session.id));
  if (!thesis) return { error: "No thesis is registered for your account yet." };

  const [latest] = await db
    .select({ v: sql<number>`coalesce(max(${chapters.version}), 0)` })
    .from(chapters)
    .where(and(eq(chapters.thesisId, thesis.id), eq(chapters.number, number)));

  await db.insert(chapters).values({
    thesisId: thesis.id,
    number,
    title,
    version: (latest?.v ?? 0) + 1,
    fileName: file.name,
    mimeType: file.type,
    fileData: Buffer.from(await file.arrayBuffer()),
  });
  revalidatePath("/student");
  revalidatePath("/student/chapters");

  const supervisors = await getSupervisors(thesis.id);
  if (supervisors.length > 0) {
    await notifyChapterSubmitted({
      to: supervisors.map((s) => s.email),
      studentName: session.name,
      thesisTitle: thesis.title,
      chapterNumber: number,
      chapterTitle: title,
      thesisId: thesis.id,
    });
  }
  return {};
}

// ---------- Lecturer: feedback ----------

export async function giveFeedback(_prev: { error?: string }, formData: FormData) {
  const session = await requireRole("LECTURER");
  const chapterId = Number(formData.get("chapterId"));
  const message = String(formData.get("message") ?? "").trim();
  const statusSet = String(formData.get("statusSet")) as "NEEDS_CORRECTION" | "APPROVED";
  if (!Number.isInteger(chapterId) || !message || !["NEEDS_CORRECTION", "APPROVED"].includes(statusSet)) {
    return { error: "Feedback message and a decision are required." };
  }
  const [chapter] = await db
    .select({
      id: chapters.id,
      thesisId: chapters.thesisId,
      number: chapters.number,
      title: chapters.title,
    })
    .from(chapters)
    .where(eq(chapters.id, chapterId));
  if (!chapter) return { error: "Chapter not found." };
  if (!(await lecturerSupervises(session.id, chapter.thesisId))) {
    return { error: "You are not assigned to this thesis." };
  }
  await db.insert(feedback).values({ chapterId, lecturerId: session.id, message, statusSet });
  await db.update(chapters).set({ status: statusSet }).where(eq(chapters.id, chapterId));
  revalidatePath(`/lecturer/thesis/${chapter.thesisId}`);
  revalidatePath("/student");
  revalidatePath("/student/chapters");

  const student = await getStudentForThesis(chapter.thesisId);
  if (student) {
    await notifyFeedbackGiven({
      to: student.email,
      lecturerName: session.name,
      thesisTitle: student.thesisTitle,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      decision: statusSet,
    });
  }
  return {};
}

// ---------- Meetings ----------

export async function scheduleMeeting(_prev: { error?: string }, formData: FormData) {
  const session = await requireRole("STUDENT", "LECTURER");
  const thesisId = Number(formData.get("thesisId"));
  const title = String(formData.get("title") ?? "").trim();
  const agenda = String(formData.get("agenda") ?? "").trim();
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes") ?? 30);

  if (!Number.isInteger(thesisId) || !title || !scheduledAt) {
    return { error: "Title and date/time are required." };
  }
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Invalid date/time." };
  if (![15, 30, 45, 60, 90, 120].includes(durationMinutes)) {
    return { error: "Invalid duration." };
  }

  // Party check: the student must own the thesis; a lecturer must supervise it.
  if (session.role === "STUDENT") {
    const [own] = await db
      .select({ id: theses.id })
      .from(theses)
      .where(and(eq(theses.id, thesisId), eq(theses.studentId, session.id)));
    if (!own) return { error: "That thesis is not yours." };
  } else if (!(await lecturerSupervises(session.id, thesisId))) {
    return { error: "You are not assigned to this thesis." };
  }

  const jitsiUrl = generateJitsiUrl(thesisId);
  await db.insert(meetings).values({
    thesisId,
    createdBy: session.id,
    title,
    agenda,
    scheduledAt: when.toISOString(),
    durationMinutes,
    jitsiUrl,
  });
  revalidatePath("/student");
  revalidatePath("/student/meetings");
  revalidatePath(`/lecturer/thesis/${thesisId}`);

  const student = await getStudentForThesis(thesisId);
  if (student) {
    const recipients =
      session.role === "STUDENT"
        ? (await getSupervisors(thesisId)).map((s) => s.email)
        : [student.email];
    if (recipients.length > 0) {
      await notifyMeetingScheduled({
        to: recipients,
        organizerName: session.name,
        thesisTitle: student.thesisTitle,
        meetingTitle: title,
        scheduledAtIso: when.toISOString(),
        jitsiUrl,
      });
    }
  }
  return {};
}

export async function cancelMeeting(formData: FormData) {
  const session = await requireRole("STUDENT", "LECTURER");
  const meetingId = Number(formData.get("meetingId"));
  if (!Number.isInteger(meetingId)) return;
  const [meeting] = await db
    .select({ id: meetings.id, thesisId: meetings.thesisId })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) return;
  if (session.role === "STUDENT") {
    const [own] = await db
      .select({ id: theses.id })
      .from(theses)
      .where(and(eq(theses.id, meeting.thesisId), eq(theses.studentId, session.id)));
    if (!own) return;
  } else if (!(await lecturerSupervises(session.id, meeting.thesisId))) {
    return;
  }
  await db.update(meetings).set({ status: "CANCELLED" }).where(eq(meetings.id, meetingId));
  revalidatePath("/student");
  revalidatePath("/student/meetings");
  revalidatePath(`/lecturer/thesis/${meeting.thesisId}`);
}

// ---------- Finance ----------

export async function setPaymentRate(_prev: { error?: string }, formData: FormData) {
  await requireRole("FINANCE");
  const rate = Number(formData.get("rate"));
  if (!Number.isFinite(rate) || rate < 0 || rate > 1_000_000) {
    return { error: "Rate must be a number between 0 and 1,000,000." };
  }
  await db
    .insert(settings)
    .values({ key: "payment_rate_per_thesis", value: String(rate) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(rate) } });
  revalidatePath("/finance");
  return {};
}

export async function markAssignmentPaid(formData: FormData) {
  await requireRole("FINANCE");
  const assignmentId = Number(formData.get("assignmentId"));
  if (!Number.isInteger(assignmentId)) return;

  const [assignment] = await db
    .select({
      id: supervisorAssignments.id,
      thesisId: supervisorAssignments.thesisId,
      lecturerId: supervisorAssignments.lecturerId,
      lecturerName: users.name,
      lecturerEmail: users.email,
      thesisTitle: theses.title,
      thesisStatus: theses.status,
    })
    .from(supervisorAssignments)
    .innerJoin(users, eq(users.id, supervisorAssignments.lecturerId))
    .innerJoin(theses, eq(theses.id, supervisorAssignments.thesisId))
    .where(eq(supervisorAssignments.id, assignmentId));
  if (!assignment || assignment.thesisStatus !== "COMPLETED") return;

  const [{ n: supervisorsOnThesis }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(supervisorAssignments)
    .where(eq(supervisorAssignments.thesisId, assignment.thesisId));

  await db
    .update(supervisorAssignments)
    .set({ paid: 1, paidAt: new Date().toISOString() })
    .where(eq(supervisorAssignments.id, assignmentId));
  revalidatePath("/finance");
  revalidatePath("/lecturer");

  const [rateRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "payment_rate_per_thesis"));
  const share = (rateRow ? Number(rateRow.value) : 0) / supervisorsOnThesis;
  await notifyPaymentProcessed({
    to: assignment.lecturerEmail,
    lecturerName: assignment.lecturerName,
    thesisTitle: assignment.thesisTitle,
    amount: share,
  });
}

export async function markAssignmentUnpaid(formData: FormData) {
  await requireRole("FINANCE");
  const assignmentId = Number(formData.get("assignmentId"));
  if (!Number.isInteger(assignmentId)) return;
  await db
    .update(supervisorAssignments)
    .set({ paid: 0, paidAt: null })
    .where(eq(supervisorAssignments.id, assignmentId));
  revalidatePath("/finance");
  revalidatePath("/lecturer");
}
