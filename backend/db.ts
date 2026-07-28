import mysql from "mysql2/promise";
import { env } from "./config/env";

const DEFAULT_MYSQL_URL = env.MYSQL_URL;

// Parse URL to configure pool safely
function createPoolConfig(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port) || 3306,
      user: parsed.username || "root",
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, "") || "bmsmomentum",
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  } catch {
    return {
      uri: rawUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }
}

export const pool = mysql.createPool(createPoolConfig(DEFAULT_MYSQL_URL));

let isInitialized = false;

async function addColumnIfNotExist(
  connection: mysql.PoolConnection,
  table: string,
  column: string,
  definition: string,
) {
  try {
    const [cols] = await connection.query<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM ${table} LIKE ?`,
      [column],
    );
    if (Array.isArray(cols) && cols.length === 0) {
      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch {
    // column check or alter skipped if exists or error
  }
}

export async function initDb() {
  if (isInitialized) return;

  try {
    const connection = await pool.getConnection();
    console.log("[MySQL Backend] Connected to MySQL database pool successfully.");

    // Create Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(36) PRIMARY KEY,
        full_name VARCHAR(255),
        avatar_url TEXT,
        department VARCHAR(255),
        position_id VARCHAR(36),
        manager_id VARCHAR(36),
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        lead_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reserved_super_admins (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        unit VARCHAR(50),
        weight DOUBLE DEFAULT 1,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS metric_scores (
        id VARCHAR(36) PRIMARY KEY,
        metric_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        score DOUBLE NOT NULL,
        value DOUBLE DEFAULT 0,
        period VARCHAR(50),
        scored_by VARCHAR(36),
        recorded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        goal TEXT,
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'planning',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS epics (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'open',
        color VARCHAR(20) DEFAULT '#10b981',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id VARCHAR(36) PRIMARY KEY,
        epic_id VARCHAR(36),
        sprint_id VARCHAR(36),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        points INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'backlog',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo',
        priority VARCHAR(50) DEFAULT 'medium',
        team_id VARCHAR(36),
        assignee_id VARCHAR(36),
        assigner_id VARCHAR(36),
        reporter_id VARCHAR(36),
        sprint_id VARCHAR(36),
        epic_id VARCHAR(36),
        story_id VARCHAR(36),
        points INT DEFAULT 0,
        due_date VARCHAR(50),
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL,
        author_id VARCHAR(36),
        user_id VARCHAR(36),
        body TEXT,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_workflows (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100) DEFAULT 'task',
        description TEXT,
        active TINYINT(1) DEFAULT 1,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_steps (
        id VARCHAR(36) PRIMARY KEY,
        workflow_id VARCHAR(36) NOT NULL,
        step_order INT NOT NULL,
        approver_type VARCHAR(50) DEFAULT 'role',
        approver_role VARCHAR(50),
        approver_ref VARCHAR(255),
        approver_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id VARCHAR(36) PRIMARY KEY,
        workflow_id VARCHAR(36) NOT NULL,
        requester_id VARCHAR(36) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        current_step INT DEFAULT 1,
        current_step_order INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_actions (
        id VARCHAR(36) PRIMARY KEY,
        request_id VARCHAR(36) NOT NULL,
        approver_id VARCHAR(36) NOT NULL,
        step_order INT NOT NULL,
        decision VARCHAR(50) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS appreciations (
        id VARCHAR(36) PRIMARY KEY,
        from_user VARCHAR(36) NOT NULL,
        to_user VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        points INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS communication_flows (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        type VARCHAR(50),
        target_audience VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        data JSON,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist on existing tables
    await addColumnIfNotExist(connection, "profiles", "department", "VARCHAR(255)");
    await addColumnIfNotExist(connection, "profiles", "position_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "profiles", "manager_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "profiles", "is_active", "TINYINT(1) DEFAULT 1");

    await addColumnIfNotExist(connection, "teams", "lead_id", "VARCHAR(36)");

    await addColumnIfNotExist(connection, "tasks", "team_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "tasks", "epic_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "tasks", "points", "INT DEFAULT 0");

    await addColumnIfNotExist(connection, "task_comments", "author_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "task_comments", "body", "TEXT");

    await addColumnIfNotExist(
      connection,
      "approval_workflows",
      "entity_type",
      "VARCHAR(100) DEFAULT 'task'",
    );
    await addColumnIfNotExist(connection, "approval_workflows", "created_by", "VARCHAR(36)");

    await addColumnIfNotExist(connection, "approval_steps", "approver_ref", "VARCHAR(255)");
    await addColumnIfNotExist(
      connection,
      "approval_steps",
      "approver_type",
      "VARCHAR(50) DEFAULT 'role'",
    );

    await addColumnIfNotExist(connection, "metric_scores", "value", "DOUBLE DEFAULT 0");
    await addColumnIfNotExist(connection, "metric_scores", "recorded_by", "VARCHAR(36)");

    connection.release();
    isInitialized = true;
    console.log("[MySQL Backend] Database tables schema verified and ready!");
  } catch (err) {
    console.warn("[MySQL Backend] MySQL database setup warning:", err);
  }
}
