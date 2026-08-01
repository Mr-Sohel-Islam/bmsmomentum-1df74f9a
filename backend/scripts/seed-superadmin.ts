/**
 * Seeds / repairs the reserved super admin account.
 *   Email:    Sohel@Momentum.com
 *   Password: Sohel@34892   (override with SUPER_ADMIN_PASSWORD)
 *
 * Run with:  npm run seed:superadmin --prefix backend
 */
import { pool, initDb, ensureSuperAdmin } from "../db";
import { SUPER_ADMIN_EMAIL } from "../utils/password";

async function main() {
  await initDb();
  const connection = await pool.getConnection();
  try {
    await ensureSuperAdmin(connection);
    console.log(`✅ Super admin ready: ${SUPER_ADMIN_EMAIL} (roles: super_admin, admin)`);
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Super admin seed failed:", err);
  process.exit(1);
});
