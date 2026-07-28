/* eslint-disable @typescript-eslint/no-namespace */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/response";

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export type AuthRequest = Request;

export function signToken(
  payload: { id: string; email?: string; roles?: string[]; permissions?: string[] },
  expiresIn: string = env.JWT_EXPIRES_IN,
): string {
  const userPayload: AuthenticatedUser = {
    id: payload.id,
    email: payload.email || `${payload.id}@company.com`,
    roles: payload.roles || ["user"],
    permissions: payload.permissions || [],
  };
  return jwt.sign(userPayload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthenticatedUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError("Authentication token has expired", 401);
    }
    throw new AppError("Invalid authentication token", 401);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // For development / testing fallback via headers
    const mockUserId = req.headers["x-user-id"] as string;
    if (mockUserId) {
      req.user = {
        id: mockUserId,
        email: (req.headers["x-user-email"] as string) || `${mockUserId}@company.com`,
        roles: ["admin"],
        permissions: ["all"],
      };
      return next();
    }
    throw new AppError("Authentication token required", 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new AppError("Malformed authorization token", 401);
  }

  req.user = verifyToken(token);
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        req.user = verifyToken(token);
      } catch {
        // Ignore invalid token in optionalAuth
      }
    }
  } else {
    const mockUserId = req.headers["x-user-id"] as string;
    if (mockUserId) {
      req.user = {
        id: mockUserId,
        email: (req.headers["x-user-email"] as string) || `${mockUserId}@company.com`,
        roles: ["admin"],
        permissions: ["all"],
      };
    }
  }
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    const hasRole = req.user.roles?.some((role) => allowedRoles.includes(role));
    if (
      !hasRole &&
      !req.user.roles?.includes("admin") &&
      !req.user.roles?.includes("super_admin")
    ) {
      throw new AppError("Insufficient role permissions", 403);
    }
    next();
  };
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    const userPerms = req.user.permissions || [];
    const hasPerm =
      userPerms.includes("all") || requiredPermissions.every((perm) => userPerms.includes(perm));
    if (
      !hasPerm &&
      !req.user.roles?.includes("admin") &&
      !req.user.roles?.includes("super_admin")
    ) {
      throw new AppError("Insufficient access permissions", 403);
    }
    next();
  };
}
