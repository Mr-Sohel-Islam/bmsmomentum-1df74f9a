export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3000,
  MYSQL_URL: process.env.MYSQL_URL || process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "super-secret-jwt-key-for-express-backend",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
};
