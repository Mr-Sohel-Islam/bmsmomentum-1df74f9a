import mysql from "mysql2/promise";
import dotenv from "dotenv";
import {
  hashPassword,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_DEFAULT_PASSWORD,
} from "./utils/password";

dotenv.config();

/**
 * Guarantees the reserved super admin (Sohel@Momentum.com) exists, is active,
 * holds super_admin + admin, and can sign in with the seeded password.
 */
export async function ensureSuperAdmin(connection: mysql.PoolConnection) {
  const id = "sohel.superadmin";
  const password = process.env.SUPER_ADMIN_PASSWORD || SUPER_ADMIN_DEFAULT_PASSWORD;

  await connection.query(
    "INSERT INTO reserved_super_admins (id, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)",
    ["rsa-super-admin", SUPER_ADMIN_EMAIL],
  );

  await connection.query(
    `INSERT INTO profiles (id, email, password_hash, must_change_password, full_name, avatar_url, department, designation, official_email, is_active)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       must_change_password = 0,
       official_email = VALUES(official_email),
       is_active = 1`,
    [
      id,
      SUPER_ADMIN_EMAIL,
      hashPassword(password),
      "Sohel (Super Admin)",
      "https://api.dicebear.com/7.x/bottts/svg?seed=superadmin",
      "Executive Board",
      "Super Administrator",
      SUPER_ADMIN_EMAIL,
    ],
  );

  for (const role of ["super_admin", "admin"]) {
    await connection.query(
      "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
      [`${id}-${role}`, id, role],
    );
  }
  await connection.query(
    "INSERT INTO user_permissions (id, user_id, permission) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE permission = VALUES(permission)",
    [`${id}-all`, id, "all"],
  );

  console.log(`[MySQL Backend] Reserved super admin ensured: ${SUPER_ADMIN_EMAIL}`);
}


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

export async function wipeAllTables() {
  await initDb();
  const connection = await pool.getConnection();
  try {
    console.log("[MySQL Backend] Wiping all database table records...");

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
        await connection.query(`TRUNCATE TABLE ${t};`);
      } catch {
        try {
          await connection.query(`DELETE FROM ${t};`);
        } catch {
          // Table does not exist yet
        }
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("[MySQL Backend] All tables wiped completely!");
  } finally {
    connection.release();
  }
}

