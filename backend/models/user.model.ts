import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db";
import { crypto } from "../utils";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department?: string | null;
  position_id?: string | null;
  manager_id?: string | null;
  is_active?: boolean;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at?: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission: string;
  created_at?: string;
}

export class UserModel {
  static async findAllProfiles(): Promise<Profile[]> {
    const [profiles] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM profiles ORDER BY full_name ASC",
    );
    const [roles] = await pool.query<RowDataPacket[]>("SELECT user_id, role FROM user_roles");
    const [perms] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, permission FROM user_permissions",
    );

    const roleMap = new Map<string, string[]>();
    for (const r of roles) {
      const arr = roleMap.get(r.user_id) || [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }

    const permMap = new Map<string, string[]>();
    for (const p of perms) {
      const arr = permMap.get(p.user_id) || [];
      arr.push(p.permission);
      permMap.set(p.user_id, arr);
    }

    return profiles.map((p) => ({
      ...p,
      is_active: Boolean(p.is_active !== 0),
      roles: roleMap.get(p.id) || [],
      permissions: permMap.get(p.id) || [],
    })) as Profile[];
  }

  static async findProfileById(id: string): Promise<Profile | null> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM profiles WHERE id = ?", [id]);
    if (!rows[0]) return null;
    const roles = await this.getUserRoles(id);
    const permissions = await this.getUserPermissions(id);
    return {
      ...rows[0],
      is_active: Boolean(rows[0].is_active !== 0),
      roles,
      permissions,
    } as Profile;
  }

  static async upsertProfile(
    id: string,
    fullName: string | null,
    avatarUrl: string | null,
  ): Promise<Profile> {
    await pool.query(
      "INSERT INTO profiles (id, full_name, avatar_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), avatar_url = VALUES(avatar_url)",
      [id, fullName, avatarUrl],
    );
    const profile = await this.findProfileById(id);
    return profile!;
  }

  static async updateProfile(
    id: string,
    updates: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>,
  ): Promise<Profile | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.full_name !== undefined) {
      fields.push("full_name = ?");
      values.push(updates.full_name);
    }
    if (updates.avatar_url !== undefined) {
      fields.push("avatar_url = ?");
      values.push(updates.avatar_url);
    }
    if (updates.department !== undefined) {
      fields.push("department = ?");
      values.push(updates.department);
    }
    if (updates.position_id !== undefined) {
      fields.push("position_id = ?");
      values.push(updates.position_id);
    }
    if (updates.manager_id !== undefined) {
      fields.push("manager_id = ?");
      values.push(updates.manager_id);
    }
    if (updates.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(updates.is_active ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`, values);
    }

    return this.findProfileById(id);
  }

  static async deleteUser(id: string): Promise<boolean> {
    await pool.query("DELETE FROM user_roles WHERE user_id = ?", [id]);
    await pool.query("DELETE FROM user_permissions WHERE user_id = ?", [id]);
    const [res] = await pool.query<ResultSetHeader>("DELETE FROM profiles WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  static async getUserRoles(userId: string): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM user_roles WHERE user_id = ?",
      [userId],
    );
    return rows.map((r) => r.role);
  }

  static async setUserRoles(userId: string, roles: string[]): Promise<string[]> {
    await pool.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
    for (const role of roles) {
      const id = crypto.randomUUID();
      await pool.query("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)", [
        id,
        userId,
        role,
      ]);
    }
    return this.getUserRoles(userId);
  }

  static async addUserRole(userId: string, role: string): Promise<UserRole> {
    const id = crypto.randomUUID();
    await pool.query("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)", [
      id,
      userId,
      role,
    ]);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM user_roles WHERE id = ?", [id]);
    return rows[0] as UserRole;
  }

  static async getUserPermissions(userId: string): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT permission FROM user_permissions WHERE user_id = ?",
      [userId],
    );
    return rows.map((r) => r.permission);
  }

  static async setUserPermissions(userId: string, permissions: string[]): Promise<string[]> {
    await pool.query("DELETE FROM user_permissions WHERE user_id = ?", [userId]);
    for (const permission of permissions) {
      const id = crypto.randomUUID();
      await pool.query("INSERT INTO user_permissions (id, user_id, permission) VALUES (?, ?, ?)", [
        id,
        userId,
        permission,
      ]);
    }
    return this.getUserPermissions(userId);
  }

  static async addUserPermission(userId: string, permission: string): Promise<UserPermission> {
    const id = crypto.randomUUID();
    await pool.query("INSERT INTO user_permissions (id, user_id, permission) VALUES (?, ?, ?)", [
      id,
      userId,
      permission,
    ]);
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM user_permissions WHERE id = ?",
      [id],
    );
    return rows[0] as UserPermission;
  }
}
