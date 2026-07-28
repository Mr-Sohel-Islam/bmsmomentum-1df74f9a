import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend .env safely whether running from backend/ or root
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3000,
  MYSQL_URL: process.env.MYSQL_URL || process.env.DATABASE_URL || "mysql://avnadmin:password@mysql-14a39894-sohelislam993-f5b7.d.aivencloud.com:18434/defaultdb?ssl-mode=REQUIRED",
  JWT_SECRET: process.env.JWT_SECRET || "super-secret-jwt-key-for-express-backend",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
};
