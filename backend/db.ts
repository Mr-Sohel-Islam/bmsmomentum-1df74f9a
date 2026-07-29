import mysql from "mysql2/promise";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

export const pool = connectionUrl
  ? mysql.createPool({
      uri: connectionUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false },
    })
  : mysql.createPool({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "bmsmomentum",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

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
      console.log(`[MySQL Backend] Adding missing column '${column}' to table '${table}'...`);
      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    console.warn(`[MySQL Backend] Notice on adding column ${column} to ${table}:`, err);
  }
}

export async function resetAndSeedDatabase() {
  await initDb();
  const connection = await pool.getConnection();
  try {
    console.log("[MySQL Backend] Clearing database tables for fresh complete flow re-initialization...");

    // Disable foreign key checks for clean truncation
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    const tablesToClean = [
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
      "user_positions",
      "profiles",
    ];

    for (const t of tablesToClean) {
      try {
        await connection.query(`DELETE FROM ${t};`);
      } catch {
        // Table does not exist yet; will be created in seed
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("[MySQL Backend] All existing table records cleared successfully.");

    await seedCompleteApplicationFlows(connection);
  } finally {
    connection.release();
  }
}

async function seedCompleteApplicationFlows(connection: mysql.PoolConnection) {
  console.log("[MySQL Backend] Seeding complete application flows (Sprints, Epics, Tasks, Products, Onboarding, Approvals, Teams, Hierarchy)...");

  // 1. Reserved Super Admin Email
  await connection.query(
    "INSERT IGNORE INTO reserved_super_admins (id, email) VALUES (?, ?)",
    ["rsa-super-admin", "soheljavadeveloper@gmail.com"],
  );

  // 2. Positions
  const positions = [
    { id: "pos-admin", title: "Super Admin & Executive", department: "Executive Leadership" },
    { id: "pos-eng-mgr", title: "Engineering Manager", department: "Engineering" },
    { id: "pos-health-mgr", title: "Healthcare Operations Manager", department: "Healthcare Operations" },
    { id: "pos-po", title: "Lead Product Owner", department: "Product Management" },
    { id: "pos-sr-dev", title: "Senior Full Stack Engineer", department: "Engineering" },
    { id: "pos-qa", title: "QA & Test Lead", department: "Quality Assurance" },
  ];

  for (const pos of positions) {
    await connection.query(
      "INSERT INTO user_positions (id, title, department) VALUES (?, ?, ?)",
      [pos.id, pos.title, pos.department]
    );
  }

  // 3. User Profiles & Roles
  const seedMembers = [
    {
      id: "soheljavadeveloper",
      full_name: "Sohel Islam (Super Admin)",
      department: "Executive Leadership",
      position_id: "pos-admin",
      manager_id: null,
      roles: ["super_admin", "admin"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sohel",
    },
    {
      id: "alex.rivera",
      full_name: "Alex Rivera",
      department: "Engineering",
      position_id: "pos-eng-mgr",
      manager_id: "soheljavadeveloper",
      roles: ["manager", "scrum_master"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=alex",
    },
    {
      id: "sarah.chen",
      full_name: "Sarah Chen",
      department: "Product Management",
      position_id: "pos-po",
      manager_id: "soheljavadeveloper",
      roles: ["product_owner"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sarah",
    },
    {
      id: "dr.jenkins",
      full_name: "Dr. Sarah Jenkins",
      department: "Healthcare Operations",
      position_id: "pos-health-mgr",
      manager_id: "soheljavadeveloper",
      roles: ["manager"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=jenkins",
    },
    {
      id: "marcus.vance",
      full_name: "Marcus Vance",
      department: "Engineering",
      position_id: "pos-sr-dev",
      manager_id: "alex.rivera",
      roles: ["developer"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=marcus",
    },
    {
      id: "elena.rostova",
      full_name: "Elena Rostova",
      department: "Quality Assurance",
      position_id: "pos-qa",
      manager_id: "alex.rivera",
      roles: ["developer"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=elena",
    },
  ];

  for (const m of seedMembers) {
    await connection.query(
      "INSERT INTO profiles (id, full_name, avatar_url, department, position_id, manager_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [m.id, m.full_name, m.avatar_url, m.department, m.position_id, m.manager_id],
    );
    for (const role of m.roles) {
      await connection.query(
        "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
        [m.id + "-" + role, m.id, role],
      );
    }
  }

  // 4. Teams & Members
  const team1 = "team-core-eng";
  const team2 = "team-health-ops";

  await connection.query(
    "INSERT INTO teams (id, name, description, lead_id) VALUES (?, ?, ?, ?)",
    [team1, "Core Momentum Engineering", "Primary engineering team driving platform features.", "alex.rivera"]
  );

  await connection.query(
    "INSERT INTO teams (id, name, description, lead_id) VALUES (?, ?, ?, ?)",
    [team2, "Healthcare Operations & Onboarding", "Specialized team managing doctor & vendor onboarding workflows.", "dr.jenkins"]
  );

  await connection.query(
    "INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
    [
      team1 + "-alex", team1, "alex.rivera", "manager",
      team1 + "-marcus", team1, "marcus.vance", "developer",
      team1 + "-elena", team1, "elena.rostova", "developer",
    ]
  );

  await connection.query(
    "INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
    [
      team2 + "-jenkins", team2, "dr.jenkins", "manager",
      team2 + "-sarah", team2, "sarah.chen", "product_owner",
    ]
  );

  // 5. Approval Workflows & Steps
  const wfMedical = "wf-medical-op";
  const wfTech = "wf-tech-service";

  await connection.query(
    "INSERT INTO approval_workflows (id, name, description, entity_type, active) VALUES (?, ?, ?, ?, 1)",
    [wfMedical, "Medical Operations & Onboarding Approval", "Multi-stage approval workflow for doctor and medical staff entity onboarding.", "product_item"]
  );

  await connection.query(
    "INSERT INTO approval_workflows (id, name, description, entity_type, active) VALUES (?, ?, ?, ?, 1)",
    [wfTech, "Technical Infrastructure Approval", "Approval workflow for high-impact software services and API gateways.", "product_item"]
  );

  await connection.query(
    "INSERT INTO approval_steps (id, workflow_id, step_order, approver_type, approver_ref) VALUES (?, ?, 1, 'role', 'manager'), (?, ?, 2, 'role', 'admin')",
    [
      "step-med-1", wfMedical,
      "step-med-2", wfMedical,
    ]
  );

  await connection.query(
    "INSERT INTO approval_steps (id, workflow_id, step_order, approver_type, approver_ref) VALUES (?, ?, 1, 'role', 'admin')",
    ["step-tech-1", wfTech]
  );

  // 6. Form Schemas
  const doctorFormSchema = [
    {
      id: "f_specialty",
      label: "Medical Specialty / Role",
      type: "select",
      required: true,
      options: ["General Practitioner", "Cardiology", "Neurology", "Pediatrics", "Surgeon", "Orthopedics"],
    },
    {
      id: "f_license_no",
      label: "Medical License Number",
      type: "text",
      required: true,
      placeholder: "e.g. MD-883921",
    },
    {
      id: "f_hospital",
      label: "Hospital / Affiliation",
      type: "text",
      required: false,
      placeholder: "e.g. St. Jude General",
    },
    {
      id: "f_years",
      label: "Years of Practice",
      type: "number",
      required: true,
      placeholder: "10",
    },
  ];

  const apiFormSchema = [
    {
      id: "f_endpoint",
      label: "API Endpoint Base URL",
      type: "text",
      required: true,
      placeholder: "https://api.momentum.com/v1/patients",
    },
    {
      id: "f_rate_limit",
      label: "Rate Limit (Requests / Min)",
      type: "number",
      required: true,
      placeholder: "1000",
    },
    {
      id: "f_protocol",
      label: "Interface Protocol",
      type: "select",
      required: true,
      options: ["REST API", "gRPC", "GraphQL"],
    },
  ];

  const depSchema = [
    {
      id: "f_criticality",
      label: "Dependency Criticality",
      type: "select",
      required: true,
      options: ["Hard Blocker", "High Impact", "Medium", "Optional / Soft"],
    },
    {
      id: "f_protocol",
      label: "Interface Protocol",
      type: "select",
      required: true,
      options: ["REST API", "gRPC", "GraphQL", "Database Link"],
    },
    {
      id: "f_sla",
      label: "Expected SLA / Latency Threshold",
      type: "text",
      required: false,
      placeholder: "< 50ms, 99.99% uptime",
    },
  ];

  await connection.query(
    "INSERT INTO product_form_schemas (id, name, schema_type, fields, is_active) VALUES (?, ?, 'onboarding', ?, 1), (?, ?, 'dependency', ?, 1)",
    [
      "schema-doc-onboarding", "Doctor Entity Onboarding Form Schema", JSON.stringify(doctorFormSchema),
      "schema-dep-std", "Standard Product Dependency Schema", JSON.stringify(depSchema),
    ]
  );

  // 7. Product Definitions (Templates e.g. Doctor, Patient REST API Gateway)
  const prodDoctorId = "prod-doctor";
  const prodApiId = "prod-api-service";

  await connection.query(
    `INSERT INTO products (id, name, slug, product_type, category, sku, status, form_schema, approval_settings, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      prodDoctorId,
      "Doctor",
      "doctor",
      "Entity Onboarding",
      "Healthcare",
      "MED-DOC-001",
      JSON.stringify(doctorFormSchema),
      JSON.stringify({ require_approval: true, workflow_id: wfMedical, workflow_name: "Medical Operations & Onboarding Approval" }),
      "sarah.chen",
    ]
  );

  await connection.query(
    `INSERT INTO products (id, name, slug, product_type, category, sku, status, form_schema, approval_settings, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      prodApiId,
      "Patient REST API Gateway",
      "patient-rest-api-gateway",
      "Software Service",
      "Software Platform",
      "SW-API-8080",
      JSON.stringify(apiFormSchema),
      JSON.stringify({ require_approval: false }),
      "alex.rivera",
    ]
  );

  // 8. Product Dependencies
  await connection.query(
    `INSERT INTO product_dependencies (id, product_id, depends_on_product_id, dependency_type, custom_fields)
     VALUES (?, ?, ?, 'prerequisite', ?)`,
    [
      "pdep-doc-api",
      prodDoctorId,
      prodApiId,
      JSON.stringify({ f_criticality: "Hard Blocker", f_protocol: "REST API", f_sla: "99.99% Uptime" }),
    ]
  );

  // 9. Product Onboarding Tasks
  const ptaskId = "ptask-doctor-batch";
  await connection.query(
    `INSERT INTO product_tasks (id, title, description, target_quantity, onboarded_count, status, assigned_to)
     VALUES (?, ?, ?, 5, 2, 'in_progress', ?)`,
    [ptaskId, "Onboard 5 Regional Clinic Doctors", "Onboard qualified medical specialists for the new Midwest Healthcare Wing.", "dr.jenkins"]
  );

  // 10. Product Items (Onboarded Records)
  const pitem1Id = "pitem-sarah-connor";
  const pitem2Id = "pitem-robert-chen";
  const apreqId = "apreq-robert-chen";

  // Item 1: Onboarded (Auto-approved / approved)
  await connection.query(
    `INSERT INTO product_items (id, product_id, item_name, status, task_id, custom_fields, created_by)
     VALUES (?, ?, ?, 'onboarded', ?, ?, ?)`,
    [
      pitem1Id,
      prodDoctorId,
      "Dr. Sarah Connor",
      ptaskId,
      JSON.stringify({ f_specialty: "Cardiology", f_license_no: "MD-883921", f_hospital: "St. Jude General", f_years: 12 }),
      "dr.jenkins",
    ]
  );

  // Item 2: Pending Approval
  await connection.query(
    `INSERT INTO product_items (id, product_id, item_name, status, approval_request_id, task_id, custom_fields, created_by)
     VALUES (?, ?, ?, 'pending_approval', ?, ?, ?, ?)`,
    [
      pitem2Id,
      prodDoctorId,
      "Dr. Robert Chen",
      apreqId,
      ptaskId,
      JSON.stringify({ f_specialty: "Neurology", f_license_no: "MD-992341", f_hospital: "Mercy General", f_years: 8 }),
      "sarah.chen",
    ]
  );

  // 11. Approval Request for Item 2
  await connection.query(
    `INSERT INTO approval_requests (id, workflow_id, requester_id, entity_type, entity_id, title, description, status, current_step, current_step_order)
     VALUES (?, ?, ?, 'product_item', ?, ?, ?, 'pending', 1, 1)`,
    [
      apreqId,
      wfMedical,
      "sarah.chen",
      pitem2Id,
      "Onboarding Approval for Dr. Robert Chen (Doctor)",
      "Medical staff onboarding submission under Doctor product definition [Category: Healthcare]",
    ]
  );

  // 12. Sprints, Epics, and Agile Tasks
  const epic1Id = "epic-onboarding-v2";
  const epic2Id = "epic-infra";
  const sprint1Id = "sprint-10";

  await connection.query(
    "INSERT INTO epics (id, name, title, description, status, team_id) VALUES (?, ?, ?, ?, 'in_progress', ?), (?, ?, ?, ?, 'in_progress', ?)",
    [
      epic1Id, "Healthcare Onboarding Platform v2", "Healthcare Onboarding Platform v2", "Revamp entity onboarding for doctors, clinics, and approval routing.", team2,
      epic2Id, "High Availability Infrastructure", "High Availability Infrastructure", "Upgrade API gateways, SLA monitoring, and performance telemetry.", team1,
    ]
  );

  await connection.query(
    "INSERT INTO sprints (id, name, title, goal, status, start_date, end_date, target_points) VALUES (?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), 30)",
    [sprint1Id, "Sprint 10 - Healthcare Onboarding & Core Engine", "Sprint 10 - Healthcare Onboarding & Core Engine", "Complete Doctor entity onboarding flow, custom form builders, and approval sync."]
  );

  const agileTasks = [
    {
      id: "task-101",
      title: "Implement Dynamic Doctor Form Builder & Custom Schemas",
      description: "Build interactive form schema editor supporting text, number, select, date, and textarea inputs.",
      status: "done",
      points: 5,
      assignee_id: "marcus.vance",
      epic_id: epic1Id,
      sprint_id: sprint1Id,
      team_id: team1,
    },
    {
      id: "task-102",
      title: "Connect Onboarding Approval Engine to Product Items",
      description: "Ensure approving or rejecting requests in /approvals automatically syncs product_items status.",
      status: "done",
      points: 8,
      assignee_id: "alex.rivera",
      epic_id: epic1Id,
      sprint_id: sprint1Id,
      team_id: team1,
    },
    {
      id: "task-103",
      title: "Perform End-to-End System Audit & Seed Complete Flows",
      description: "Verify complete workflow from Sprints to Product Onboarding and Approval routing.",
      status: "in_progress",
      points: 5,
      assignee_id: "soheljavadeveloper",
      epic_id: epic1Id,
      sprint_id: sprint1Id,
      team_id: team2,
    },
    {
      id: "task-104",
      title: "Setup Automated Sprint Burndown & KPI Telemetry",
      description: "Compute ideal vs actual burndown points dynamically for active sprint dashboard.",
      status: "todo",
      points: 3,
      assignee_id: "elena.rostova",
      epic_id: epic2Id,
      sprint_id: sprint1Id,
      team_id: team1,
    },
  ];

  for (const t of agileTasks) {
    await connection.query(
      `INSERT INTO tasks (id, title, description, status, points, assignee_id, epic_id, sprint_id, team_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'soheljavadeveloper')`,
      [t.id, t.title, t.description, t.status, t.points, t.assignee_id, t.epic_id, t.sprint_id, t.team_id]
    );
  }

  // 13. Appreciations
  await connection.query(
    `INSERT INTO appreciations (id, sender_id, recipient_id, from_user, to_user, message, badge_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "appr-1",
      "sarah.chen",
      "alex.rivera",
      "sarah.chen",
      "alex.rivera",
      "Awesome work finalizing the Doctor onboarding form schema and approval engine!",
      "Leadership",
    ]
  );

  console.log("[MySQL Backend] Complete application flows successfully seeded! Sprints, Epics, Tasks, Products, Onboarding, Approvals, Hierarchy, and Appreciations are 100% ready.");
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reserved_super_admins (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
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
      CREATE TABLE IF NOT EXISTS user_positions (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        lead_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        goal TEXT,
        status VARCHAR(50) DEFAULT 'planned',
        start_date DATETIME,
        end_date DATETIME,
        target_points INT DEFAULT 0,
        completed_points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS epics (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'planned',
        team_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo',
        points INT DEFAULT 0,
        assignee_id VARCHAR(36),
        epic_id VARCHAR(36),
        sprint_id VARCHAR(36),
        team_id VARCHAR(36),
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_workflows (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        entity_type VARCHAR(100) DEFAULT 'task',
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
        entity_type VARCHAR(100) DEFAULT 'task',
        entity_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
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
      CREATE TABLE IF NOT EXISTS product_form_schemas (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        schema_type VARCHAR(50) NOT NULL,
        fields JSON NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_tasks (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        target_quantity INT DEFAULT 1,
        onboarded_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'in_progress',
        assigned_to VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        product_type VARCHAR(100) DEFAULT 'Entity Onboarding',
        category VARCHAR(100) DEFAULT 'General',
        sku VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        task_id VARCHAR(36),
        custom_fields JSON,
        form_schema JSON,
        approval_settings JSON,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_items (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'onboarded',
        approval_request_id VARCHAR(36),
        task_id VARCHAR(36),
        custom_fields JSON,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_dependencies (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        depends_on_product_id VARCHAR(36) NOT NULL,
        dependency_type VARCHAR(100) DEFAULT 'prerequisite',
        custom_fields JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS appreciations (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        recipient_id VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        badge_type VARCHAR(100) DEFAULT 'Excellence',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist on existing tables
    await addColumnIfNotExist(connection, "products", "product_type", "VARCHAR(100) DEFAULT 'Entity Onboarding'");
    await addColumnIfNotExist(connection, "products", "category", "VARCHAR(100) DEFAULT 'General'");
    await addColumnIfNotExist(connection, "products", "form_schema", "JSON");
    await addColumnIfNotExist(connection, "products", "approval_settings", "JSON");
    await addColumnIfNotExist(connection, "products", "sku", "VARCHAR(100)");
    await addColumnIfNotExist(connection, "products", "status", "VARCHAR(50) DEFAULT 'active'");
    await addColumnIfNotExist(connection, "products", "task_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "products", "custom_fields", "JSON");
    await addColumnIfNotExist(connection, "products", "created_by", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "products", "slug", "VARCHAR(255) NULL");

    await addColumnIfNotExist(connection, "product_items", "approval_request_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "product_items", "task_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "product_items", "custom_fields", "JSON");
    await addColumnIfNotExist(connection, "product_items", "status", "VARCHAR(50) DEFAULT 'onboarded'");

    await addColumnIfNotExist(connection, "epics", "name", "VARCHAR(255) DEFAULT ''");
    await addColumnIfNotExist(connection, "epics", "title", "VARCHAR(255) DEFAULT ''");
    await addColumnIfNotExist(connection, "epics", "team_id", "VARCHAR(36)");

    await addColumnIfNotExist(connection, "sprints", "name", "VARCHAR(255) DEFAULT ''");
    await addColumnIfNotExist(connection, "sprints", "title", "VARCHAR(255) DEFAULT ''");
    await addColumnIfNotExist(connection, "sprints", "goal", "TEXT");
    await addColumnIfNotExist(connection, "sprints", "start_date", "DATETIME");
    await addColumnIfNotExist(connection, "sprints", "end_date", "DATETIME");
    await addColumnIfNotExist(connection, "sprints", "target_points", "INT DEFAULT 0");
    await addColumnIfNotExist(connection, "sprints", "completed_points", "INT DEFAULT 0");

    await addColumnIfNotExist(connection, "approval_requests", "current_step_order", "INT DEFAULT 1");
    await addColumnIfNotExist(connection, "approval_requests", "current_step", "INT DEFAULT 1");
    await addColumnIfNotExist(connection, "approval_requests", "entity_type", "VARCHAR(100) DEFAULT 'task'");

    await addColumnIfNotExist(connection, "tasks", "assignee_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "tasks", "epic_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "tasks", "sprint_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "tasks", "team_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "tasks", "points", "INT DEFAULT 0");
    await addColumnIfNotExist(connection, "tasks", "created_by", "VARCHAR(36)");

    await addColumnIfNotExist(connection, "appreciations", "sender_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "appreciations", "recipient_id", "VARCHAR(36)");
    await addColumnIfNotExist(connection, "appreciations", "from_user", "VARCHAR(255) NULL");
    await addColumnIfNotExist(connection, "appreciations", "to_user", "VARCHAR(255) NULL");
    await addColumnIfNotExist(connection, "appreciations", "message", "TEXT");
    await addColumnIfNotExist(connection, "appreciations", "badge_type", "VARCHAR(100) DEFAULT 'Excellence'");

    // Check if profiles exist. If database is fresh, run full seed.
    const [existingProfiles] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM profiles",
    );
    const profileCount = Number((existingProfiles as any)[0]?.count || 0);

    if (profileCount === 0) {
      await seedCompleteApplicationFlows(connection);
    } else {
      console.log(`[MySQL Backend] Database initialized (${profileCount} active profiles found).`);
    }

    connection.release();
    isInitialized = true;
    console.log("[MySQL Backend] Database tables schema verified and ready!");
  } catch (err) {
    console.warn("[MySQL Backend] MySQL database setup warning:", err);
  }
}
