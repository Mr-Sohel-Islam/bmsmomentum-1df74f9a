import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { sendSuccess, sendError, AppError } from "../utils/response";
import { AuthRequest } from "../middleware/auth.middleware";

export class AuthController {
  static async login(req: Request, res: Response) {
    const { userId, email } = req.body;
    if (!userId && !email) {
      throw new AppError("userId or email is required", 400);
    }

    const targetUserId = userId || email.split("@")[0];
    let profile = await UserModel.findProfileById(targetUserId);

    if (!profile) {
      profile = await UserModel.upsertProfile(
        targetUserId,
        email ? email.split("@")[0] : targetUserId,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUserId}`,
      );
    }

    const roles = await UserModel.getUserRoles(targetUserId);
    const permissions = await UserModel.getUserPermissions(targetUserId);

    const tokenPayload = {
      id: profile.id,
      email: email || `${profile.id}@company.com`,
      roles: roles.length > 0 ? roles : ["user"],
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
      },
      "Authentication successful",
    );
  }

  static async me(req: AuthRequest, res: Response) {
    if (!req.user) {
      return sendError(res, "Not authenticated", 401);
    }

    const profile = await UserModel.findProfileById(req.user.id);
    const roles = await UserModel.getUserRoles(req.user.id);
    const permissions = await UserModel.getUserPermissions(req.user.id);

    return sendSuccess(res, {
      user: req.user,
      profile,
      roles,
      permissions,
    });
  }
}
