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
  from?: { id: string; full_name: string | null; avatar_url: string | null };
  to?: { id: string; full_name: string | null; avatar_url: string | null };
}

export class AppreciationModel {
  static async findAll(): Promise<Appreciation[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, 
        p1.full_name as sender_name, p1.avatar_url as sender_avatar,
        p2.full_name as recipient_name, p2.avatar_url as recipient_avatar
      FROM appreciations a
      LEFT JOIN profiles p1 ON COALESCE(a.sender_id, a.from_user) = p1.id
      LEFT JOIN profiles p2 ON COALESCE(a.recipient_id, a.to_user) = p2.id
      ORDER BY a.created_at DESC
    `);

    return (rows as any[]).map((r) => {
      const fromId = r.sender_id || r.from_user || "user";
      const toId = r.recipient_id || r.to_user || "user";
      return {
        id: r.id,
        from_user: fromId,
        to_user: toId,
        message: r.message,
        points: Number(r.points) || 10,
        created_at: r.created_at,
        from: {
          id: fromId,
          full_name: r.sender_name || fromId,
          avatar_url: r.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fromId}`,
        },
        to: {
          id: toId,
          full_name: r.recipient_name || toId,
          avatar_url: r.recipient_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${toId}`,
        },
      };
    });
  }

  static async create(data: Omit<Appreciation, "id" | "created_at" | "from" | "to">): Promise<Appreciation> {
    const id = crypto.randomUUID();
    const fromId = data.from_user;
    const toId = data.to_user;
    await pool.query(
      "INSERT INTO appreciations (id, from_user, to_user, sender_id, recipient_id, message, points) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, fromId, toId, fromId, toId, data.message, data.points || 10],
    );
    const all = await this.findAll();
    return all.find((a) => a.id === id) || {
      id,
      from_user: fromId,
      to_user: toId,
      message: data.message,
      points: data.points || 10,
      from: { id: fromId, full_name: fromId, avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${fromId}` },
      to: { id: toId, full_name: toId, avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${toId}` },
    };
  }
}
