import { getSession } from "@/lib/auth";
import { getAssignmentFacts, getPaymentRate } from "@/lib/queries";
import { computePayments, paymentsToCsv } from "@/lib/finance";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "FINANCE") {
    return new Response("Forbidden", { status: 403 });
  }
  const [facts, rate] = await Promise.all([getAssignmentFacts(), getPaymentRate()]);
  const csv = paymentsToCsv(computePayments(facts, rate));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="supervision_payment_report.csv"',
    },
  });
}
