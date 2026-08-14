import { sql } from "drizzle-orm";
import {
  blob,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", {
    enum: ["ADMIN", "STUDENT", "LECTURER", "FINANCE"],
  }).notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const theses = sqliteTable("theses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  academicYear: text("academic_year").notNull(),
  studentId: integer("student_id")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["IN_PROGRESS", "COMPLETED"] })
    .notNull()
    .default("IN_PROGRESS"),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const supervisorAssignments = sqliteTable(
  "supervisor_assignments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    thesisId: integer("thesis_id")
      .notNull()
      .references(() => theses.id),
    lecturerId: integer("lecturer_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: ["PRIMARY", "CO_SUPERVISOR"] }).notNull(),
    assignedAt: text("assigned_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    paid: integer("paid").notNull().default(0),
    paidAt: text("paid_at"),
  },
  (t) => [uniqueIndex("uq_thesis_lecturer").on(t.thesisId, t.lecturerId)],
);

export const chapters = sqliteTable("chapters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: integer("thesis_id")
    .notNull()
    .references(() => theses.id),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  version: integer("version").notNull().default(1),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileData: blob("file_data", { mode: "buffer" }).notNull(),
  status: text("status", {
    enum: ["SUBMITTED", "NEEDS_CORRECTION", "APPROVED"],
  })
    .notNull()
    .default("SUBMITTED"),
  submittedAt: text("submitted_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id),
  lecturerId: integer("lecturer_id")
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  statusSet: text("status_set", {
    enum: ["NEEDS_CORRECTION", "APPROVED"],
  }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const meetings = sqliteTable("meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: integer("thesis_id")
    .notNull()
    .references(() => theses.id),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  agenda: text("agenda").notNull().default(""),
  scheduledAt: text("scheduled_at").notNull(), // ISO 8601 UTC
  durationMinutes: integer("duration_minutes").notNull().default(30),
  jitsiUrl: text("jitsi_url").notNull(),
  status: text("status", { enum: ["SCHEDULED", "CANCELLED"] })
    .notNull()
    .default("SCHEDULED"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type Thesis = typeof theses.$inferSelect;
export type SupervisorAssignment = typeof supervisorAssignments.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
