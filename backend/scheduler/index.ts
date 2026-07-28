import { logger } from "../utils/logger";
import { pool } from "../db";

class BackgroundScheduler {
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs = 600000) {
    // Default 10 minutes interval
    logger.info("Initializing background scheduler service");
    this.timer = setInterval(() => {
      this.runJobs().catch((err) => {
        logger.error("Background job execution error", { error: String(err) });
      });
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("Background scheduler stopped");
    }
  }

  private async runJobs() {
    logger.info("Running scheduled background maintenance tasks...");
    try {
      // Job 1: Ping DB connection
      await pool.query("SELECT 1");

      // Job 2: Auto-complete expired sprints
      const today = new Date().toISOString().split("T")[0];
      await pool.query(
        "UPDATE sprints SET status = 'completed' WHERE end_date < ? AND status = 'active'",
        [today],
      );

      logger.info("Scheduled background tasks executed successfully");
    } catch (err) {
      logger.error("Failed to run scheduled background maintenance", { error: String(err) });
    }
  }
}

export const scheduler = new BackgroundScheduler();
