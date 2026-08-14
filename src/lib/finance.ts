/**
 * Finance computation: pure functions so they are unit-testable.
 *
 * Payment rule (SRS FR-25): a completed thesis pays `rate` in total,
 * split equally among all supervisors assigned to it. A thesis with a
 * sole supervisor pays that supervisor the full rate.
 */

export interface AssignmentFact {
  thesisId: number;
  lecturerId: number;
  lecturerName: string;
  thesisStatus: "IN_PROGRESS" | "COMPLETED";
  supervisorsOnThesis: number;
}

export interface LecturerPayment {
  lecturerId: number;
  lecturerName: string;
  supervisedCount: number;
  completedCount: number;
  amountDue: number;
}

export function computePayments(
  facts: AssignmentFact[],
  ratePerCompletedThesis: number,
): LecturerPayment[] {
  const byLecturer = new Map<number, LecturerPayment>();
  for (const f of facts) {
    let row = byLecturer.get(f.lecturerId);
    if (!row) {
      row = {
        lecturerId: f.lecturerId,
        lecturerName: f.lecturerName,
        supervisedCount: 0,
        completedCount: 0,
        amountDue: 0,
      };
      byLecturer.set(f.lecturerId, row);
    }
    row.supervisedCount += 1;
    if (f.thesisStatus === "COMPLETED") {
      row.completedCount += 1;
      row.amountDue += ratePerCompletedThesis / f.supervisorsOnThesis;
    }
  }
  return [...byLecturer.values()]
    .map((r) => ({ ...r, amountDue: Math.round(r.amountDue * 100) / 100 }))
    .sort((a, b) => b.amountDue - a.amountDue || a.lecturerName.localeCompare(b.lecturerName));
}

export function paymentsToCsv(rows: LecturerPayment[]): string {
  const header = "Lecturer,Theses Supervised,Theses Completed,Amount Due (GHS)";
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
  const lines = rows.map((r) =>
    [esc(r.lecturerName), r.supervisedCount, r.completedCount, r.amountDue.toFixed(2)].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Paid/outstanding tracking (one row per completed-thesis supervisor
 * assignment). Distinct from AssignmentFact above: this only covers
 * COMPLETED theses, since only completed supervision generates a payment
 * obligation, and it carries the per-assignment `paid` flag needed to show
 * "who has and hasn't been paid".
 */
export interface PaymentBreakdownRow {
  assignmentId: number;
  thesisId: number;
  thesisTitle: string;
  lecturerId: number;
  lecturerName: string;
  supervisorsOnThesis: number;
  paid: boolean;
  paidAt: string | null;
}

export interface LecturerPaymentSummary {
  lecturerId: number;
  lecturerName: string;
  completedCount: number;
  paidCount: number;
  amountPaid: number;
  amountOutstanding: number;
}

export function summarizePaymentBreakdown(
  rows: PaymentBreakdownRow[],
  ratePerCompletedThesis: number,
): LecturerPaymentSummary[] {
  const byLecturer = new Map<number, LecturerPaymentSummary>();
  for (const r of rows) {
    let s = byLecturer.get(r.lecturerId);
    if (!s) {
      s = {
        lecturerId: r.lecturerId,
        lecturerName: r.lecturerName,
        completedCount: 0,
        paidCount: 0,
        amountPaid: 0,
        amountOutstanding: 0,
      };
      byLecturer.set(r.lecturerId, s);
    }
    const share = ratePerCompletedThesis / r.supervisorsOnThesis;
    s.completedCount += 1;
    if (r.paid) {
      s.paidCount += 1;
      s.amountPaid += share;
    } else {
      s.amountOutstanding += share;
    }
  }
  return [...byLecturer.values()]
    .map((s) => ({
      ...s,
      amountPaid: Math.round(s.amountPaid * 100) / 100,
      amountOutstanding: Math.round(s.amountOutstanding * 100) / 100,
    }))
    .sort(
      (a, b) => b.amountOutstanding - a.amountOutstanding || a.lecturerName.localeCompare(b.lecturerName),
    );
}
