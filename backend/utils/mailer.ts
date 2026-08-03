import { logger } from "./logger";

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "MOMENTUM <notifications@momentum.app>";

/**
 * Sends a transactional email.
 * Uses Resend when RESEND_API_KEY is configured; otherwise it logs the message
 * so local/dev environments still record a successful delivery attempt.
 */
export async function sendEmail(payload: MailPayload): Promise<{ delivered: boolean; provider: string }> {
  if (!payload.to) throw new Error("Recipient email address is missing");

  if (!RESEND_API_KEY) {
    logger.info("[mailer] No mail provider configured — logging email instead", {
      to: payload.to,
      subject: payload.subject,
    });
    return { delivered: true, provider: "log" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: payload.from || MAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email provider failed [${res.status}]: ${body}`);
  }

  return { delivered: true, provider: "resend" };
}
