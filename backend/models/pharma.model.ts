import { pool } from "../db.js";
import mysql from "mysql2/promise";

export interface DoctorRecord {
  id: string;
  name: string;
  department: string;
  area_locality: string;
  whatsapp_contact: string;
  dob: string | null;
  spouse_dob: string | null;
  anniversary_date: string | null;
  child_dobs: any;
  special_day: string | null;
  gift_accepted_details: string | null;
  created_by: string;
  assigned_to: string;
  created_at?: string;
  updated_at?: string;
  creator_name?: string;
  assignee_name?: string;
}

export interface TradeEntityRecord {
  id: string;
  category: "chemist" | "wholesaler" | "distributor";
  firm_name: string;
  drug_license_no: string;
  gst_number: string;
  address: string;
  proprietor_name: string;
  contact_number: string;
  email: string | null;
  comm_modes: string | null;
  billing_details: string | null;
  payment_details: string | null;
  offer_scheme_details: string | null;
  created_by: string;
  assigned_to: string;
  created_at?: string;
  updated_at?: string;
}

export interface DailyReportRecord {
  id: string;
  user_id: string;
  report_date: string;
  doctor_visits_count: number;
  chemist_visits_count: number;
  wholesale_visits_count: number;
  distributor_visits_count: number;
  billing_amount: number;
  payment_amount: number;
  offers_distributed: string | null;
  special_achievements: string | null;
  notes: string | null;
  created_at?: string;
  user_name?: string;
}

export interface PharmaProductRecord {
  id: string;
  name: string;
  composition: string | null;
  category: string | null;
  packaging: string | null;
  mrp: number;
  ptr: number;
  pts: number;
  image_url: string | null;
  detailing_presentation_url: string | null;
  key_benefits: any;
  active_promotional_scheme: string | null;
  created_at?: string;
}

