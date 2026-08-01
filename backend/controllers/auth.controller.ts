import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { sendSuccess, sendError, AppError } from "../utils/response";
import { AuthRequest } from "../middleware/auth.middleware";
import { resolveUserPermissions } from "../middleware/auth.middleware";

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new AppError("email and password are required", 400);
    }

    const profile = await UserModel.verifyCredentials(String(email), String(password));
    if (!profile) {
      throw new AppError("Invalid email or password", 401);
    }

    const roles = profile.roles && profile.roles.length > 0 ? profile.roles : ["viewer"];
    const permissions = resolveUserPermissions(roles, profile.permissions || []);

    const tokenPayload = {
      id: profile.id,
      email: profile.email || String(email).toLowerCase(),
      roles,
      permissions,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return sendSuccess(
      res,
      {
        user: tokenPayload,
        profile,
        token,
        must_change_password: Boolean(profile.must_change_password),
      },
      "Authentication successful",
    );
  }

  static async me(req: AuthRequest, res: Response) {
    if (!req.user) {
      return sendError(res, "Not authenticated", 401);
    }

    const profile = await UserModel.findProfileById(req.user.id);
    if (!profile) {
      throw new AppError("Profile not found", 404);
    }
    const roles = profile.roles || [];
    const permissions = resolveUserPermissions(roles, profile.permissions || []);

    return sendSuccess(res, {
      userId: profile.id,
      user: { ...req.user, roles, permissions },
      profile,
      roles,
      permissions,
    });
  }

  static async changePassword(req: AuthRequest, res: Response) {
    if (!req.user) {
      return sendError(res, "Not authenticated", 401);
    }
    const { current_password, new_password } = req.body ?? {};
    if (!current_password || !new_password) {
      throw new AppError("current_password and new_password are required", 400);
    }
    if (String(new_password).length < 8) {
      throw new AppError("New password must be at least 8 characters", 400);
    }

    const profile = await UserModel.findProfileById(req.user.id);
    if (!profile) throw new AppError("Profile not found", 404);

    const valid = await UserModel.verifyCredentials(
      profile.email || profile.id,
      String(current_password),
    );
    if (!valid) throw new AppError("Current password is incorrect", 401);

    await UserModel.setPassword(profile.id, String(new_password), false);
    return sendSuccess(res, { id: profile.id }, "Password updated");
  }

  /** Admin-driven password reset for another user. */
  static async resetPassword(req: AuthRequest, res: Response) {
    const targetId = req.params.id as string;
    const { new_password } = req.body ?? {};
    if (!new_password || String(new_password).length < 8) {
      throw new AppError("new_password (min 8 characters) is required", 400);
    }
    const profile = await UserModel.findProfileById(targetId);
    if (!profile) throw new AppError("Profile not found", 404);

    if (await UserModel.isReservedSuperAdmin(targetId)) {
      const isSelf = req.user?.id === targetId;
      if (!isSelf) {
        throw new AppError("The reserved super admin password can only be changed by its owner", 403);
      }
    }

    await UserModel.setPassword(targetId, String(new_password), true);
    return sendSuccess(res, { id: targetId }, "Password reset");
  }
}
