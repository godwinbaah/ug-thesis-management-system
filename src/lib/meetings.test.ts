import { describe, expect, it } from "vitest";
import { buildIcs, generateJitsiUrl } from "./meetings";

describe("generateJitsiUrl", () => {
  it("produces a meet.jit.si URL scoped to the thesis", () => {
    const url = generateJitsiUrl(42);
    expect(url).toMatch(/^https:\/\/meet\.jit\.si\/UG-TMS-Thesis42-[0-9a-f-]{8}$/);
  });

  it("produces unique room names per call", () => {
    expect(generateJitsiUrl(1)).not.toBe(generateJitsiUrl(1));
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({
    uid: "meeting-7",
    title: "Chapter 2 review",
    description: "Discuss methodology; bring drafts",
    startIso: "2026-08-14T10:00:00.000Z",
    durationMinutes: 45,
    url: "https://meet.jit.si/UG-TMS-Thesis1-abc12345",
  });

  it("is a valid VCALENDAR with one VEVENT", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:meeting-7@ug-tms");
  });

  it("computes DTEND from the duration", () => {
    expect(ics).toContain("DTSTART:20260814T100000Z");
    expect(ics).toContain("DTEND:20260814T104500Z");
  });

  it("escapes special characters in text fields", () => {
    expect(ics).toContain("DESCRIPTION:Discuss methodology\\; bring drafts");
  });
});
