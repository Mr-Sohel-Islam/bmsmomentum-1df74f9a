import { pool } from "../db.js";
import mysql from "mysql2/promise";
import { PharmaModel } from "./pharma.model";

const rid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export interface ReportRecord {
  id: string;
  title: string;
  report_type: string;
  period: string;
  author_id: string;
  recipient_id: string | null;
  summary: string;
  metrics_snapshot: any;
  status: "draft" | "sent" | "acknowledged";
  sent_at: string | null;
  acknowledged_at: string | null;
  created_at?: string;
  updated_at?: string;
  author_name?: string;
  recipient_name?: string;
}

const REPORT_SELECT = `
  SELECT r.*, a.full_name AS author_name, rc.full_name AS recipient_name
  FROM reports r
  LEFT JOIN profiles a ON r.author_id = a.id
  LEFT JOIN profiles rc ON r.recipient_id = rc.id
`;

export class ReportsModel {
  static async list(
    userId: string,
    isRootAdmin: boolean,
    filters: { status?: string; period?: string; author_id?: string } = {},
  ): Promise<ReportRecord[]> {
    const where: string[] = [];
    const params: any[] = [];

    if (!isRootAdmin) {
      const visible = await PharmaModel.getSubordinateUserIds(userId);
      const ph = visible.map(() => "?").join(",");
      where.push(`(r.author_id IN (${ph}) OR r.recipient_id = ?)`);
      params.push(...visible, userId);
    }
    if (filters.status && filters.status !== "all") {
      where.push("r.status = ?");
      params.push(filters.status);
    }
    if (filters.period) {
      where.push("r.period = ?");
      params.push(filters.period);
    }
    if (filters.author_id) {
      where.push("r.author_id = ?");
      params.push(filters.author_id);
    }

    const sql = `${REPORT_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY r.created_at DESC`;
    const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
    return rows as ReportRecord[];
  }

