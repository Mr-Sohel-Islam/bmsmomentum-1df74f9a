import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { pool, initDb } from "./db";
import { getCorsAllowedOrigins } from "./config/env";
import { logger } from "./utils/logger";
import { globalErrorHandler } from "./middleware/error.middleware";
import apiRouter from "./routes";
import swaggerRouter from "./swagger";
import { scheduler } from "./scheduler";

export const app = express();

// Configured CORS middleware using standard cors package
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getCorsAllowedOrigins();
      if (!origin) {
        callback(null, true);
      } else if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(null, origin);
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "x-user-id",
      "x-user-role",
      "x-user-email",
    ],
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api")) {
    logger.info(`${req.method} ${req.path}`, { query: req.query });
  }
  next();
});

// Initialize database and start background scheduler
initDb()
  .then(() => {
    logger.info("Database initialized successfully");
    scheduler.start();
  })
  .catch((err) => {
    logger.error("Database initialization failed", { error: String(err) });
  });

// Swagger & Interactive API Documentation
app.use("/api", swaggerRouter);

// Mount main modular API router
app.use("/api", apiRouter);

// Health Check Endpoint
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT 1 as alive");
    res.json({
      status: "ok",
      backend: "express",
      database: "mysql",
      dbStatus: Array.isArray(rows) && rows.length > 0 ? "connected" : "unknown",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.json({
      status: "degraded",
      backend: "express",
      database: "mysql",
      dbError: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
});

// Global Exception & Error Handling Middleware
app.use(globalErrorHandler);
