import { pool, ensureSuperAdmin } from "../db.js";

async function wipeDatabase() {
  const connection = await pool.getConnection();
  try {
    console.log("[MySQL Backend] Wiping all seeded database data...");
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    const tablesToClean = [
      "doctors",
      "trade_entities",
      "daily_reports",
      "pharma_products",
      "approval_actions",
      "approval_requests",
      "approval_steps",
      "approval_workflows",
      "product_dependencies",
      "product_items",
      "products",
      "product_tasks",
      "product_form_schemas",
      "task_comments",
      "task_attachments",
      "task_history",
      "tasks",
      "sprints",
      "epics",
      "performance_reviews",
      "performance_metrics",
      "appreciations",
      "team_members",
      "teams",
      "user_roles",
      "user_permissions",
      "user_positions",
      "profiles",
      "reserved_super_admins",
    ];

    for (const t of tablesToClean) {
      try {
        await connection.query(`DELETE FROM ${t};`);
        console.log(`Cleaned table: ${t}`);
      } catch (e) {
        console.warn(`Table ${t} warning:`, e);
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    await ensureSuperAdmin(connection);
    console.log("[MySQL Backend] All seeded records wiped. Reserved Super Admin ensured (sohel@momentum.com / Sohel@34892).");
  } finally {
    connection.release();
    process.exit(0);
  }
}

wipeDatabase().catch((err) => {
  console.error("[MySQL Backend] Wipe error:", err);
  process.exit(1);
});