export async function resetAndSeedDatabase() {
  await initDb();
  const connection = await pool.getConnection();
  try {
    console.log("[MySQL Backend] Clearing database tables for fresh complete flow re-initialization...");

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
      } catch {
        // Table does not exist
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
  console.log("[MySQL Backend] Seeding complete Working Pyramid Hierarchy, Doctors, Trade Entities, Daily Reports & 3D Detailing Products...");

  // 1. Reserved Super Admin Email
  await connection.query(
    "INSERT IGNORE INTO reserved_super_admins (id, email) VALUES (?, ?)",
    ["rsa-super-admin", "soheljavadeveloper@gmail.com"],
  );

  // 2. Positions (Full 8-Tier Working Pyramid Hierarchy)
  const positions = [
    { id: "pos-director", title: "Director / Chairman", department: "Executive Board", level: 0 },
    { id: "pos-gm", title: "General Manager", department: "General Operations", level: 1 },
    { id: "pos-rm", title: "Regional Manager", department: "Regional Sales", level: 2 },
    { id: "pos-bm", title: "Business Manager", department: "Business Development", level: 3 },
    { id: "pos-sm", title: "Sales Manager", department: "Sales Operations", level: 4 },
    { id: "pos-am", title: "Area Manager", department: "Territory Management", level: 5 },
    { id: "pos-smr", title: "Sr. Medical Representative", department: "Field Operations", level: 6 },
    { id: "pos-mr", title: "Medical Representative", department: "Field Operations", level: 7 },
  ];

  for (const pos of positions) {
    await connection.query(
      "INSERT INTO user_positions (id, title, department, level) VALUES (?, ?, ?, ?)",
      [pos.id, pos.title, pos.department, pos.level]
    );
  }

  // 3. Profiles (The Working Pyramid Hierarchy with Required Fields)
  const seedMembers = [
    {
      id: "director.main",
      full_name: "Sohel Islam (Director / Chairman)",
      department: "Executive Board",
      position_id: "pos-director",
      manager_id: null,
      designation: "Director & Chairman",
      area: "National Head Office",
      office_number: "+91 11 4982 9000",
      personal_number: "+91 98765 00001",
      emergency_family_number: "+91 98765 00002",
      referrals_contact: "Dr. A. K. Sharma (AIIMS), Dr. R. N. Mukherjee (Apollo)",
      official_email: "director@momentumpharma.com",
      personal_email: "sohel.director@gmail.com",
      residential_address: "Penthouse 14, Executive Towers, Golf Course Road, Gurgaon",
      id_documents_url: "https://docs.momentum.com/id/director-passport.pdf",
      bank_details_url: "https://docs.momentum.com/bank/director-hdfc.pdf",
      official_id_no: "DIR-001",
      roles: ["super_admin", "admin", "director"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=director",
    },
    {
      id: "gm.sharma",
      full_name: "Rajesh Sharma (General Manager)",
      department: "General Operations",
      position_id: "pos-gm",
      manager_id: "director.main",
      designation: "General Manager",
      area: "North & East Zones",
      office_number: "+91 11 4982 9010",
      personal_number: "+91 98765 11101",
      emergency_family_number: "+91 98765 11102",
      referrals_contact: "Mr. V. K. Malhotra (Pharma Corp), Dr. S. P. Gupta",
      official_email: "rajesh.gm@momentumpharma.com",
      personal_email: "rajesh.sharma77@gmail.com",
      residential_address: "B-42, Vasant Vihar, New Delhi",
      id_documents_url: "https://docs.momentum.com/id/gm-aadhaar.pdf",
      bank_details_url: "https://docs.momentum.com/bank/gm-icici.pdf",
      official_id_no: "GM-101",
      roles: ["admin", "gm"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sharma",
    },
    {
      id: "rm.verma",
      full_name: "Amit Verma (Regional Manager)",
      department: "Regional Sales",
      position_id: "pos-rm",
      manager_id: "gm.sharma",
      designation: "Regional Manager",
      area: "Delhi NCR Region",
      office_number: "+91 11 4982 9020",
      personal_number: "+91 98765 22201",
      emergency_family_number: "+91 98765 22202",
      referrals_contact: "Dr. Meena Iyer, Mr. Suresh Kapoor",
      official_email: "amit.rm@momentumpharma.com",
      personal_email: "verma.amit@gmail.com",
      residential_address: "C-102, Green Park Extension, New Delhi",
      id_documents_url: "https://docs.momentum.com/id/rm-pan.pdf",
      bank_details_url: "https://docs.momentum.com/bank/rm-axis.pdf",
      official_id_no: "RM-201",
      roles: ["manager", "rm"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=verma",
    },
    {
      id: "bm.gupta",
      full_name: "Vikram Gupta (Business Manager)",
      department: "Business Development",
      position_id: "pos-bm",
      manager_id: "rm.verma",
      designation: "Business Manager",
      area: "South & Central Delhi",
      office_number: "+91 11 4982 9030",
      personal_number: "+91 98765 33301",
      emergency_family_number: "+91 98765 33302",
      referrals_contact: "Dr. K. L. Chawla, Mr. Ankit Mehta",
      official_email: "vikram.bm@momentumpharma.com",
      personal_email: "gupta.vikram@gmail.com",
      residential_address: "H-19, Saket, New Delhi",
      id_documents_url: "https://docs.momentum.com/id/bm-dl.pdf",
      bank_details_url: "https://docs.momentum.com/bank/bm-sbi.pdf",
      official_id_no: "BM-301",
      roles: ["manager", "bm"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=gupta",
    },
    {
      id: "sm.singh",
      full_name: "Rohan Singh (Sales Manager)",
      department: "Sales Operations",
      position_id: "pos-sm",
      manager_id: "bm.gupta",
      designation: "Sales Manager",
      area: "South Delhi & Lajpat Nagar",
      office_number: "+91 11 4982 9040",
      personal_number: "+91 98765 44401",
      emergency_family_number: "+91 98765 44402",
      referrals_contact: "Dr. Rajiv Malhotra, Mr. Sunil Bansal",
      official_email: "rohan.sm@momentumpharma.com",
      personal_email: "rohan.singh99@gmail.com",
      residential_address: "Flat 304, Greater Kailash 1, New Delhi",
      id_documents_url: "https://docs.momentum.com/id/sm-voter.pdf",
      bank_details_url: "https://docs.momentum.com/bank/sm-pnb.pdf",
      official_id_no: "SM-401",
      roles: ["manager", "sm"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=rohan",
    },
    {
      id: "am.kumar",
      full_name: "Sanjay Kumar (Area Manager)",
      department: "Territory Management",
      position_id: "pos-am",
      manager_id: "sm.singh",
      designation: "Area Manager",
      area: "Connaught Place & Central District",
      office_number: "+91 11 4982 9050",
      personal_number: "+91 98765 55501",
      emergency_family_number: "+91 98765 55502",
      referrals_contact: "Dr. Sunita Rao, Mr. Pankaj Sharma",
      official_email: "sanjay.am@momentumpharma.com",
      personal_email: "sanjay.kumar.pharma@gmail.com",
      residential_address: "74, Barakhamba Road, Connaught Place, New Delhi",
      id_documents_url: "https://docs.momentum.com/id/am-passport.pdf",
      bank_details_url: "https://docs.momentum.com/bank/am-yesbank.pdf",
      official_id_no: "AM-501",
      roles: ["manager", "am"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sanjay",
    },
    {
      id: "smr.patel",
      full_name: "Priya Patel (Sr. Medical Representative)",
      department: "Field Operations",
      position_id: "pos-smr",
      manager_id: "am.kumar",
      designation: "Sr. Medical Representative",
      area: "Connaught Place Medical Hub",
      office_number: "+91 11 4982 9060",
      personal_number: "+91 98765 66601",
      emergency_family_number: "+91 98765 66602",
      referrals_contact: "Dr. Harsh Vardhan, Mrs. Renu Patel",
      official_email: "priya.smr@momentumpharma.com",
      personal_email: "patel.priya22@gmail.com",
      residential_address: "A-12, Karol Bagh, New Delhi",
      id_documents_url: "https://docs.momentum.com/id/smr-aadhaar.pdf",
      bank_details_url: "https://docs.momentum.com/bank/smr-kotak.pdf",
      official_id_no: "SMR-601",
      roles: ["field_rep", "smr"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=priya",
    },
    {
      id: "mr.das",
      full_name: "Rahul Das (Medical Representative)",
      department: "Field Operations",
      position_id: "pos-mr",
      manager_id: "smr.patel",
      designation: "Medical Representative",
      area: "Central Delhi Clinics & Chemists Zone",
      office_number: "+91 11 4982 9070",
      personal_number: "+91 98765 77701",
      emergency_family_number: "+91 98765 77702",
      referrals_contact: "Dr. B. C. Roy, Mr. Deepak Nanda",
      official_email: "rahul.mr@momentumpharma.com",
      personal_email: "rahul.das88@gmail.com",
      residential_address: "D-88, Patel Nagar, New Delhi",
      id_documents_url: "https://docs.momentum.com/id/mr-pan.pdf",
      bank_details_url: "https://docs.momentum.com/bank/mr-canara.pdf",
      official_id_no: "MR-701",
      roles: ["field_rep", "mr"],
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=rahul",
    },
  ];

  const defaultPasswordHash = hashPassword("password123");

  for (const m of seedMembers) {
    await connection.query(
      `INSERT INTO profiles (
        id, email, password_hash, must_change_password, full_name, avatar_url, department, position_id, manager_id, is_active,
        designation, area, office_number, personal_number, emergency_family_number,
        referrals_contact, official_email, personal_email, residential_address,
        id_documents_url, bank_details_url, official_id_no
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.id, m.official_email, defaultPasswordHash, m.full_name, m.avatar_url, m.department, m.position_id, m.manager_id,
        m.designation, m.area, m.office_number, m.personal_number, m.emergency_family_number,
        m.referrals_contact, m.official_email, m.personal_email, m.residential_address,
        m.id_documents_url, m.bank_details_url, m.official_id_no,
      ],
    );
    for (const role of m.roles) {
      await connection.query(
        "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
        [m.id + "-" + role, m.id, role],
      );
    }
  }

  // 4. Doctors Management (Drs Management Seed Data)
  const doctors = [
    {
      id: "doc-swaminathan",
      name: "Dr. Arvind Swaminathan",
      department: "Cardiology",
      area_locality: "Connaught Place, New Delhi",
      whatsapp_contact: "+91 98100 12345",
      dob: "1978-04-14",
      spouse_dob: "1982-08-22",
      anniversary_date: "2006-12-10",
      child_dobs: JSON.stringify(["2008-05-18", "2012-11-04"]),
      special_day: "Doctor's Day Special (July 1st)",
      gift_accepted_details: "Littmann Cardio Stethoscope & Executive Leather Organiser",
      created_by: "mr.das",
      assigned_to: "mr.das",
    },
    {
      id: "doc-sundaram",
      name: "Dr. Meenakshi Sundaram",
      department: "Pediatrics & Neonatology",
      area_locality: "Greater Kailash, New Delhi",
      whatsapp_contact: "+91 98111 54321",
      dob: "1982-09-05",
      spouse_dob: "1980-03-12",
      anniversary_date: "2009-02-14",
      child_dobs: JSON.stringify(["2011-07-20"]),
      special_day: "Pediatric Academic Seminar Keynote",
      gift_accepted_details: "Pediatric Pulse Oximeter & Customized Desk Pen Stand",
      created_by: "smr.patel",
      assigned_to: "smr.patel",
    },
    {
      id: "doc-prasad",
      name: "Dr. Rajeshwar Prasad",
      department: "Orthopedics & Joint Replacement",
      area_locality: "Saket, New Delhi",
      whatsapp_contact: "+91 98188 99887",
      dob: "1975-11-20",
      spouse_dob: "1977-06-15",
      anniversary_date: "2002-05-25",
      child_dobs: JSON.stringify(["2004-01-10", "2007-09-12"]),
      special_day: "Hospital Foundation Day (Oct 15th)",
      gift_accepted_details: "Anatomical Bone Model & Digital BP Monitor Set",
      created_by: "am.kumar",
      assigned_to: "am.kumar",
    },
    {
      id: "doc-chaudhury",
      name: "Dr. Ananya Roy Chaudhury",
      department: "Gynecology & Obstetrics",
      area_locality: "Green Park Extension, New Delhi",
      whatsapp_contact: "+91 98711 22334",
      dob: "1985-01-30",
      spouse_dob: "1983-10-18",
      anniversary_date: "2011-11-18",
      child_dobs: JSON.stringify(["2014-03-22"]),
      special_day: "Women's Health Awareness Day",
      gift_accepted_details: "Fetal Doppler Device & Premium Brand Tea Hamper",
      created_by: "mr.das",
      assigned_to: "mr.das",
    },
  ];

  for (const d of doctors) {
    await connection.query(
      `INSERT INTO doctors (
        id, name, department, area_locality, whatsapp_contact, dob, spouse_dob,
        anniversary_date, child_dobs, special_day, gift_accepted_details,
        created_by, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.id, d.name, d.department, d.area_locality, d.whatsapp_contact, d.dob, d.spouse_dob,
        d.anniversary_date, d.child_dobs, d.special_day, d.gift_accepted_details,
        d.created_by, d.assigned_to,
      ]
    );
  }

  // 5. Wholesale / Distributor / Chemists Management Seed Data
  const tradeEntities = [
    {
      id: "trade-apollo-cp",
      category: "chemist",
      firm_name: "Apollo Pharmacy Store #482",
      drug_license_no: "DL-20B/10492/2021",
      gst_number: "07AAACA40921Z5",
      address: "Shop G-12, Inner Circle, Connaught Place, New Delhi",
      proprietor_name: "Mr. Suresh Agarwal",
      contact_number: "+91 98102 33445",
      email: "apollo.cp@pharmacychain.com",
      comm_modes: "Call, WhatsApp, Email",
      billing_details: "15 Days Credit Period with Net Billing",
      payment_details: "HDFC Bank NEFT / UPI ID: apollo.cp@hdfcbank",
      offer_scheme_details: "10+2 Free Scheme on Antibiotics Range",
      created_by: "mr.das",
      assigned_to: "mr.das",
    },
    {
      id: "trade-medplus-saket",
      category: "chemist",
      firm_name: "MedPlus Health Services Pvt Ltd",
      drug_license_no: "DL-21B/88491/2022",
      gst_number: "07AAACM9912K1Z9",
      address: "Shop 4, Main Market, Saket, New Delhi",
      proprietor_name: "Mr. Rakesh Jain",
      contact_number: "+91 98112 66778",
      email: "store.saket@medplus.com",
      comm_modes: "Call, WhatsApp",
      billing_details: "30 Days Credit Billing",
      payment_details: "ICICI Bank RTGS / Account # 002105001284",
      offer_scheme_details: "5% Additional Cash Discount on Prompt 7-Day Clearance",
      created_by: "smr.patel",
      assigned_to: "smr.patel",
    },
    {
      id: "trade-delhi-wholesale",
      category: "wholesaler",
      firm_name: "Delhi Pharma Wholesalers & Stockists",
      drug_license_no: "DL-20B/W-00492",
      gst_number: "07AAACD5541A1Z2",
      address: "102, Bhagirath Palace, Chandni Chowk, Delhi",
      proprietor_name: "Mr. Vijay Kumar Gupta & Sons",
      contact_number: "+91 98180 88990",
      email: "sales@delhipharmawholesale.com",
      comm_modes: "Call, WhatsApp, B2B Portal",
      billing_details: "7 Days Net Billing",
      payment_details: "State Bank of India / Current A/C # 3049182941",
      offer_scheme_details: "Super Stockist Tier-1 Discount (12% Wholesale Margin)",
      created_by: "am.kumar",
      assigned_to: "am.kumar",
    },
    {
      id: "trade-northern-dist",
      category: "distributor",
      firm_name: "Northern India Healthcare Distributors Ltd",
      drug_license_no: "DL-21B/DIST-882",
      gst_number: "07AAACN1122D1Z0",
      address: "Plot 45, Okhla Industrial Area Phase 3, New Delhi",
      proprietor_name: "Mr. Harish Chandra Mittal",
      contact_number: "+91 98710 44556",
      email: "dispatch@northerndistributors.com",
      comm_modes: "Call, Email, SAP EDI",
      billing_details: "Advance DD / RTGS Transfer per consignment",
      payment_details: "Axis Bank Current A/C # 912020019482019",
      offer_scheme_details: "Annual Volume Turnover Rebate (3% Target Incentive)",
      created_by: "bm.gupta",
      assigned_to: "bm.gupta",
    },
  ];

  for (const t of tradeEntities) {
    await connection.query(
      `INSERT INTO trade_entities (
        id, category, firm_name, drug_license_no, gst_number, address,
        proprietor_name, contact_number, email, comm_modes, billing_details,
        payment_details, offer_scheme_details, created_by, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id, t.category, t.firm_name, t.drug_license_no, t.gst_number, t.address,
        t.proprietor_name, t.contact_number, t.email, t.comm_modes, t.billing_details,
        t.payment_details, t.offer_scheme_details, t.created_by, t.assigned_to,
      ]
    );
  }

  // 6. Work Station Employee Daily Activity & Reports
  const todayStr = new Date().toISOString().split("T")[0];

  const reports = [
    {
      id: "rpt-mr-das-today",
      user_id: "mr.das",
      report_date: todayStr,
      doctor_visits_count: 8,
      chemist_visits_count: 14,
      wholesale_visits_count: 3,
      distributor_visits_count: 1,
      billing_amount: 85400.00,
      payment_amount: 62000.00,
      offers_distributed: "Sample kits of MOMENTUM-CV 625 & Executive Doctor Pen Sets",
      special_achievements: "Converted Dr. Arvind Swaminathan for monthly 100-strip prescription commitment!",
      notes: "All CP chemist stocking verified. Apollo Pharmacy order booked.",
    },
    {
      id: "rpt-smr-patel-today",
      user_id: "smr.patel",
      report_date: todayStr,
      doctor_visits_count: 10,
      chemist_visits_count: 18,
      wholesale_visits_count: 4,
      distributor_visits_count: 2,
      billing_amount: 142000.00,
      payment_amount: 110000.00,
      offers_distributed: "Pediatric Pulse Oximeter gifts & 10+2 chemist schemes",
      special_achievements: "Secured MedPlus Saket order for 50 boxes of MOMENTUM-DSR capsules!",
      notes: "Joint visit with AM Sanjay Kumar completed successfully.",
    },
  ];

  for (const r of reports) {
    await connection.query(
      `INSERT INTO daily_reports (
        id, user_id, report_date, doctor_visits_count, chemist_visits_count,
        wholesale_visits_count, distributor_visits_count, billing_amount,
        payment_amount, offers_distributed, special_achievements, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id, r.user_id, r.report_date, r.doctor_visits_count, r.chemist_visits_count,
        r.wholesale_visits_count, r.distributor_visits_count, r.billing_amount,
        r.payment_amount, r.offers_distributed, r.special_achievements, r.notes,
      ]
    );
  }

  // 7. Pharmaceutical Products & 3D Detailing Presentation Page
  const pharmaProducts = [
    {
      id: "pharma-cv-625",
      name: "MOMENTUM-CV 625 Tablets",
      composition: "Amoxicillin 500mg + Potassium Clavulanate 125mg",
      category: "Antibiotics / Respiratory",
      packaging: "10 x 1 x 10 Alu-Alu Blister Pack",
      mrp: 245.00,
      ptr: 165.00,
      pts: 145.00,
      image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop",
      detailing_presentation_url: "https://3d.momentumpharma.com/detail/cv625",
      key_benefits: JSON.stringify([
        "99.4% Clinical Efficacy in Upper & Lower Respiratory Tract Infections",
        "Zero Gastric Irritation Formulated with Micro-Granules",
        "Alu-Alu Moisture Barrier Packaging for Enhanced Shelf Life",
      ]),
      active_promotional_scheme: "10+2 Boxes Free + Executive Doctor Gift Set",
    },
    {
      id: "pharma-dsr",
      name: "MOMENTUM-DSR Capsules",
      composition: "Rabeprazole Sodium 20mg + Domperidone 30mg Sustained Release",
      category: "Gastroenterology",
      packaging: "10 x 10 Strip Box",
      mrp: 180.00,
      ptr: 120.00,
      pts: 105.00,
      image_url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop",
      detailing_presentation_url: "https://3d.momentumpharma.com/detail/dsr",
      key_benefits: JSON.stringify([
        "Dual Release Technology (Instant Acid Inhibition + 24-hr Motility Control)",
        "Rapid Relief from GERD, Heartburn, & Chronic Nausea",
        "High Patient Compliance & Superior Safety Profile",
      ]),
      active_promotional_scheme: "Buy 5 Boxes Get 1 Box Free + Chemist Banner Promo",
    },
    {
      id: "pharma-forte-syrup",
      name: "MOMENTUM-FORTE Syrup",
      composition: "Multivitamins + Essential Minerals + Antioxidants + L-Lysine",
      category: "Nutraceuticals & Immunity",
      packaging: "200ml Pet Bottle with Measuring Cap",
      mrp: 165.00,
      ptr: 108.00,
      pts: 92.00,
      image_url: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=600&auto=format&fit=crop",
      detailing_presentation_url: "https://3d.momentumpharma.com/detail/forte",
      key_benefits: JSON.stringify([
        "Fights Chronic Fatigue & Accelerates Post-Illness Recovery",
        "Boosts Appetite & Natural Immune Defense Mechanisms",
        "Delicious Mixed Fruit Flavor Preferred by All Age Groups",
      ]),
      active_promotional_scheme: "15+3 Launch Special Scheme + Free Doctor Sample Bottles",
    },
  ];

  for (const p of pharmaProducts) {
    await connection.query(
      `INSERT INTO pharma_products (
        id, name, composition, category, packaging, mrp, ptr, pts,
        image_url, detailing_presentation_url, key_benefits, active_promotional_scheme
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, p.name, p.composition, p.category, p.packaging, p.mrp, p.ptr, p.pts,
        p.image_url, p.detailing_presentation_url, p.key_benefits, p.active_promotional_scheme,
      ]
    );
  }

  // 8. Teams
  const team1 = "team-field-ops";
  await connection.query(
    "INSERT INTO teams (id, name, description, lead_id) VALUES (?, ?, ?, ?)",
    [team1, "Kolkata & Delhi Territory Operations", "Field sales, doctor detailing, chemist network, and multi-stage onboarding.", "am.kumar"]
  );

  await connection.query(
    "INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
    [
      team1 + "-am", team1, "am.kumar", "manager",
      team1 + "-smr", team1, "smr.patel", "lead",
      team1 + "-mr", team1, "mr.das", "member",
    ]
  );

  // 9. Sprints & Backlog Tasks
  const sprintId = "sprint-24-1";
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const endDate = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 19).replace('T', ' ');

  await connection.query(
    `INSERT INTO sprints (id, name, goal, status, start_date, end_date, target_points, completed_points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sprintId,
      "Sprint 24.1 (Field & Governance Rollout)",
      "Roll out 3D visual detailing, doctor anniversary tracking, City Pharma trade onboarding, and multi-stage product approval.",
      "active",
      startDate,
      endDate,
      40,
      28,
    ]
  );

  const epicId = "epic-field-expansion";
  await connection.query(
    `INSERT INTO epics (id, name, description, status, team_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      epicId,
      "Kolkata & Delhi Territory Field Execution",
      "Expand doctor relationship network, onboard retail chemists, and streamline product approvals.",
      "in_progress",
      team1,
    ]
  );

  const tasksData = [
    {
      id: "task-1",
      title: "Present MOMENTUM-CV 625 3D Detailing Card to Dr. Sharma",
      description: "Demonstrate 3D clinical benefits, composition, MRP/PTR/PTS pricing on tablet at Park Street clinic.",
      status: "done",
      points: 5,
      assignee_id: "mr.das",
      epic_id: epicId,
      sprint_id: sprintId,
      team_id: team1,
      created_by: "smr.patel",
    },
    {
      id: "task-2",
      title: "Capture Dr. Sharma Anniversary & Gift Acceptance Details",
      description: "Log anniversary date (Dec 10), spouse DOB, and stethoscope gift acceptance details into Doctors Management.",
      status: "done",
      points: 3,
      assignee_id: "mr.das",
      epic_id: epicId,
      sprint_id: sprintId,
      team_id: team1,
      created_by: "mr.das",
    },
    {
      id: "task-3",
      title: "Onboard City Pharma to Trade Network (D.L. & GST Verification)",
      description: "Register City Pharma chemist store under Park Circus with D.L. DL-20B/KOL/94821 and 10+2 promotional scheme.",
      status: "done",
      points: 8,
      assignee_id: "mr.das",
      epic_id: epicId,
      sprint_id: sprintId,
      team_id: team1,
      created_by: "mr.das",
    },
    {
      id: "task-4",
      title: "Submit Daily Workstation Field Activity & Collections",
      description: "Record 2 doctor visits, 1 chemist visit, and ₹15,000 billing / ₹10,000 collection into daily_reports.",
      status: "done",
      points: 5,
      assignee_id: "mr.das",
      epic_id: epicId,
      sprint_id: sprintId,
      team_id: team1,
      created_by: "mr.das",
    },
    {
      id: "task-5",
      title: "Onboard Specialty Brand Item: MOMENTUM CardioPlus 10mg",
      description: "Submit product onboarding item for multi-stage manager approval under /products surface.",
      status: "in_progress",
      points: 12,
      assignee_id: "mr.das",
      epic_id: epicId,
      sprint_id: sprintId,
      team_id: team1,
      created_by: "mr.das",
    },
    {
      id: "task-6",
      title: "Review & Approve Regional Product Onboarding Request",
      description: "Regional Manager Amit Verma evaluates Rahul Das's onboarding request under /approvals queue.",
      status: "in_progress",
      points: 7,
      assignee_id: "rm.verma",
      epic_id: epicId,
      sprint_id: sprintId,
      team_id: team1,
      created_by: "gm.sharma",
    },
  ];

  for (const t of tasksData) {
    await connection.query(
      `INSERT INTO tasks (id, title, description, status, points, assignee_id, epic_id, sprint_id, team_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.title, t.description, t.status, t.points, t.assignee_id, t.epic_id, t.sprint_id, t.team_id, t.created_by]
    );
  }

  // 10. Approval Workflows & Product Onboarding Engine
  const workflowId = "wf-product-onboarding";
  await connection.query(
    `INSERT INTO approval_workflows (id, name, description, entity_type, active, created_by)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [
      workflowId,
      "Product Onboarding & Special Brand Verification",
      "Multi-stage approval workflow for onboarding pharmaceutical brand items and trade discounts.",
      "product_onboarding",
      "director.main",
    ]
  );

  const stepId = "step-1-manager";
  await connection.query(
    `INSERT INTO approval_steps (id, workflow_id, step_order, approver_type, approver_ref, approver_id)
     VALUES (?, ?, 1, 'permission', 'approvals:action', 'rm.verma')`,
    [stepId, workflowId]
  );

  const productTemplateId = "prod-specialty-brand";
  await connection.query(
    `INSERT INTO products (id, name, product_type, category, sku, status, custom_fields, form_schema, approval_settings, created_by)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    [
      productTemplateId,
      "Specialty Brand Onboarding Item",
      "Pharmaceutical Onboarding",
      "Cardiology",
      "SKU-CARDIO-PLUS-10",
      JSON.stringify({ target_region: "Kolkata & Delhi", priority: "High" }),
      JSON.stringify({ fields: [{ name: "item_name", label: "Item Name", type: "text", required: true }] }),
      JSON.stringify({ require_approval: true, workflow_id: workflowId }),
      "director.main",
    ]
  );

  const productItemId = "item-cardio-plus";
  const approvalRequestId = "req-cardio-plus";

  await connection.query(
    `INSERT INTO product_items (id, product_id, item_name, status, approval_request_id, custom_fields, created_by)
     VALUES (?, ?, ?, 'pending_approval', ?, ?, ?)`,
    [
      productItemId,
      productTemplateId,
      "MOMENTUM CardioPlus 10mg Specialty Item",
      approvalRequestId,
      JSON.stringify({ brand: "CardioPlus", dosage: "10mg", territory: "Kolkata Park Circus Zone" }),
      "mr.das",
    ]
  );

  await connection.query(
    `INSERT INTO approval_requests (id, workflow_id, requester_id, entity_type, entity_id, title, description, status, current_step_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1)`,
    [
      approvalRequestId,
      workflowId,
      "mr.das",
      "product_onboarding",
      productItemId,
      "Onboard MOMENTUM CardioPlus 10mg Specialty Item",
      "Submitted by Rahul Das (MR - Level 7) for clinic distribution in Kolkata territory.",
    ]
  );

  await connection.query(
    `INSERT INTO approval_actions (id, request_id, approver_id, step_order, decision, note)
     VALUES (?, ?, ?, 1, 'approved', ?)`,
    [
      "act-amit-approved",
      approvalRequestId,
      "rm.verma",
      "Approved regional specialty brand item for Kolkata territory after compliance review.",
    ]
  );

  // 11. Appreciations
  await connection.query(
    `INSERT INTO appreciations (id, sender_id, recipient_id, message, badge_type)
     VALUES (?, ?, ?, ?, ?)`,
    [
      "appr-1",
      "rm.verma",
      "mr.das",
      "Outstanding field performance in Kolkata! Excellent work capturing Dr. Sharma's anniversary and onboarding City Pharmacy.",
      "Excellence",
    ]
  );

  console.log("[MySQL Backend] Complete Working Pyramid Hierarchy, Doctors, Trade Entities, Daily Reports & 3D Detailing Products successfully seeded!");
}

export async function initDb() {
  if (isInitialized) return;

  try {
    const connection = await pool.getConnection();
    console.log("[MySQL Backend] Connected to MySQL database pool successfully.");

    // Create Core Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255),
        password_hash VARCHAR(255),
        must_change_password TINYINT(1) DEFAULT 0,
        full_name VARCHAR(255),
        avatar_url TEXT,
        department VARCHAR(255),

        position_id VARCHAR(36),
        manager_id VARCHAR(36),
        designation VARCHAR(255),
        area VARCHAR(255),
        office_number VARCHAR(50),
        personal_number VARCHAR(50),
        emergency_family_number VARCHAR(50),
        referrals_contact TEXT,
        official_email VARCHAR(255),
        personal_email VARCHAR(255),
        residential_address TEXT,
        id_documents_url TEXT,
        bank_details_url TEXT,
        official_id_no VARCHAR(100),
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // High-performance index for recursive manager hierarchy CTE queries
    try {
      await connection.query("CREATE INDEX idx_profiles_manager_id ON profiles(manager_id)");
    } catch {
      // Index already exists
    }

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
      CREATE TABLE IF NOT EXISTS user_permissions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        permission VARCHAR(100) NOT NULL,
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
      CREATE TABLE IF NOT EXISTS doctors (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        area_locality VARCHAR(255) NOT NULL,
        whatsapp_contact VARCHAR(50) NOT NULL,
        dob DATE,
        spouse_dob DATE,
        anniversary_date DATE,
        child_dobs JSON,
        special_day VARCHAR(255),
        gift_accepted_details TEXT,
        created_by VARCHAR(36) NOT NULL,
        assigned_to VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS trade_entities (
        id VARCHAR(36) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        firm_name VARCHAR(255) NOT NULL,
        drug_license_no VARCHAR(100) NOT NULL,
        gst_number VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        proprietor_name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        comm_modes VARCHAR(255),
        billing_details TEXT,
        payment_details TEXT,
        offer_scheme_details TEXT,
        created_by VARCHAR(36) NOT NULL,
        assigned_to VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        report_date DATE NOT NULL,
        doctor_visits_count INT DEFAULT 0,
        chemist_visits_count INT DEFAULT 0,
        wholesale_visits_count INT DEFAULT 0,
        distributor_visits_count INT DEFAULT 0,
        billing_amount DECIMAL(12, 2) DEFAULT 0.00,
        payment_amount DECIMAL(12, 2) DEFAULT 0.00,
        offers_distributed TEXT,
        special_achievements TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pharma_products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        composition VARCHAR(255),
        category VARCHAR(100),
        packaging VARCHAR(100),
        mrp DECIMAL(10, 2),
        ptr DECIMAL(10, 2),
        pts DECIMAL(10, 2),
        image_url TEXT,
        detailing_presentation_url TEXT,
        key_benefits JSON,
        active_promotional_scheme TEXT,
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
      CREATE TABLE IF NOT EXISTS appreciations (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        recipient_id VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        badge_type VARCHAR(100) DEFAULT 'Excellence',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure extended profile columns exist
    await addColumnIfNotExist(connection, "profiles", "designation", "VARCHAR(255)");
    await addColumnIfNotExist(connection, "profiles", "area", "VARCHAR(255)");
    await addColumnIfNotExist(connection, "profiles", "office_number", "VARCHAR(50)");
    await addColumnIfNotExist(connection, "profiles", "personal_number", "VARCHAR(50)");
    await addColumnIfNotExist(connection, "profiles", "emergency_family_number", "VARCHAR(50)");
    await addColumnIfNotExist(connection, "profiles", "referrals_contact", "TEXT");
    await addColumnIfNotExist(connection, "profiles", "official_email", "VARCHAR(255)");
    await addColumnIfNotExist(connection, "profiles", "personal_email", "VARCHAR(255)");
    await addColumnIfNotExist(connection, "profiles", "residential_address", "TEXT");
    await addColumnIfNotExist(connection, "profiles", "id_documents_url", "TEXT");
    await addColumnIfNotExist(connection, "profiles", "bank_details_url", "TEXT");
    await addColumnIfNotExist(connection, "profiles", "official_id_no", "VARCHAR(100)");
    await addColumnIfNotExist(connection, "profiles", "email", "VARCHAR(255)");
    await addColumnIfNotExist(connection, "profiles", "password_hash", "VARCHAR(255)");
    await addColumnIfNotExist(connection, "profiles", "must_change_password", "TINYINT(1) DEFAULT 0");

    // Ensure user_positions columns exist
    await addColumnIfNotExist(connection, "user_positions", "level", "INT DEFAULT 0");
    await addColumnIfNotExist(connection, "user_positions", "description", "TEXT");
    await addColumnIfNotExist(connection, "user_positions", "parent_position_id", "VARCHAR(36)");

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

    // The reserved super admin must always exist and be able to sign in.
    await ensureSuperAdmin(connection);


    connection.release();
    isInitialized = true;
    console.log("[MySQL Backend] Database tables schema verified and ready!");
  } catch (err) {
    console.warn("[MySQL Backend] MySQL database setup warning:", err);
  }
}
