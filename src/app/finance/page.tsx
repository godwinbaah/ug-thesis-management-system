import { requireRole } from "@/lib/auth";
import { getAssignmentFacts, getPaymentRate, getPaymentBreakdown } from "@/lib/queries";
import { computePayments, summarizePaymentBreakdown } from "@/lib/finance";
import { markAssignmentPaid, markAssignmentUnpaid } from "@/app/actions";
import { Shell, Card } from "@/components/shell";
import { PaymentRateForm } from "@/components/forms";
import { StackedBar, StatTile } from "@/components/charts";
import { CashIcon, CheckCircleIcon, DocumentIcon } from "@/components/icons";

const GREEN = "#0ca30c";
const ORANGE = "#eb6834";

export default async function FinanceDashboard() {
  const session = await requireRole("FINANCE");
  const [facts, rate, breakdown] = await Promise.all([
    getAssignmentFacts(),
    getPaymentRate(),
    getPaymentBreakdown(),
  ]);
  const payments = computePayments(facts, rate);
  const totalEarned = payments.reduce((sum, p) => sum + p.amountDue, 0);
  const summary = summarizePaymentBreakdown(breakdown, rate);
  const totalPaid = summary.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalOutstanding = summary.reduce((sum, s) => sum + s.amountOutstanding, 0);
  const byLecturer = new Map(summary.map((s) => [s.lecturerId, s]));

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">Supervision Payments</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Total earned (completed)"
          value={`GH₵ ${totalEarned.toFixed(2)}`}
          icon={CashIcon}
          gradient="from-blue-500 to-blue-700"
        />
        <StatTile
          label="Paid to date"
          value={`GH₵ ${totalPaid.toFixed(2)}`}
          icon={CheckCircleIcon}
          gradient="from-emerald-500 to-emerald-700"
        />
        <StatTile
          label="Outstanding"
          value={`GH₵ ${totalOutstanding.toFixed(2)}`}
          icon={DocumentIcon}
          gradient="from-amber-500 to-amber-600"
        />
      </div>

      <Card title="Paid vs outstanding">
        <StackedBar
          segments={[
            { label: "Paid", value: totalPaid, color: GREEN },
            { label: "Outstanding", value: totalOutstanding, color: ORANGE },
          ]}
        />
      </Card>

      <Card title="Payment rate">
        <p className="mb-3 text-sm text-slate-600">
          Each <b>completed</b> thesis pays GH₵ {rate.toFixed(2)} in total. When a thesis is
          co-supervised, the amount is split equally among its supervisors.
        </p>
        <PaymentRateForm current={rate} />
      </Card>

      <Card title="Payment summary by lecturer">
        <div className="mb-3 flex items-center justify-end">
          <a
            href="/api/finance/csv"
            className="rounded border border-blue-700 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
          >
            Export CSV
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Lecturer</th>
                <th className="py-2 pr-4 text-right">Supervised</th>
                <th className="py-2 pr-4 text-right">Completed</th>
                <th className="py-2 pr-4 text-right">Paid (GH₵)</th>
                <th className="py-2 text-right">Outstanding (GH₵)</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const s = byLecturer.get(p.lecturerId);
                return (
                  <tr key={p.lecturerId} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{p.lecturerName}</td>
                    <td className="py-2 pr-4 text-right">{p.supervisedCount}</td>
                    <td className="py-2 pr-4 text-right">{p.completedCount}</td>
                    <td className="py-2 pr-4 text-right text-emerald-700">
                      {(s?.amountPaid ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-semibold text-amber-700">
                      {(s?.amountOutstanding ?? 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    No supervision assignments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The supervision record and the payment record are the same fact — a lecturer is owed
          exactly for the completed theses the coordinator assigned to them, so finance and the
          department can never disagree.
        </p>
      </Card>

      <Card title="Payments by thesis">
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No completed theses yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {breakdown.map((b) => (
              <li key={b.assignmentId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{b.thesisTitle}</p>
                  <p className="text-xs text-slate-500">
                    {b.lecturerName}
                    {b.supervisorsOnThesis > 1 && ` · share of ${b.supervisorsOnThesis}`}
                    {b.paid && b.paidAt && ` · paid ${new Date(b.paidAt).toLocaleDateString()}`}
                  </p>
                </div>
                <span className="font-semibold text-slate-900">
                  GH₵ {(rate / b.supervisorsOnThesis).toFixed(2)}
                </span>
                {b.paid ? (
                  <>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      Paid
                    </span>
                    <form action={markAssignmentUnpaid}>
                      <input type="hidden" name="assignmentId" value={b.assignmentId} />
                      <button className="text-xs text-slate-500 hover:underline">Undo</button>
                    </form>
                  </>
                ) : (
                  <>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Pending
                    </span>
                    <form action={markAssignmentPaid}>
                      <input type="hidden" name="assignmentId" value={b.assignmentId} />
                      <button className="rounded border border-emerald-600 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50">
                        Mark as paid
                      </button>
                    </form>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
