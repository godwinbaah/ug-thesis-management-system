"use client";

import { useActionState } from "react";
import {
  login,
  createUser,
  createThesis,
  assignSupervisor,
  uploadChapter,
  giveFeedback,
  scheduleMeeting,
  setPaymentRate,
} from "@/app/actions";

type ActionState = { error?: string };
const initial: ActionState = {};

const input =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const label = "mb-1 block text-sm font-medium text-slate-700";
const button =
  "rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state.error} />
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input className={input} id="email" name="email" type="email" required autoFocus />
      </div>
      <div>
        <label className={label} htmlFor="password">Password</label>
        <input className={input} id="password" name="password" type="password" required />
      </div>
      <button className={`${button} w-full`} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><ErrorNote error={state.error} /></div>
      <div>
        <label className={label}>Full name</label>
        <input className={input} name="name" required />
      </div>
      <div>
        <label className={label}>Email</label>
        <input className={input} name="email" type="email" required />
      </div>
      <div>
        <label className={label}>Password (min 8 chars)</label>
        <input className={input} name="password" type="password" minLength={8} required />
      </div>
      <div>
        <label className={label}>Role</label>
        <select className={input} name="role" required defaultValue="STUDENT">
          <option value="STUDENT">Student</option>
          <option value="LECTURER">Lecturer</option>
          <option value="FINANCE">Finance</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <button className={button} disabled={pending}>{pending ? "Creating…" : "Create user"}</button>
      </div>
    </form>
  );
}

export function CreateThesisForm({ students }: { students: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(createThesis, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><ErrorNote error={state.error} /></div>
      <div className="sm:col-span-2">
        <label className={label}>Thesis title</label>
        <input className={input} name="title" required />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Description</label>
        <textarea className={input} name="description" rows={2} />
      </div>
      <div>
        <label className={label}>Academic year</label>
        <input className={input} name="academicYear" placeholder="2025/2026" required />
      </div>
      <div>
        <label className={label}>Student</label>
        <select className={input} name="studentId" required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <button className={button} disabled={pending}>{pending ? "Saving…" : "Register thesis"}</button>
      </div>
    </form>
  );
}

export function AssignSupervisorForm({
  thesisId,
  lecturers,
}: {
  thesisId: number;
  lecturers: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState(assignSupervisor, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="thesisId" value={thesisId} />
      <select className="rounded border border-slate-300 px-2 py-1 text-sm" name="lecturerId" required>
        {lecturers.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
      <select className="rounded border border-slate-300 px-2 py-1 text-sm" name="role" required>
        <option value="PRIMARY">Primary</option>
        <option value="CO_SUPERVISOR">Co-supervisor</option>
      </select>
      <button className="rounded bg-blue-700 px-3 py-1 text-sm text-white hover:bg-blue-800 disabled:opacity-50" disabled={pending}>
        Assign
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function UploadChapterForm() {
  const [state, action, pending] = useActionState(uploadChapter, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3"><ErrorNote error={state.error} /></div>
      <div>
        <label className={label}>Chapter #</label>
        <input className={input} name="number" type="number" min={1} max={20} required />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Chapter title</label>
        <input className={input} name="title" placeholder="e.g. Literature Review" required />
      </div>
      <div className="sm:col-span-3">
        <label className={label}>File (PDF/Word, max 10 MB)</label>
        <input className={input} name="file" type="file" accept=".pdf,.doc,.docx" required />
      </div>
      <div className="sm:col-span-3">
        <button className={button} disabled={pending}>{pending ? "Uploading…" : "Upload chapter"}</button>
      </div>
    </form>
  );
}

export function FeedbackForm({ chapterId }: { chapterId: number }) {
  const [state, action, pending] = useActionState(giveFeedback, initial);
  return (
    <form action={action} className="mt-2 space-y-2">
      <ErrorNote error={state.error} />
      <input type="hidden" name="chapterId" value={chapterId} />
      <textarea
        className={input}
        name="message"
        rows={2}
        placeholder="Write feedback for the student…"
        required
      />
      <div className="flex gap-2">
        <select className="rounded border border-slate-300 px-2 py-1 text-sm" name="statusSet" required>
          <option value="NEEDS_CORRECTION">Needs correction</option>
          <option value="APPROVED">Approved</option>
        </select>
        <button className="rounded bg-blue-700 px-3 py-1 text-sm text-white hover:bg-blue-800 disabled:opacity-50" disabled={pending}>
          {pending ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  );
}

export function ScheduleMeetingForm({ thesisId }: { thesisId: number }) {
  const [state, action, pending] = useActionState(scheduleMeeting, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><ErrorNote error={state.error} /></div>
      <input type="hidden" name="thesisId" value={thesisId} />
      <div>
        <label className={label}>Meeting title</label>
        <input className={input} name="title" placeholder="e.g. Chapter 2 review" required />
      </div>
      <div>
        <label className={label}>Date & time</label>
        <input className={input} name="scheduledAt" type="datetime-local" required />
      </div>
      <div>
        <label className={label}>Duration</label>
        <select className={input} name="durationMinutes" defaultValue="30">
          {[15, 30, 45, 60, 90, 120].map((d) => (
            <option key={d} value={d}>{d} minutes</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Agenda (optional)</label>
        <input className={input} name="agenda" />
      </div>
      <div className="sm:col-span-2">
        <button className={button} disabled={pending}>
          {pending ? "Scheduling…" : "Schedule meeting (creates video link)"}
        </button>
      </div>
    </form>
  );
}

export function PaymentRateForm({ current }: { current: number }) {
  const [state, action, pending] = useActionState(setPaymentRate, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <ErrorNote error={state.error} />
      <div>
        <label className={label}>Rate per completed thesis (GH₵)</label>
        <input className={input} name="rate" type="number" step="0.01" min={0} defaultValue={current} required />
      </div>
      <button className={button} disabled={pending}>{pending ? "Saving…" : "Update rate"}</button>
    </form>
  );
}
