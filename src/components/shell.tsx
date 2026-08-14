import type { SessionUser } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export function Shell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 md:flex-row">
      <Sidebar user={user} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-green-100 text-green-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    NEEDS_CORRECTION: "bg-red-100 text-red-800",
    APPROVED: "bg-green-100 text-green-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-slate-200 text-slate-500",
    PRIMARY: "bg-purple-100 text-purple-800",
    CO_SUPERVISOR: "bg-indigo-100 text-indigo-800",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
