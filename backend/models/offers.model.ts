import mysql from "mysql2/promise";
import { pool } from "../db";
import { sendEmail } from "../utils/mailer";

const rid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export type OfferStatus = "draft" | "scheduled" | "active" | "paused" | "expired";
export type RecipientType = "employee" | "doctor" | "trade" | "external";
export type DeliveryStatus = "pending" | "scheduled" | "sent" | "failed";

export interface Offer {
  id: string;
  title: string;
  promo_code: string | null;
  description: string | null;
  details: string | null;
  image_url: string | null;
  offer_type: string;
  value_details: string | null;
  terms: string | null;
  valid_from: string | null;
  valid_to: string | null;
  status: OfferStatus;
  scheduled_at: string | null;
  email_subject: string | null;
  email_body: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  creator_name?: string;
  recipient_count?: number;
  sent_count?: number;
}

export interface OfferRecipient {
  id: string;
  offer_id: string;
  recipient_type: RecipientType;
  recipient_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  channel: "email" | "notification" | "both";
  delivery_status: DeliveryStatus;
  error_message: string | null;
  sent_at: string | null;
  created_by: string;
  created_at?: string;
  offer_title?: string;
  promo_code?: string | null;
}

const OFFER_SELECT = `
  SELECT o.*, p.full_name AS creator_name,
    (SELECT COUNT(*) FROM offer_recipients r WHERE r.offer_id = o.id) AS recipient_count,
    (SELECT COUNT(*) FROM offer_recipients r WHERE r.offer_id = o.id AND r.delivery_status = 'sent') AS sent_count
  FROM offers o
  LEFT JOIN profiles p ON o.created_by = p.id
`;

const OFFER_FIELDS = [
  "title",
  "promo_code",
  "description",
  "details",
  "image_url",
  "offer_type",
  "value_details",
  "terms",
  "valid_from",
  "valid_to",
  "status",
  "scheduled_at",
  "email_subject",
  "email_body",
] as const;

function nullable(value: unknown) {
  return value === undefined || value === "" ? null : value;
}

