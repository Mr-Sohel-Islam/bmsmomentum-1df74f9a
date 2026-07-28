import { Request, Response } from "express";
import { UserModel } from "../models/user.model";
import { sendSuccess, AppError } from "../utils/response";

export class UserController {
  static async getProfiles(req: Request, res: Response) {
    const profiles = await UserModel.findAllProfiles();
    return sendSuccess(res, profiles);
  }

  static async getProfileById(req: Request, res: Response) {
    const { id } = req.params;
    const profile = await UserModel.findProfileById(id);
    if (!profile) {
      throw new AppError("Profile not found", 404);
    }
    return sendSuccess(res, profile);
  }

  static async upsertProfile(req: Request, res: Response) {
    const { id, full_name, avatar_url } = req.body;
    if (!id) {
      throw new AppError("id is required", 400);
    }
    const profile = await UserModel.upsertProfile(id, full_name || null, avatar_url || null);
    return sendSuccess(res, profile, "Profile saved");
  }

  static async updateProfile(req: Request, res: Response) {
    const { id } = req.params;
    const profile = await UserModel.updateProfile(id, req.body);
    if (!profile) {
      throw new AppError("Profile not found", 404);
    }
    return sendSuccess(res, profile, "Profile updated");
  }

  static async deleteUser(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await UserModel.deleteUser(id);
    if (!deleted) {
      throw new AppError("User profile not found", 404);
    }
    return sendSuccess(res, { id }, "User deleted");
  }

  static async setUserRoles(req: Request, res: Response) {
    const { id } = req.params;
    const { roles } = req.body;
    if (!Array.isArray(roles)) {
      throw new AppError("roles must be an array of strings", 400);
    }
    const updatedRoles = await UserModel.setUserRoles(id, roles);
    return sendSuccess(res, { user_id: id, roles: updatedRoles }, "Roles updated");
  }

  static async addRole(req: Request, res: Response) {
    const { user_id, role } = req.body;
    if (!user_id || !role) {
      throw new AppError("user_id and role are required", 400);
    }
    const result = await UserModel.addUserRole(user_id, role);
    return sendSuccess(res, result, "Role added", 201);
  }

  static async setUserPermissions(req: Request, res: Response) {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      throw new AppError("permissions must be an array of strings", 400);
    }
    const updatedPerms = await UserModel.setUserPermissions(id, permissions);
    return sendSuccess(res, { user_id: id, permissions: updatedPerms }, "Permissions updated");
  }

  static async addPermission(req: Request, res: Response) {
    const { user_id, permission } = req.body;
    if (!user_id || !permission) {
      throw new AppError("user_id and permission are required", 400);
    }
    const result = await UserModel.addUserPermission(user_id, permission);
    return sendSuccess(res, result, "Permission added", 201);
  }
}
