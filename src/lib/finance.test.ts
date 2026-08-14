import { describe, expect, it } from "vitest";
import {
  computePayments,
  paymentsToCsv,
  summarizePaymentBreakdown,
  type AssignmentFact,
  type PaymentBreakdownRow,
} from "./finance";

const fact = (over: Partial<AssignmentFact>): AssignmentFact => ({
  thesisId: 1,
  lecturerId: 1,
  lecturerName: "Dr. A",
  thesisStatus: "IN_PROGRESS",
  supervisorsOnThesis: 1,
  ...over,
});

describe("computePayments", () => {
  it("pays the full rate for a sole-supervised completed thesis", () => {
    const rows = computePayments(
      [fact({ thesisStatus: "COMPLETED" })],
      1500,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ supervisedCount: 1, completedCount: 1, amountDue: 1500 });
  });

  it("pays nothing for in-progress theses but still counts supervision", () => {
    const rows = computePayments([fact({})], 1500);
    expect(rows[0]).toMatchObject({ supervisedCount: 1, completedCount: 0, amountDue: 0 });
  });

  it("splits a co-supervised completed thesis equally (the collaborative case)", () => {
    const rows = computePayments(
      [
        fact({ thesisStatus: "COMPLETED", supervisorsOnThesis: 2, lecturerId: 1, lecturerName: "Dr. A" }),
        fact({ thesisStatus: "COMPLETED", supervisorsOnThesis: 2, lecturerId: 2, lecturerName: "Dr. B" }),
      ],
      1500,
    );
    expect(rows.map((r) => r.amountDue)).toEqual([750, 750]);
    // Conservation: the split never pays out more than the rate.
    expect(rows.reduce((s, r) => s + r.amountDue, 0)).toBe(1500);
  });

  it("splits a three-way co-supervision with rounding to 2 dp", () => {
    const rows = computePayments(
      [1, 2, 3].map((id) =>
        fact({ thesisStatus: "COMPLETED", supervisorsOnThesis: 3, lecturerId: id, lecturerName: `Dr. ${id}` }),
      ),
      1000,
    );
    for (const r of rows) expect(r.amountDue).toBe(333.33);
  });

  it("accumulates across multiple theses per lecturer", () => {
    const rows = computePayments(
      [
        fact({ thesisId: 1, thesisStatus: "COMPLETED" }),
        fact({ thesisId: 2, thesisStatus: "COMPLETED", supervisorsOnThesis: 2 }),
        fact({ thesisId: 3 }),
      ],
      1500,
    );
    expect(rows[0]).toMatchObject({ supervisedCount: 3, completedCount: 2, amountDue: 2250 });
  });

  it("returns an empty list for no assignments", () => {
    expect(computePayments([], 1500)).toEqual([]);
  });

  it("handles a zero rate", () => {
    const rows = computePayments([fact({ thesisStatus: "COMPLETED" })], 0);
    expect(rows[0].amountDue).toBe(0);
  });
});

describe("paymentsToCsv", () => {
  it("produces a header plus one row per lecturer and escapes commas", () => {
    const csv = paymentsToCsv([
      { lecturerId: 1, lecturerName: "Mensah, Prof. Solomon", supervisedCount: 2, completedCount: 1, amountDue: 750 },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Lecturer,Theses Supervised,Theses Completed,Amount Due (GHS)");
    expect(lines[1]).toBe('"Mensah, Prof. Solomon",2,1,750.00');
  });
});

const breakdownRow = (over: Partial<PaymentBreakdownRow>): PaymentBreakdownRow => ({
  assignmentId: 1,
  thesisId: 1,
  thesisTitle: "Thesis A",
  lecturerId: 1,
  lecturerName: "Dr. A",
  supervisorsOnThesis: 1,
  paid: false,
  paidAt: null,
  ...over,
});

describe("summarizePaymentBreakdown", () => {
  it("puts a paid sole-supervised thesis fully in amountPaid", () => {
    const rows = summarizePaymentBreakdown([breakdownRow({ paid: true })], 1500);
    expect(rows[0]).toMatchObject({ completedCount: 1, paidCount: 1, amountPaid: 1500, amountOutstanding: 0 });
  });

  it("puts an unpaid thesis fully in amountOutstanding", () => {
    const rows = summarizePaymentBreakdown([breakdownRow({ paid: false })], 1500);
    expect(rows[0]).toMatchObject({ completedCount: 1, paidCount: 0, amountPaid: 0, amountOutstanding: 1500 });
  });

  it("splits a co-supervised thesis where one supervisor is paid and the other isn't", () => {
    const rows = summarizePaymentBreakdown(
      [
        breakdownRow({ lecturerId: 1, lecturerName: "Dr. A", supervisorsOnThesis: 2, paid: true }),
        breakdownRow({ lecturerId: 2, lecturerName: "Dr. B", supervisorsOnThesis: 2, paid: false }),
      ],
      1500,
    );
    const byId = Object.fromEntries(rows.map((r) => [r.lecturerId, r]));
    expect(byId[1]).toMatchObject({ amountPaid: 750, amountOutstanding: 0 });
    expect(byId[2]).toMatchObject({ amountPaid: 0, amountOutstanding: 750 });
  });

  it("accumulates paid and outstanding across multiple theses for the same lecturer", () => {
    const rows = summarizePaymentBreakdown(
      [
        breakdownRow({ thesisId: 1, paid: true }),
        breakdownRow({ thesisId: 2, paid: false }),
      ],
      1000,
    );
    expect(rows[0]).toMatchObject({ completedCount: 2, paidCount: 1, amountPaid: 1000, amountOutstanding: 1000 });
  });

  it("sorts by outstanding amount descending, so unpaid lecturers surface first", () => {
    const rows = summarizePaymentBreakdown(
      [
        breakdownRow({ lecturerId: 1, lecturerName: "Dr. Paid", paid: true }),
        breakdownRow({ lecturerId: 2, lecturerName: "Dr. Owed", thesisId: 2, paid: false }),
      ],
      1500,
    );
    expect(rows[0].lecturerName).toBe("Dr. Owed");
  });

  it("returns an empty list for no completed assignments", () => {
    expect(summarizePaymentBreakdown([], 1500)).toEqual([]);
  });
});