export class PharmaModel {
  // Helper to recursively get all subordinate user IDs in the pyramid using CTE with BFS fallback
  static async getSubordinateUserIds(userId: string): Promise<string[]> {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `WITH RECURSIVE pyramid_hierarchy AS (
          SELECT id FROM profiles WHERE id = ?
          UNION ALL
          SELECT p.id FROM profiles p
          INNER JOIN pyramid_hierarchy h ON p.manager_id = h.id
        )
        SELECT id FROM pyramid_hierarchy`,
        [userId]
      );
      if (rows && rows.length > 0) {
        return rows.map((r) => r.id as string);
      }
    } catch {
      // Fallback BFS traversal
    }

    const subordinates = new Set<string>([userId]);
    let queue = [userId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT id FROM profiles WHERE manager_id = ?",
        [currentId]
      );
      for (const row of rows) {
        if (row.id && !subordinates.has(row.id)) {
          subordinates.add(row.id);
          queue.push(row.id);
        }
      }
    }

    return Array.from(subordinates);
  }

  // Doctors
  static async getDoctorsForUser(userId: string, isRootAdmin: boolean): Promise<DoctorRecord[]> {
    if (isRootAdmin) {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT d.*, p1.full_name as creator_name, p2.full_name as assignee_name
         FROM doctors d
         LEFT JOIN profiles p1 ON d.created_by = p1.id
         LEFT JOIN profiles p2 ON d.assigned_to = p2.id
         ORDER BY d.created_at DESC`
      );
      return rows as DoctorRecord[];
    }

    const visibleUserIds = await this.getSubordinateUserIds(userId);
    const placeholders = visibleUserIds.map(() => "?").join(",");
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT d.*, p1.full_name as creator_name, p2.full_name as assignee_name
       FROM doctors d
       LEFT JOIN profiles p1 ON d.created_by = p1.id
       LEFT JOIN profiles p2 ON d.assigned_to = p2.id
       WHERE d.created_by IN (${placeholders}) OR d.assigned_to IN (${placeholders})
       ORDER BY d.created_at DESC`,
      [...visibleUserIds, ...visibleUserIds]
    );
    return rows as DoctorRecord[];
  }

  static async createDoctor(doc: Omit<DoctorRecord, "id">): Promise<DoctorRecord> {
    const id = "doc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    await pool.query(
      `INSERT INTO doctors (
        id, name, department, area_locality, whatsapp_contact, dob, spouse_dob,
        anniversary_date, child_dobs, special_day, gift_accepted_details,
        created_by, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        doc.name,
        doc.department,
        doc.area_locality,
        doc.whatsapp_contact,
        doc.dob || null,
        doc.spouse_dob || null,
        doc.anniversary_date || null,
        typeof doc.child_dobs === "string" ? doc.child_dobs : JSON.stringify(doc.child_dobs || []),
        doc.special_day || null,
        doc.gift_accepted_details || null,
        doc.created_by,
        doc.assigned_to || doc.created_by,
      ]
    );
    return (await this.getDoctorsForUser(doc.created_by, true)).find((d) => d.id === id)!;
  }

  static async updateDoctor(id: string, updates: Partial<DoctorRecord>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    const allowed = [
      "name",
      "department",
      "area_locality",
      "whatsapp_contact",
      "dob",
      "spouse_dob",
      "anniversary_date",
      "child_dobs",
      "special_day",
      "gift_accepted_details",
      "assigned_to",
    ];

    for (const key of allowed) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = ?`);
        const val = (updates as any)[key];
        values.push(key === "child_dobs" && typeof val !== "string" ? JSON.stringify(val) : val);
      }
    }

    if (fields.length === 0) return false;
    values.push(id);

    await pool.query(`UPDATE doctors SET ${fields.join(", ")} WHERE id = ?`, values);
    return true;
  }

  // Trade Entities (Chemists, Wholesalers, Distributors)
  static async getTradeEntities(category?: string): Promise<TradeEntityRecord[]> {
    let query = "SELECT * FROM trade_entities";
    const params: any[] = [];

    if (category && category !== "all") {
      query += " WHERE category = ?";
      params.push(category);
    }
    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query<mysql.RowDataPacket[]>(query, params);
    return rows as TradeEntityRecord[];
  }

  static async createTradeEntity(trade: Omit<TradeEntityRecord, "id">): Promise<TradeEntityRecord> {
    const id = "trade-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    await pool.query(
      `INSERT INTO trade_entities (
        id, category, firm_name, drug_license_no, gst_number, address,
        proprietor_name, contact_number, email, comm_modes, billing_details,
        payment_details, offer_scheme_details, created_by, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        trade.category,
        trade.firm_name,
        trade.drug_license_no,
        trade.gst_number,
        trade.address,
        trade.proprietor_name,
        trade.contact_number,
        trade.email || null,
        trade.comm_modes || null,
        trade.billing_details || null,
        trade.payment_details || null,
        trade.offer_scheme_details || null,
        trade.created_by,
        trade.assigned_to || trade.created_by,
      ]
    );
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM trade_entities WHERE id = ?",
      [id]
    );
    return rows[0] as TradeEntityRecord;
  }

  // Daily Reports Workstation
  static async getDailyReports(userId?: string, dateFrom?: string, dateTo?: string): Promise<DailyReportRecord[]> {
    let query = `
      SELECT r.*, p.full_name as user_name
      FROM daily_reports r
      LEFT JOIN profiles p ON r.user_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      query += " AND r.user_id = ?";
      params.push(userId);
    }
    if (dateFrom) {
      query += " AND r.report_date >= ?";
      params.push(dateFrom);
    }
    if (dateTo) {
      query += " AND r.report_date <= ?";
      params.push(dateTo);
    }

    query += " ORDER BY r.report_date DESC, r.created_at DESC";
    const [rows] = await pool.query<mysql.RowDataPacket[]>(query, params);
    return rows as DailyReportRecord[];
  }

  static async createDailyReport(report: Omit<DailyReportRecord, "id">): Promise<DailyReportRecord> {
    const id = "rpt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    await pool.query(
      `INSERT INTO daily_reports (
        id, user_id, report_date, doctor_visits_count, chemist_visits_count,
        wholesale_visits_count, distributor_visits_count, billing_amount,
        payment_amount, offers_distributed, special_achievements, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        report.user_id,
        report.report_date,
        report.doctor_visits_count || 0,
        report.chemist_visits_count || 0,
        report.wholesale_visits_count || 0,
        report.distributor_visits_count || 0,
        report.billing_amount || 0,
        report.payment_amount || 0,
        report.offers_distributed || null,
        report.special_achievements || null,
        report.notes || null,
      ]
    );
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT r.*, p.full_name as user_name FROM daily_reports r LEFT JOIN profiles p ON r.user_id = p.id WHERE r.id = ?`,
      [id]
    );
    return rows[0] as DailyReportRecord;
  }

  // Pharma Detailing Products
  static async getPharmaProducts(): Promise<PharmaProductRecord[]> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM pharma_products ORDER BY created_at DESC"
    );
    return rows as PharmaProductRecord[];
  }
}
