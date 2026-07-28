import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db";
import { crypto } from "../utils";

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  user_name?: string | null;
  created_at?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  lead_id?: string | null;
  lead_name?: string | null;
  members?: TeamMember[];
  created_at?: string;
}

export interface Position {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
  created_at?: string;
}

export class TeamModel {
  static async findAllTeams(): Promise<Team[]> {
    const [teams] = await pool.query<RowDataPacket[]>(
      "SELECT t.*, p.full_name as lead_name FROM teams t LEFT JOIN profiles p ON p.id = t.lead_id ORDER BY t.name ASC",
    );
    if (!teams || teams.length === 0) return [];

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT tm.*, p.full_name as user_name 
       FROM team_members tm 
       LEFT JOIN profiles p ON p.id = tm.user_id`,
    );

    return teams.map((t) => ({
      ...t,
      members: (members as TeamMember[]).filter((m) => m.team_id === t.id),
    })) as Team[];
  }

  static async findTeamById(id: string): Promise<Team | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT t.*, p.full_name as lead_name FROM teams t LEFT JOIN profiles p ON p.id = t.lead_id WHERE t.id = ?",
      [id],
    );
    if (!rows[0]) return null;
    const members = await this.getTeamMembers(id);
    return { ...rows[0], members } as Team;
  }

  static async createTeam(
    name: string,
    description: string | null,
    leadId?: string | null,
  ): Promise<Team> {
    const id = crypto.randomUUID();
    await pool.query("INSERT INTO teams (id, name, description, lead_id) VALUES (?, ?, ?, ?)", [
      id,
      name,
      description,
      leadId || null,
    ]);
    if (leadId) {
      await this.addTeamMember(id, leadId, "lead");
    }
    const team = await this.findTeamById(id);
    return team!;
  }

  static async updateTeam(
    id: string,
    updates: { name?: string; description?: string | null; lead_id?: string | null },
  ): Promise<Team | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.lead_id !== undefined) {
      fields.push("lead_id = ?");
      values.push(updates.lead_id);
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE teams SET ${fields.join(", ")} WHERE id = ?`, values);
    }
    return this.findTeamById(id);
  }

  static async deleteTeam(id: string): Promise<boolean> {
    await pool.query("DELETE FROM team_members WHERE team_id = ?", [id]);
    const [res] = await pool.query<ResultSetHeader>("DELETE FROM teams WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT tm.*, p.full_name as user_name 
       FROM team_members tm 
       LEFT JOIN profiles p ON p.id = tm.user_id 
       WHERE tm.team_id = ?`,
      [teamId],
    );
    return rows as TeamMember[];
  }

  static async addTeamMember(teamId: string, userId: string, role = "member"): Promise<TeamMember> {
    const id = crypto.randomUUID();
    await pool.query("INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?)", [
      id,
      teamId,
      userId,
      role,
    ]);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT tm.*, p.full_name as user_name 
       FROM team_members tm 
       LEFT JOIN profiles p ON p.id = tm.user_id 
       WHERE tm.id = ?`,
      [id],
    );
    return rows[0] as TeamMember;
  }

  static async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const [res] = await pool.query<ResultSetHeader>(
      "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, userId],
    );
    return res.affectedRows > 0;
  }

  static async findAllPositions(): Promise<Position[]> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM positions ORDER BY title ASC");
    return rows as Position[];
  }

  static async createPosition(
    title: string,
    department: string | null,
    description: string | null,
  ): Promise<Position> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO positions (id, title, department, description) VALUES (?, ?, ?, ?)",
      [id, title, department, description],
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM positions WHERE id = ?", [id]);
    return rows[0] as Position;
  }
}
