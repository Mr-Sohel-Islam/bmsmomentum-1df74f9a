import path from "path";
import dotenv from "dotenv";

// Load backend/.env first with override: true so backend/.env takes priority
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env"), override: true });
dotenv.config({ override: false });

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3000,
  MYSQL_URL: process.env.MYSQL_URL || process.env.DATABASE_URL || "mysql://avnadmin:password@mysql-14a39894-sohelislam993-f5b7.d.aivencloud.com:18434/defaultdb?ssl-mode=REQUIRED",
  JWT_SECRET: process.env.JWT_SECRET || "super-secret-jwt-key-for-express-backend",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
};
