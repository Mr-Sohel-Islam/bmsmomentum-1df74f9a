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

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["all"],
  admin: ["all"],
  product_owner: [
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "tasks:bulk",
    "teams:read",
    "approvals:read",
    "approvals:create",
    "approvals:action",
  ],
  scrum_master: [
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:bulk",
    "teams:read",
    "teams:members",
    "approvals:read",
    "approvals:create",
  ],
  manager: [
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "teams:read",
    "teams:manage",
    "teams:members",
    "approvals:read",
    "approvals:create",
    "approvals:action",
    "approvals:manage",
    "performance:read",
    "performance:evaluate",
    "users:read",
  ],
  developer: [
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "teams:read",
    "approvals:read",
    "approvals:create",
    "performance:read",
  ],
  viewer: [
    "tasks:read",
    "teams:read",
    "approvals:read",
    "performance:read",
    "users:read",
  ],
  guest: ["tasks:read"],
};

export function resolveUserPermissions(roles: string[], explicitPermissions: string[]): string[] {
  const permSet = new Set<string>(explicitPermissions);
  for (const role of roles) {
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
    for (const p of rolePerms) {
      permSet.add(p);
    }
  }
  return Array.from(permSet);
}

export function signToken(
  payload: { id: string; email?: string; roles?: string[]; permissions?: string[] },
  expiresIn: string = env.JWT_EXPIRES_IN,
): string {
  const roles = payload.roles && payload.roles.length > 0 ? payload.roles : ["developer"];
  const allPermissions = resolveUserPermissions(roles, payload.permissions || []);
  const userPayload: AuthenticatedUser = {
    id: payload.id,
    email: payload.email || `${payload.id}@company.com`,
    roles,
    permissions: allPermissions,
  };
  return jwt.sign(userPayload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthenticatedUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    const roles = decoded.roles || ["developer"];
    decoded.permissions = resolveUserPermissions(roles, decoded.permissions || []);
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
  }
  next();
}


export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    const hasRole = req.user.roles?.some((role) => allowedRoles.includes(role));
    const isRoot = req.user.roles?.includes("admin") || req.user.roles?.includes("super_admin");
    if (!hasRole && !isRoot) {
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
    const isRoot = req.user.roles?.includes("admin") || req.user.roles?.includes("super_admin");
    const hasPerm =
      isRoot ||
      userPerms.includes("all") ||
      requiredPermissions.some((perm) => userPerms.includes(perm));

    if (!hasPerm) {
      throw new AppError(`Missing required permission: ${requiredPermissions.join(", ")}`, 403);
    }
    next();
  };
}