  static async findById(id: string): Promise<ReportRecord | null> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`${REPORT_SELECT} WHERE r.id = ?`, [id]);
    return (rows[0] as ReportRecord) || null;
  }

  static async create(input: Partial<ReportRecord> & { author_id: string }): Promise<ReportRecord> {
    const id = rid("rep");
    await pool.query(
      `INSERT INTO reports
        (id, title, report_type, period, author_id, recipient_id, summary, metrics_snapshot, status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.report_type || "performance",
        input.period || "monthly",
        input.author_id,
        input.recipient_id || null,
        input.summary || "",
        JSON.stringify(input.metrics_snapshot || {}),
        input.status || "draft",
        input.status === "sent" ? new Date() : null,
      ],
    );
    return (await this.findById(id))!;
  }

  static async update(id: string, updates: Partial<ReportRecord>): Promise<ReportRecord | null> {
    const allowed = ["title", "report_type", "period", "recipient_id", "summary", "metrics_snapshot", "status"];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      const val = (updates as any)[key];
      if (val === undefined) continue;
      fields.push(`${key} = ?`);
      values.push(key === "metrics_snapshot" && typeof val !== "string" ? JSON.stringify(val) : val);
    }
    if (updates.status === "sent") fields.push("sent_at = NOW()");
    if (updates.status === "acknowledged") fields.push("acknowledged_at = NOW()");
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE reports SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async remove(id: string): Promise<boolean> {
    const [res] = await pool.query<mysql.ResultSetHeader>("DELETE FROM reports WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  static async summary(userId: string, isRootAdmin: boolean) {
    const reports = await this.list(userId, isRootAdmin);
    const [activity] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(doctor_visits_count),0)      AS doctor_visits,
         COALESCE(SUM(chemist_visits_count),0)     AS chemist_visits,
         COALESCE(SUM(wholesale_visits_count),0)   AS wholesale_visits,
         COALESCE(SUM(distributor_visits_count),0) AS distributor_visits,
         COALESCE(SUM(billing_amount),0)           AS billing_amount,
         COALESCE(SUM(payment_amount),0)           AS payment_amount
       FROM daily_reports`,
    );
    const [byMonth] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT DATE_FORMAT(report_date, '%Y-%m') AS month,
              COALESCE(SUM(billing_amount),0) AS billing,
              COALESCE(SUM(payment_amount),0) AS payment,
              COALESCE(SUM(doctor_visits_count + chemist_visits_count + wholesale_visits_count + distributor_visits_count),0) AS visits
       FROM daily_reports
       GROUP BY month
       ORDER BY month ASC
       LIMIT 12`,
    );

    return {
      total: reports.length,
      drafts: reports.filter((r) => r.status === "draft").length,
      sent: reports.filter((r) => r.status === "sent").length,
      acknowledged: reports.filter((r) => r.status === "acknowledged").length,
      field_activity: activity[0] || {},
      trend: byMonth,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */

export interface OfferRecord {
  id: string;
  code: string;
  title: string;
  description: string | null;
  offer_type: string;
  value_details: string | null;
  valid_from: string | null;
  valid_to: string | null;
  status: "active" | "paused" | "expired";
  created_by: string;
  created_at?: string;
  creator_name?: string;
  assignment_count?: number;
}

export interface OfferAssignmentRecord {
  id: string;
  offer_id: string;
  target_type: "doctor" | "trade" | "employee";
  target_id: string;
  target_name: string | null;
  assigned_to: string | null;
  status: "assigned" | "delivered" | "declined";
  notes: string | null;
  assigned_by: string;
  created_at?: string;
}

export class OffersModel {
  static async list(status?: string): Promise<OfferRecord[]> {
    const params: any[] = [];
    let where = "";
    if (status && status !== "all") {
      where = "WHERE o.status = ?";
      params.push(status);
    }
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT o.*, p.full_name AS creator_name,
              (SELECT COUNT(*) FROM offer_assignments a WHERE a.offer_id = o.id) AS assignment_count
       FROM offers o
       LEFT JOIN profiles p ON o.created_by = p.id
       ${where}
       ORDER BY o.created_at DESC`,
      params,
    );
    return rows as OfferRecord[];
  }

  static async findById(id: string): Promise<OfferRecord | null> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT * FROM offers WHERE id = ?", [id]);
    return (rows[0] as OfferRecord) || null;
  }

  static async create(input: Partial<OfferRecord> & { created_by: string }): Promise<OfferRecord> {
    const id = rid("offer");
    await pool.query(
      `INSERT INTO offers (id, code, title, description, offer_type, value_details, valid_from, valid_to, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.code || id.toUpperCase().slice(0, 16),
        input.title,
        input.description || null,
        input.offer_type || "scheme",
        input.value_details || null,
        input.valid_from || null,
        input.valid_to || null,
        input.status || "active",
        input.created_by,
      ],
    );
    return (await this.findById(id))!;
  }

  static async update(id: string, updates: Partial<OfferRecord>): Promise<OfferRecord | null> {
    const allowed = [
      "code",
      "title",
      "description",
      "offer_type",
      "value_details",
      "valid_from",
      "valid_to",
      "status",
    ];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if ((updates as any)[key] === undefined) continue;
      fields.push(`${key} = ?`);
      values.push((updates as any)[key]);
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE offers SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async remove(id: string): Promise<boolean> {
    await pool.query("DELETE FROM offer_assignments WHERE offer_id = ?", [id]);
    const [res] = await pool.query<mysql.ResultSetHeader>("DELETE FROM offers WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  static async listAssignments(filters: {
    offer_id?: string;
    target_type?: string;
    target_id?: string;
    assigned_to?: string;
  } = {}): Promise<(OfferAssignmentRecord & { offer_title?: string })[]> {
    const where: string[] = [];
    const params: any[] = [];
    for (const key of ["offer_id", "target_type", "target_id", "assigned_to"] as const) {
      const val = filters[key];
      if (val) {
        where.push(`a.${key} = ?`);
        params.push(val);
      }
    }
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT a.*, o.title AS offer_title, o.code AS offer_code, o.offer_type, p.full_name AS assignee_name
       FROM offer_assignments a
       LEFT JOIN offers o ON a.offer_id = o.id
       LEFT JOIN profiles p ON a.assigned_to = p.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY a.created_at DESC`,
      params,
    );
    return rows as any;
  }

  static async assign(input: Partial<OfferAssignmentRecord> & { offer_id: string; assigned_by: string }) {
    const id = rid("oasg");
    let targetName = input.target_name || null;

    if (!targetName && input.target_id) {
      const table =
        input.target_type === "doctor" ? "doctors" : input.target_type === "trade" ? "trade_entities" : "profiles";
      const col = input.target_type === "doctor" ? "name" : input.target_type === "trade" ? "firm_name" : "full_name";
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT ${col} AS label FROM ${table} WHERE id = ?`,
        [input.target_id],
      );
      targetName = (rows[0]?.label as string) || null;
    }

    await pool.query(
      `INSERT INTO offer_assignments (id, offer_id, target_type, target_id, target_name, assigned_to, status, notes, assigned_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.offer_id,
        input.target_type || "doctor",
        input.target_id,
        targetName,
        input.assigned_to || null,
        input.status || "assigned",
        input.notes || null,
        input.assigned_by,
      ],
    );
    const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT * FROM offer_assignments WHERE id = ?", [id]);
    return rows[0] as OfferAssignmentRecord;
  }

  static async updateAssignment(id: string, updates: Partial<OfferAssignmentRecord>) {
    const allowed = ["status", "notes", "assigned_to"];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if ((updates as any)[key] === undefined) continue;
      fields.push(`${key} = ?`);
      values.push((updates as any)[key]);
    }
    if (fields.length === 0) return false;
    values.push(id);
    await pool.query(`UPDATE offer_assignments SET ${fields.join(", ")} WHERE id = ?`, values);
    return true;
  }

  static async removeAssignment(id: string) {
    const [res] = await pool.query<mysql.ResultSetHeader>("DELETE FROM offer_assignments WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }
}

/* ------------------------------------------------------------------ */
/* Special date reminders + message templates                          */
/* ------------------------------------------------------------------ */

export interface MessageTemplateRecord {
  id: string;
  name: string;
  occasion: string;
  channel: "email" | "whatsapp";
  subject: string | null;
  body: string;
  is_default: number;
  created_by: string;
  created_at?: string;
}

export interface ReminderLogRecord {
  id: string;
  entity_type: "doctor" | "trade";
  entity_id: string;
  entity_name: string | null;
  occasion: string;
  event_date: string | null;
  channel: string;
  recipient: string | null;
  subject: string | null;
  message: string;
  status: string;
  sent_by: string;
  created_at?: string;
}

function daysUntil(monthDay: Date, today: Date): number {
  const year = today.getFullYear();
  let next = new Date(year, monthDay.getMonth(), monthDay.getDate());
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (next < base) next = new Date(year + 1, monthDay.getMonth(), monthDay.getDate());
  return Math.round((next.getTime() - base.getTime()) / 86400000);
}

export interface UpcomingReminder {
  entity_type: "doctor" | "trade";
  entity_id: string;
  entity_name: string;
  occasion: string;
  label: string;
  event_date: string;
  days_until: number;
  contact: string | null;
  email: string | null;
  assigned_to: string | null;
}

export class RemindersModel {
  static async templates(occasion?: string): Promise<MessageTemplateRecord[]> {
    const params: any[] = [];
    let where = "";
    if (occasion && occasion !== "all") {
      where = "WHERE occasion = ?";
      params.push(occasion);
    }
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM message_templates ${where} ORDER BY is_default DESC, created_at DESC`,
      params,
    );
    return rows as MessageTemplateRecord[];
  }

  static async createTemplate(input: Partial<MessageTemplateRecord> & { created_by: string }) {
    const id = rid("tpl");
    await pool.query(
      `INSERT INTO message_templates (id, name, occasion, channel, subject, body, is_default, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.occasion || "custom",
        input.channel || "email",
        input.subject || null,
        input.body,
        input.is_default ? 1 : 0,
        input.created_by,
      ],
    );
    const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT * FROM message_templates WHERE id = ?", [id]);
    return rows[0] as MessageTemplateRecord;
  }

  static async updateTemplate(id: string, updates: Partial<MessageTemplateRecord>) {
    const allowed = ["name", "occasion", "channel", "subject", "body", "is_default"];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if ((updates as any)[key] === undefined) continue;
      fields.push(`${key} = ?`);
      values.push(key === "is_default" ? ((updates as any)[key] ? 1 : 0) : (updates as any)[key]);
    }
    if (fields.length === 0) return false;
    values.push(id);
    await pool.query(`UPDATE message_templates SET ${fields.join(", ")} WHERE id = ?`, values);
    return true;
  }

  static async removeTemplate(id: string) {
    const [res] = await pool.query<mysql.ResultSetHeader>("DELETE FROM message_templates WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  static async upcoming(
    userId: string,
    isRootAdmin: boolean,
    windowDays = 30,
  ): Promise<UpcomingReminder[]> {
    const doctors = await PharmaModel.getDoctorsForUser(userId, isRootAdmin);
    const trades = await PharmaModel.getTradeEntitiesForUser(userId, isRootAdmin);
    const today = new Date();
    const out: UpcomingReminder[] = [];

    const push = (
      entity_type: "doctor" | "trade",
      entity_id: string,
      entity_name: string,
      occasion: string,
      label: string,
      raw: any,
      contact: string | null,
      email: string | null,
      assigned_to: string | null,
    ) => {
      if (!raw) return;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;
      const d = daysUntil(date, today);
      if (d > windowDays) return;
      out.push({
        entity_type,
        entity_id,
        entity_name,
        occasion,
        label,
        event_date: new Date(date).toISOString().split("T")[0],
        days_until: d,
        contact,
        email,
        assigned_to,
      });
    };

    for (const d of doctors) {
      push("doctor", d.id, d.name, "birthday", "Doctor birthday", d.dob, d.whatsapp_contact, null, d.assigned_to);
      push("doctor", d.id, d.name, "spouse_birthday", "Spouse birthday", d.spouse_dob, d.whatsapp_contact, null, d.assigned_to);
      push("doctor", d.id, d.name, "anniversary", "Wedding anniversary", d.anniversary_date, d.whatsapp_contact, null, d.assigned_to);
      const kids = Array.isArray(d.child_dobs)
        ? d.child_dobs
        : typeof d.child_dobs === "string"
          ? JSON.parse(d.child_dobs || "[]")
          : [];
      kids.forEach((kid: string, i: number) =>
        push("doctor", d.id, d.name, "child_birthday", `Child ${i + 1} birthday`, kid, d.whatsapp_contact, null, d.assigned_to),
      );
    }

    for (const t of trades as any[]) {
      push(
        "trade",
        t.id,
        t.firm_name,
        "proprietor_birthday",
        `${t.category} proprietor birthday`,
        t.proprietor_dob,
        t.contact_number,
        t.email,
        t.assigned_to,
      );
      push(
        "trade",
        t.id,
        t.firm_name,
        "anniversary",
        `${t.category} firm anniversary`,
        t.firm_anniversary,
        t.contact_number,
        t.email,
        t.assigned_to,
      );
    }

    return out.sort((a, b) => a.days_until - b.days_until);
  }

  static async logs(entityId?: string): Promise<ReminderLogRecord[]> {
    const params: any[] = [];
    let where = "";
    if (entityId) {
      where = "WHERE entity_id = ?";
      params.push(entityId);
    }
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM reminder_logs ${where} ORDER BY created_at DESC LIMIT 200`,
      params,
    );
    return rows as ReminderLogRecord[];
  }

  static async send(input: Partial<ReminderLogRecord> & { sent_by: string }) {
    const id = rid("rem");
    await pool.query(
      `INSERT INTO reminder_logs
        (id, entity_type, entity_id, entity_name, occasion, event_date, channel, recipient, subject, message, status, sent_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.entity_type || "doctor",
        input.entity_id,
        input.entity_name || null,
        input.occasion || "custom",
        input.event_date || null,
        input.channel || "email",
        input.recipient || null,
        input.subject || null,
        input.message,
        input.status || "sent",
        input.sent_by,
      ],
    );
    const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT * FROM reminder_logs WHERE id = ?", [id]);
    return rows[0] as ReminderLogRecord;
  }
}
