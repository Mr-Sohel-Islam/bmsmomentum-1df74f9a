import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db";
import { crypto } from "../utils";

export interface Metric {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  weight: number;
  active: boolean;
  created_at?: string;
}

export interface MetricScore {
  id: string;
  metric_id: string;
  user_id: string;
  score: number;
  value?: number;
  period: string;
  evaluated_by: string | null;
  recorded_by?: string | null;
  created_at?: string;
}

export class PerformanceModel {
  static async findAllMetrics(): Promise<Metric[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM metrics ORDER BY created_at DESC",
    );
    return rows.map((r) => ({ ...r, active: Boolean(r.active) })) as Metric[];
  }

  static async findMetricById(id: string): Promise<Metric | null> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM metrics WHERE id = ?", [id]);
    if (!rows[0]) return null;
    return { ...rows[0], active: Boolean(rows[0].active) } as Metric;
  }

  static async createMetric(data: Omit<Metric, "id" | "created_at">): Promise<Metric> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO metrics (id, name, description, unit, weight, active) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        data.name,
        data.description || null,
        data.unit || null,
        data.weight || 1,
        data.active ? 1 : 0,
      ],
    );
    const metric = await this.findMetricById(id);
    return metric!;
  }

  static async updateMetric(
    id: string,
    data: Partial<Omit<Metric, "id" | "created_at">>,
  ): Promise<Metric | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.unit !== undefined) {
      fields.push("unit = ?");
      values.push(data.unit);
    }
    if (data.weight !== undefined) {
      fields.push("weight = ?");
      values.push(data.weight);
    }
    if (data.active !== undefined) {
      fields.push("active = ?");
      values.push(data.active ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE metrics SET ${fields.join(", ")} WHERE id = ?`, values);
    }
    return this.findMetricById(id);
  }

  static async deleteMetric(id: string): Promise<boolean> {
    await pool.query("DELETE FROM metric_scores WHERE metric_id = ?", [id]);
    const [res] = await pool.query<ResultSetHeader>("DELETE FROM metrics WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  static async findAllScores(): Promise<MetricScore[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ms.id, ms.metric_id, ms.user_id, COALESCE(ms.score, ms.value, 0) as score, COALESCE(ms.score, ms.value, 0) as value, ms.period, COALESCE(ms.scored_by, ms.recorded_by, ms.evaluated_by) as evaluated_by, ms.created_at, m.name as metric_name, m.unit, m.weight
       FROM metric_scores ms
       LEFT JOIN metrics m ON m.id = ms.metric_id
       ORDER BY ms.created_at DESC`,
    );
    return rows as MetricScore[];
  }

  static async findMetricScoresByUser(userId: string): Promise<MetricScore[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ms.id, ms.metric_id, ms.user_id, COALESCE(ms.score, ms.value, 0) as score, COALESCE(ms.score, ms.value, 0) as value, ms.period, COALESCE(ms.scored_by, ms.recorded_by, ms.evaluated_by) as evaluated_by, ms.created_at, m.name as metric_name, m.unit, m.weight
       FROM metric_scores ms
       LEFT JOIN metrics m ON m.id = ms.metric_id
       WHERE ms.user_id = ?
       ORDER BY ms.created_at DESC`,
      [userId],
    );
    return rows as MetricScore[];
  }

  static async addMetricScore(data: Omit<MetricScore, "id" | "created_at">): Promise<MetricScore> {
    const id = crypto.randomUUID();
    const scoreVal = data.score ?? data.value ?? 0;
    await pool.query(
      "INSERT INTO metric_scores (id, metric_id, user_id, score, value, period, scored_by, recorded_by, evaluated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        data.metric_id,
        data.user_id,
        scoreVal,
        scoreVal,
        data.period,
        data.evaluated_by || null,
        data.evaluated_by || null,
        data.evaluated_by || null,
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM metric_scores WHERE id = ?", [
      id,
    ]);
    return rows[0] as MetricScore;
  }

  static async deleteMetricScore(id: string): Promise<boolean> {
    const [res] = await pool.query<ResultSetHeader>("DELETE FROM metric_scores WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }
}
