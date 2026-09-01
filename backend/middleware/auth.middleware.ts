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

const ALL_PERMISSIONS = ["all"];
const TASK_READ = ["tasks:read"];
const TASK_WRITE = ["tasks:read", "tasks:create", "tasks:update"];
const TASK_MANAGE = [...TASK_WRITE, "tasks:manage"];
const TEAM_READ = ["teams:read"];
const APPROVAL_READ = ["approvals:read"];
const APPROVAL_CREATE = ["approvals:create"];
const APPROVAL_ACTION = ["approvals:read", "approvals:action"];
const FIELD_OPERATIONS = [
  "pharma:read",
  "pharma:create",
  "trade:read",
  "trade:create",
  "reports:read",
  "reports:create",
  "detailing:read",
];
const PERFORMANCE_READ = ["performance:read"];
const OFFERS_READ = ["offers:read"];
const OFFERS_MANAGE = ["offers:read", "offers:create", "offers:update", "offers:delete"];
const OFFERS_SEND = ["offers:send", "offers:dispatch"];
const OFFERS_FULL = [...OFFERS_MANAGE, ...OFFERS_SEND, "offers:logs"];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  director: ALL_PERMISSIONS,
  gm: ALL_PERMISSIONS,
  rm: [...TASK_MANAGE, ...TEAM_READ, ...APPROVAL_ACTION, ...FIELD_OPERATIONS, ...OFFERS_FULL, "users:read"],
  bm: [...TASK_MANAGE, ...TEAM_READ, ...APPROVAL_ACTION, ...FIELD_OPERATIONS, ...OFFERS_FULL],
  sm: [...TASK_MANAGE, ...TEAM_READ, ...APPROVAL_ACTION, ...FIELD_OPERATIONS, ...OFFERS_MANAGE, ...OFFERS_SEND],
  am: [...TASK_MANAGE, ...TEAM_READ, ...APPROVAL_ACTION, ...FIELD_OPERATIONS, ...OFFERS_READ],
  smr: [...TASK_READ, ...APPROVAL_CREATE, ...FIELD_OPERATIONS, ...PERFORMANCE_READ, ...OFFERS_READ],
  mr: [...TASK_READ, ...FIELD_OPERATIONS, ...PERFORMANCE_READ, ...OFFERS_READ],
  field_rep: [...TASK_READ, ...FIELD_OPERATIONS, ...PERFORMANCE_READ, ...OFFERS_READ],
  sales_rep: [
    ...TASK_WRITE,
    ...TEAM_READ,
    ...APPROVAL_READ,
    ...APPROVAL_CREATE,
    ...PERFORMANCE_READ,
  ],
  product_owner: [
    ...TASK_WRITE,
    "tasks:delete",
    "tasks:bulk",
    ...TEAM_READ,
    ...APPROVAL_READ,
    ...APPROVAL_CREATE,
    "approvals:action",
  ],
  scrum_master: [
    ...TASK_WRITE,
    "tasks:bulk",
    ...TEAM_READ,
    "teams:members",
    ...APPROVAL_READ,
    ...APPROVAL_CREATE,
  ],
  manager: [
    ...TASK_MANAGE,
    ...TEAM_READ,
    "teams:manage",
    "teams:members",
    ...APPROVAL_READ,
    ...APPROVAL_CREATE,
    "approvals:action",
    "approvals:manage",
    ...FIELD_OPERATIONS,
    ...PERFORMANCE_READ,
    "performance:evaluate",
    ...OFFERS_FULL,
    "users:read",
  ],
  developer: [
    ...TASK_WRITE,
    ...TEAM_READ,
    ...APPROVAL_READ,
    ...APPROVAL_CREATE,
    ...PERFORMANCE_READ,
  ],
  viewer: [...TASK_READ, ...TEAM_READ, ...APPROVAL_READ, ...PERFORMANCE_READ, ...OFFERS_READ, "users:read"],
  guest: TASK_READ,
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

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7).trim() || null;
}

function getMockUser(req: Request): AuthenticatedUser | null {
  if (process.env.NODE_ENV === "production") return null;

  const mockUserId = req.headers["x-user-id"] as string | undefined;
  if (!mockUserId) return null;

  const roles = String(req.headers["x-user-role"] || "admin")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  return {
    id: mockUserId,
    email: `${mockUserId}@company.com`,
    roles,
    permissions: resolveUserPermissions(roles, []),
  };
}

const isRootRole = (roles: string[] = []) =>
  roles.includes("admin") || roles.includes("super_admin");

const hasPermission = (user: AuthenticatedUser, requiredPermissions: string[]) => {
  const permissions = user.permissions || [];
  return (
    isRootRole(user.roles) ||
    permissions.includes("all") ||
    requiredPermissions.some((permission) => permissions.includes(permission))
  );
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (token) {
    req.user = verifyToken(token);
    return next();
  }

  const mockUser = getMockUser(req);
  if (mockUser) {
    req.user = mockUser;
    return next();
  }

  throw new AppError("Authentication token required", 401);
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Ignore invalid token in optionalAuth
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
    if (!hasRole && !isRootRole(req.user.roles)) {
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

    if (!hasPermission(req.user, requiredPermissions)) {
      throw new AppError(`Missing required permission: ${requiredPermissions.join(", ")}`, 403);
    }
    next();
  };
}