export class OffersModel {
  static async list(status?: string): Promise<Offer[]> {
    const params: unknown[] = [];
    let where = "";
    if (status && status !== "all") {
      where = "WHERE o.status = ?";
      params.push(status);
    }
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `${OFFER_SELECT} ${where} ORDER BY o.created_at DESC`,
      params,
    );
    return rows as Offer[];
  }

  static async findById(id: string): Promise<Offer | null> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`${OFFER_SELECT} WHERE o.id = ?`, [id]);
    return (rows[0] as Offer) || null;
  }

  static async create(input: Partial<Offer> & { created_by: string }): Promise<Offer> {
    if (!input.title) throw new Error("Offer title is required");
    const id = rid("offer");
    await pool.query(
      `INSERT INTO offers
        (id, title, promo_code, description, details, image_url, offer_type, value_details, terms,
         valid_from, valid_to, status, scheduled_at, email_subject, email_body, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        input.title,
        nullable(input.promo_code),
        nullable(input.description),
        nullable(input.details),
        nullable(input.image_url),
        input.offer_type || "scheme",
        nullable(input.value_details),
        nullable(input.terms),
        nullable(input.valid_from),
        nullable(input.valid_to),
        input.status || (input.scheduled_at ? "scheduled" : "draft"),
        nullable(input.scheduled_at),
        nullable(input.email_subject),
        nullable(input.email_body),
        input.created_by,
      ],
    );
    return (await this.findById(id))!;
  }

  static async update(id: string, updates: Partial<Offer>): Promise<Offer | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of OFFER_FIELDS) {
      if (updates[key] === undefined) continue;
      fields.push(`${key} = ?`);
      values.push(nullable(updates[key]));
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE offers SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async remove(id: string): Promise<boolean> {
    await pool.query("DELETE FROM offer_recipients WHERE offer_id = ?", [id]);
    const [res] = await pool.query<mysql.ResultSetHeader>("DELETE FROM offers WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  /* ---------------- recipients ---------------- */

  static async listRecipients(offerId?: string): Promise<OfferRecipient[]> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT r.*, o.title AS offer_title, o.promo_code
       FROM offer_recipients r
       LEFT JOIN offers o ON o.id = r.offer_id
       ${offerId ? "WHERE r.offer_id = ?" : ""}
       ORDER BY r.created_at DESC
       LIMIT 500`,
      offerId ? [offerId] : [],
    );
    return rows as OfferRecipient[];
  }

  /** Resolve missing name/email for internal targets. */
  private static async hydrate(rec: Partial<OfferRecipient>) {
    let name = rec.recipient_name || null;
    let email = rec.recipient_email || null;
    if (rec.recipient_id && (!name || !email)) {
      const table =
        rec.recipient_type === "doctor"
          ? { t: "doctors", n: "name", e: "email" }
          : rec.recipient_type === "trade"
            ? { t: "trade_entities", n: "firm_name", e: "email" }
            : { t: "profiles", n: "full_name", e: "email" };
      try {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT ${table.n} AS label, ${table.e} AS mail FROM ${table.t} WHERE id = ?`,
          [rec.recipient_id],
        );
        name = name || (rows[0]?.label as string) || null;
        email = email || (rows[0]?.mail as string) || null;
      } catch {
        /* column may not exist on that table */
      }
    }
    return { name, email };
  }

  /**
   * Attach recipients to an offer and (unless the offer is scheduled) deliver
   * them right away. Internal employees get an in-app notification + email,
   * doctors / trade / outside contacts get the email template only.
   */
  static async addRecipients(
    offerId: string,
    recipients: Array<Partial<OfferRecipient>>,
    createdBy: string,
    options: { deliver?: boolean } = {},
  ) {
    const offer = await this.findById(offerId);
    if (!offer) throw new Error("Offer not found");
    const deliverNow = options.deliver ?? offer.status !== "scheduled";

    const created: OfferRecipient[] = [];
    for (const rec of recipients) {
      const { name, email } = await this.hydrate(rec);
      const type = (rec.recipient_type || "employee") as RecipientType;
      const channel = rec.channel || (type === "employee" ? "both" : "email");
      const id = rid("orcp");
      await pool.query(
        `INSERT INTO offer_recipients
          (id, offer_id, recipient_type, recipient_id, recipient_name, recipient_email, channel, delivery_status, created_by)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          id,
          offerId,
          type,
          rec.recipient_id || null,
          name,
          email,
          channel,
          deliverNow ? "pending" : "scheduled",
          createdBy,
        ],
      );
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM offer_recipients WHERE id = ?",
        [id],
      );
      created.push(rows[0] as OfferRecipient);
    }

    if (deliverNow) return this.dispatch(offerId);
    return created;
  }

  static async removeRecipient(id: string) {
    const [res] = await pool.query<mysql.ResultSetHeader>(
      "DELETE FROM offer_recipients WHERE id = ?",
      [id],
    );
    return res.affectedRows > 0;
  }

  /** Deliver every pending/scheduled recipient of an offer. */
  static async dispatch(offerId: string): Promise<OfferRecipient[]> {
    const offer = await this.findById(offerId);
    if (!offer) throw new Error("Offer not found");

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM offer_recipients WHERE offer_id = ? AND delivery_status IN ('pending','scheduled','failed')",
      [offerId],
    );

    for (const raw of rows as OfferRecipient[]) {
      try {
        const subject = offer.email_subject || `New offer: ${offer.title}`;
        const html = renderOfferEmail(offer, raw);

        if (raw.channel !== "notification" && raw.recipient_email) {
          await sendEmail({ to: raw.recipient_email, subject, html });
        }

        if (raw.recipient_type === "employee" && raw.recipient_id && raw.channel !== "email") {
          await NotificationsModel.create({
            user_id: raw.recipient_id,
            type: "offer",
            title: `New offer: ${offer.title}`,
            message: offer.promo_code
              ? `${offer.description || "An offer has been shared with you."} (Promo code: ${offer.promo_code})`
              : offer.description || "An offer has been shared with you.",
            link: "/appreciation",
            entity_type: "offer",
            entity_id: offer.id,
            actor_id: offer.created_by,
          });
        }

        await pool.query(
          "UPDATE offer_recipients SET delivery_status = 'sent', sent_at = NOW(), error_message = NULL WHERE id = ?",
          [raw.id],
        );
      } catch (err) {
        await pool.query(
          "UPDATE offer_recipients SET delivery_status = 'failed', error_message = ? WHERE id = ?",
          [String(err).slice(0, 480), raw.id],
        );
      }
    }

    if (offer.status === "scheduled" || offer.status === "draft") {
      await pool.query("UPDATE offers SET status = 'active' WHERE id = ?", [offerId]);
    }

    return this.listRecipients(offerId);
  }

  /** Called by the background scheduler: release offers whose time has come. */
  static async releaseDueScheduled(): Promise<number> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM offers WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()",
    );
    for (const row of rows) {
      await this.dispatch(row.id as string);
    }
    return rows.length;
  }
}

