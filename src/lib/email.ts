import "server-only";

/**
 * Minimal transactional-email sender via the Resend REST API (plain fetch —
 * no SDK dependency). Without RESEND_API_KEY set, sends no-op to a console
 * log so the app runs and is fully testable without an email account.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function layout(heading: string, bodyHtml: string, cta?: { href: string; label: string }): string {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
      <p style="font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: #2563eb; font-weight: 600; margin: 0 0 8px;">
        UG Thesis Management
      </p>
      <h2 style="margin: 0 0 12px; font-size: 18px;">${heading}</h2>
      <div style="font-size: 14px; line-height: 1.6; color: #334155;">${bodyHtml}</div>
      ${
        cta
          ? `<p style="margin-top: 20px;">
               <a href="${cta.href}" style="display: inline-block; padding: 10px 18px; background: #1d4ed8; color: #ffffff; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">${cta.label}</a>
             </p>`
          : ""
      }
      <p style="margin-top: 28px; font-size: 12px; color: #94a3b8;">
        This is an automated notification — please do not reply to this email.
      </p>
    </div>`;
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "UG Thesis Management <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[email:skipped — RESEND_API_KEY not set] to=${opts.to} subject="${opts.subject}"`);
    return;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[email:failed] ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    // Notifications are best-effort: a failed/slow send must never break the
    // action that triggered it (upload, feedback, scheduling, payment).
    console.error("[email:error]", err);
  }
}

export async function notifyChapterSubmitted(opts: {
  to: string[];
  studentName: string;
  thesisTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  thesisId: number;
}): Promise<void> {
  const html = layout(
    "New chapter submitted",
    `<p><b>${opts.studentName}</b> submitted <b>Chapter ${opts.chapterNumber}: ${opts.chapterTitle}</b> for review.</p>
     <p>Thesis: ${opts.thesisTitle}</p>`,
    { href: `${appUrl()}/lecturer/thesis/${opts.thesisId}`, label: "Review chapter" },
  );
  await Promise.all(
    opts.to.map((to) =>
      sendEmail({ to, subject: `New submission: Chapter ${opts.chapterNumber} — ${opts.thesisTitle}`, html }),
    ),
  );
}

export async function notifyFeedbackGiven(opts: {
  to: string;
  lecturerName: string;
  thesisTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  decision: "NEEDS_CORRECTION" | "APPROVED";
}): Promise<void> {
  const decisionText = opts.decision === "APPROVED" ? "approved" : "needs correction";
  const html = layout(
    "You have new feedback",
    `<p><b>${opts.lecturerName}</b> reviewed <b>Chapter ${opts.chapterNumber}: ${opts.chapterTitle}</b> and marked it <b>${decisionText}</b>.</p>
     <p>Thesis: ${opts.thesisTitle}</p>`,
    { href: `${appUrl()}/student/chapters`, label: "View feedback" },
  );
  await sendEmail({
    to: opts.to,
    subject: `Feedback on Chapter ${opts.chapterNumber} — ${opts.thesisTitle}`,
    html,
  });
}

export async function notifyMeetingScheduled(opts: {
  to: string[];
  organizerName: string;
  thesisTitle: string;
  meetingTitle: string;
  scheduledAtIso: string;
  jitsiUrl: string;
}): Promise<void> {
  const when = new Date(opts.scheduledAtIso).toUTCString();
  const html = layout(
    "New meeting scheduled",
    `<p><b>${opts.organizerName}</b> scheduled <b>${opts.meetingTitle}</b> for ${when}.</p>
     <p>Thesis: ${opts.thesisTitle}</p>`,
    { href: opts.jitsiUrl, label: "Join video call" },
  );
  await Promise.all(
    opts.to.map((to) => sendEmail({ to, subject: `Meeting scheduled: ${opts.meetingTitle}`, html })),
  );
}

export async function notifyPaymentProcessed(opts: {
  to: string;
  lecturerName: string;
  thesisTitle: string;
  amount: number;
}): Promise<void> {
  const html = layout(
    "Payment processed",
    `<p>Hi ${opts.lecturerName}, your supervision payment has been processed.</p>
     <p>Thesis: <b>${opts.thesisTitle}</b><br/>Amount: <b>GH₵ ${opts.amount.toFixed(2)}</b></p>`,
    { href: `${appUrl()}/lecturer`, label: "View my dashboard" },
  );
  await sendEmail({ to: opts.to, subject: `Payment processed: ${opts.thesisTitle}`, html });
}

export async function notifyThesisCompleted(opts: {
  to: string;
  thesisTitle: string;
}): Promise<void> {
  const html = layout(
    "Your thesis has been marked complete",
    `<p>Congratulations! <b>${opts.thesisTitle}</b> has been marked as completed by your supervisor.</p>`,
    { href: `${appUrl()}/student`, label: "View my thesis" },
  );
  await sendEmail({ to: opts.to, subject: `Thesis completed: ${opts.thesisTitle}`, html });
}
