import { RowDataPacket } from "mysql2/promise";
import { pool } from "../db";
import { crypto } from "../utils";

export interface Appreciation {
  id: string;
  from_user: string;
  to_user: string;
  message: string;
  points: number;
  created_at?: string;
}

export class AppreciationModel {
  static async findAll(): Promise<Appreciation[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM appreciations ORDER BY created_at DESC",
    );
    return rows as Appreciation[];
  }

  static async create(data: Omit<Appreciation, "id" | "created_at">): Promise<Appreciation> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO appreciations (id, from_user, to_user, message, points) VALUES (?, ?, ?, ?, ?)",
      [id, data.from_user, data.to_user, data.message, data.points || 0],
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM appreciations WHERE id = ?", [
      id,
    ]);
    return rows[0] as Appreciation;
  }
}