export function renderOfferEmail(offer: Offer, recipient: Partial<OfferRecipient>): string {
  if (offer.email_body) {
    return offer.email_body
      .replace(/\{\{\s*name\s*\}\}/g, recipient.recipient_name || "there")
      .replace(/\{\{\s*title\s*\}\}/g, offer.title)
      .replace(/\{\{\s*promo_code\s*\}\}/g, offer.promo_code || "")
      .replace(/\{\{\s*details\s*\}\}/g, offer.details || offer.description || "")
      .replace(/\{\{\s*valid_to\s*\}\}/g, offer.valid_to || "");
  }
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      ${offer.image_url ? `<img src="${offer.image_url}" alt="${offer.title}" style="width:100%;display:block" />` : ""}
      <div style="padding:24px">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#059669">MOMENTUM Offer</p>
        <h1 style="margin:0 0 12px;font-size:22px">${offer.title}</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6">Hi ${recipient.recipient_name || "there"},</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6">${offer.description || ""}</p>
        ${offer.details ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6">${offer.details}</p>` : ""}
        ${
          offer.promo_code
            ? `<p style="margin:0 0 16px;font-size:16px"><strong>Promo code:</strong>
                 <span style="background:#ecfdf5;border:1px dashed #059669;border-radius:6px;padding:6px 10px;font-family:monospace">${offer.promo_code}</span></p>`
            : ""
        }
        ${offer.value_details ? `<p style="margin:0 0 8px;font-size:14px"><strong>Value:</strong> ${offer.value_details}</p>` : ""}
        ${offer.valid_to ? `<p style="margin:0 0 8px;font-size:13px;color:#475569">Valid till ${offer.valid_to}</p>` : ""}
        ${offer.terms ? `<p style="margin:16px 0 0;font-size:12px;color:#64748b">${offer.terms}</p>` : ""}
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  read: boolean;
  created_at?: string;
}

export class NotificationsModel {
  static async listForUser(userId: string): Promise<NotificationRecord[]> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
      [userId],
    );
    return (rows as unknown as Array<NotificationRecord & { is_read?: number }>).map((n) => ({
      ...n,
      read: Boolean(n.is_read),
    }));
  }

  static async create(input: Partial<NotificationRecord> & { user_id: string; title: string }) {
    const id = rid("ntf");
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, link, entity_type, entity_id, actor_id, is_read)
       VALUES (?,?,?,?,?,?,?,?,?,0)`,
      [
        id,
        input.user_id,
        input.type || "info",
        input.title,
        input.message || "",
        input.link || null,
        input.entity_type || null,
        input.entity_id || null,
        input.actor_id || null,
      ],
    );
    return id;
  }

  static async markRead(id: string, userId: string, read: boolean) {
    await pool.query("UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?", [
      read ? 1 : 0,
      id,
      userId,
    ]);
  }

  static async markAllRead(userId: string) {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
  }

  static async clear(userId: string) {
    await pool.query("DELETE FROM notifications WHERE user_id = ?", [userId]);
  }
}
