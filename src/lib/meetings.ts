/** Meeting helpers: Jitsi room generation and .ics calendar invites. */

export function generateJitsiUrl(thesisId: number): string {
  const slug = crypto.randomUUID().slice(0, 8);
  return `https://meet.jit.si/UG-TMS-Thesis${thesisId}-${slug}`;
}

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(opts: {
  uid: string;
  title: string;
  description: string;
  startIso: string;
  durationMinutes: number;
  url: string;
}): string {
  const start = new Date(opts.startIso);
  const end = new Date(start.getTime() + opts.durationMinutes * 60_000);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UG TMS//Thesis Management System//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@ug-tms`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(opts.startIso)}`,
    `DTEND:${icsDate(end.toISOString())}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description + "\nJoin: " + opts.url)}`,
    `URL:${opts.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
