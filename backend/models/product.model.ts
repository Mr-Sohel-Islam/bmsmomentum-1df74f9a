import mysql from "mysql2/promise";
import { pool } from "../db.js";
import crypto from "crypto";

export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "checkbox" | "date";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormSchema {
  id: string;
  name: string;
  schema_type: "onboarding" | "dependency";
  fields: FormField[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductTask {
  id: string;
  title: string;
  description?: string;
  target_quantity: number;
  onboarded_count: number;
  status: "in_progress" | "completed" | "cancelled";
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductDependency {
  id: string;
  product_id: string;
  depends_on_product_id: string;
  depends_on_product_name?: string;
  depends_on_product_sku?: string;
  dependency_type: string;
  custom_fields: Record<string, any>;
  created_at?: string;
}

export interface ApprovalSettings {
  require_approval: boolean;
  workflow_id?: string | null;
  workflow_name?: string | null;
}

export interface Product {
  id: string;
  name: string;
  product_type: string;
  category: string;
  sku?: string;
  status: string;
  task_id?: string;
  custom_fields?: Record<string, any>;
  form_schema: FormField[];
  approval_settings: ApprovalSettings;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  dependencies?: ProductDependency[];
}

export interface ProductItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_type?: string;
  product_category?: string;
  item_name: string;
  status: "onboarded" | "pending_approval" | "rejected";
  approval_request_id?: string | null;
  task_id?: string | null;
  custom_fields: Record<string, any>;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper to ensure columns exist dynamically
async function ensureProductColumns() {
  try {
    const connection = await pool.getConnection();
    try {
      const columnsToAdd = [
        { name: "product_type", def: "VARCHAR(100) DEFAULT 'Entity Onboarding'" },
        { name: "category", def: "VARCHAR(100) DEFAULT 'General'" },
        { name: "form_schema", def: "JSON" },
        { name: "approval_settings", def: "JSON" },
        { name: "sku", def: "VARCHAR(100)" },
        { name: "status", def: "VARCHAR(50) DEFAULT 'active'" },
        { name: "task_id", def: "VARCHAR(36)" },
        { name: "custom_fields", def: "JSON" },
      ];

      for (const col of columnsToAdd) {
        const [cols] = await connection.query<mysql.RowDataPacket[]>(
          `SHOW COLUMNS FROM products LIKE ?`,
          [col.name]
        );
        if (!Array.isArray(cols) || cols.length === 0) {
          console.log(`[ProductModel] Adding missing column '${col.name}' to table 'products'...`);
          await connection.query(`ALTER TABLE products ADD COLUMN ${col.name} ${col.def}`);
        }
      }
    } finally {
      connection.release();
    }
  } catch (err) {
    console.warn("[ProductModel] column check warning:", err);
  }
}

export const ProductModel = {
  // Get distinct Product Types and Categories saved in DB
  async getTypesAndCategories(): Promise<{ product_types: string[]; categories: string[] }> {
    await ensureProductColumns();
    try {
      const [typeRows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT DISTINCT product_type FROM products WHERE product_type IS NOT NULL AND product_type != '' ORDER BY product_type ASC"
      );
      const [catRows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC"
      );

      const dbTypes = Array.isArray(typeRows) ? typeRows.map((r) => r.product_type).filter(Boolean) : [];
      const dbCats = Array.isArray(catRows) ? catRows.map((r) => r.category).filter(Boolean) : [];

      const defaultTypes = ["Entity Onboarding", "Software Service", "Hardware Component", "Workflow Template"];
      const defaultCats = ["Healthcare", "Software Platform", "Operations & Vendor", "Finance", "General"];

      const mergedTypes = Array.from(new Set([...defaultTypes, ...dbTypes]));
      const mergedCats = Array.from(new Set([...defaultCats, ...dbCats]));

      return { product_types: mergedTypes, categories: mergedCats };
    } catch (err) {
      return {
        product_types: ["Entity Onboarding", "Software Service", "Hardware Component", "Workflow Template"],
        categories: ["Healthcare", "Software Platform", "Operations & Vendor", "Finance", "General"],
      };
    }
  },

  // Form Schemas
  async getFormSchemaByType(type: "onboarding" | "dependency"): Promise<FormSchema | null> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM product_form_schemas WHERE schema_type = ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1",
      [type]
    );

    if (!Array.isArray(rows) || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      schema_type: r.schema_type,
      fields: typeof r.fields === "string" ? JSON.parse(r.fields) : r.fields || [],
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  },

  async getAllFormSchemas(): Promise<FormSchema[]> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM product_form_schemas ORDER BY schema_type, created_at DESC"
    );

    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      schema_type: r.schema_type,
      fields: typeof r.fields === "string" ? JSON.parse(r.fields) : r.fields || [],
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  },

  async saveFormSchema(data: {
    id?: string;
    name: string;
    schema_type: "onboarding" | "dependency";
    fields: FormField[];
  }): Promise<FormSchema> {
    const id = data.id || `schema-${crypto.randomUUID()}`;
    const fieldsJson = JSON.stringify(data.fields);

    if (!data.id) {
      await pool.query(
        "UPDATE product_form_schemas SET is_active = 0 WHERE schema_type = ?",
        [data.schema_type]
      );
    }

    await pool.query(
      `INSERT INTO product_form_schemas (id, name, schema_type, fields, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), fields = VALUES(fields), is_active = 1`,
      [id, data.name, data.schema_type, fieldsJson]
    );

    return (await this.getFormSchemaByType(data.schema_type))!;
  },

  // Product Tasks
  async getTasks(): Promise<ProductTask[]> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM product_tasks ORDER BY created_at DESC"
    );
    if (!Array.isArray(rows)) return [];
    return rows as ProductTask[];
  },

  async createTask(data: {
    title: string;
    description?: string;
    target_quantity: number;
    assigned_to?: string;
  }): Promise<ProductTask> {
    const id = `ptask-${crypto.randomUUID()}`;
    const targetQty = Math.max(1, Number(data.target_quantity) || 1);

    await pool.query(
      `INSERT INTO product_tasks (id, title, description, target_quantity, onboarded_count, status, assigned_to)
       VALUES (?, ?, ?, ?, 0, 'in_progress', ?)`,
      [id, data.title, data.description || "", targetQty, data.assigned_to || null]
    );

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM product_tasks WHERE id = ?",
      [id]
    );
    return rows[0] as ProductTask;
  },

  // Product Definitions (Templates e.g. Doctor, Vendor, Microservice)
  async getProducts(params?: {
    search?: string;
    product_type?: string;
    category?: string;
  }): Promise<Product[]> {
    await ensureProductColumns();

    let sql = `
      SELECT p.*,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', pd.id,
              'product_id', pd.product_id,
              'depends_on_product_id', pd.depends_on_product_id,
              'depends_on_product_name', dp.name,
              'depends_on_product_sku', dp.sku,
              'dependency_type', pd.dependency_type,
              'custom_fields', pd.custom_fields,
              'created_at', pd.created_at
            )
          )
          FROM product_dependencies pd
          LEFT JOIN products dp ON pd.depends_on_product_id = dp.id
          WHERE pd.product_id = p.id
        ) as dependencies_json
      FROM products p
      WHERE 1=1
    `;
    const values: any[] = [];

    if (params?.search) {
      sql += ` AND (p.name LIKE ? OR p.product_type LIKE ? OR p.category LIKE ?)`;
      const term = `%${params.search}%`;
      values.push(term, term, term);
    }

    if (params?.product_type) {
      sql += ` AND p.product_type = ?`;
      values.push(params.product_type);
    }

    if (params?.category) {
      sql += ` AND p.category = ?`;
      values.push(params.category);
    }

    sql += ` ORDER BY p.created_at DESC`;

    const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, values);
    if (!Array.isArray(rows)) return [];

    return rows.map((r) => {
      let deps: ProductDependency[] = [];
      if (r.dependencies_json) {
        try {
          deps = typeof r.dependencies_json === "string" ? JSON.parse(r.dependencies_json) : r.dependencies_json;
        } catch {
          deps = [];
        }
      }

      let formSchema: FormField[] = [];
      if (r.form_schema) {
        try {
          formSchema = typeof r.form_schema === "string" ? JSON.parse(r.form_schema) : r.form_schema;
        } catch {
          formSchema = [];
        }
      }

      let approvalSettings: ApprovalSettings = { require_approval: false };
      if (r.approval_settings) {
        try {
          approvalSettings = typeof r.approval_settings === "string" ? JSON.parse(r.approval_settings) : r.approval_settings;
        } catch {
          approvalSettings = { require_approval: false };
        }
      }

      return {
        id: r.id,
        name: r.name,
        product_type: r.product_type || "Entity Onboarding",
        category: r.category || "General",
        sku: r.sku,
        status: r.status || "active",
        task_id: r.task_id,
        custom_fields: typeof r.custom_fields === "string" ? JSON.parse(r.custom_fields) : r.custom_fields || {},
        form_schema: Array.isArray(formSchema) ? formSchema : [],
        approval_settings: approvalSettings,
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
        dependencies: deps.filter(Boolean),
      };
    });
  },

  async getProductById(id: string): Promise<Product | null> {
    const prods = await this.getProducts();
    return prods.find((p) => p.id === id) || null;
  },

  async createProduct(data: {
    name: string;
    product_type?: string;
    category?: string;
    sku?: string;
    status?: string;
    form_schema?: FormField[];
    approval_settings?: ApprovalSettings;
    created_by?: string;
  }): Promise<Product> {
    await ensureProductColumns();

    const id = `prod-${crypto.randomUUID()}`;
    const sku = data.sku || `PROD-${Math.floor(100000 + Math.random() * 900000)}`;
    const formSchemaJson = JSON.stringify(data.form_schema || []);
    const approvalSettingsJson = JSON.stringify(data.approval_settings || { require_approval: false });

    await pool.query(
      `INSERT INTO products (id, name, product_type, category, sku, status, form_schema, approval_settings, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.product_type || "Entity Onboarding",
        data.category || "General",
        sku,
        data.status || "active",
        formSchemaJson,
        approvalSettingsJson,
        data.created_by || "system",
      ]
    );

    return (await this.getProductById(id))!;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
    await ensureProductColumns();
    const existing = await this.getProductById(id);
    if (!existing) return null;

    const name = data.name !== undefined ? data.name : existing.name;
    const product_type = data.product_type !== undefined ? data.product_type : existing.product_type;
    const category = data.category !== undefined ? data.category : existing.category;
    const sku = data.sku !== undefined ? data.sku : existing.sku;
    const status = data.status !== undefined ? data.status : existing.status;
    const formSchemaJson = JSON.stringify(data.form_schema !== undefined ? data.form_schema : existing.form_schema);
    const approvalSettingsJson = JSON.stringify(
      data.approval_settings !== undefined ? data.approval_settings : existing.approval_settings
    );

    await pool.query(
      `UPDATE products
       SET name = ?, product_type = ?, category = ?, sku = ?, status = ?, form_schema = ?, approval_settings = ?
       WHERE id = ?`,
      [name, product_type, category, sku, status, formSchemaJson, approvalSettingsJson, id]
    );

    return await this.getProductById(id);
  },

  async deleteProduct(id: string): Promise<boolean> {
    await pool.query("DELETE FROM product_items WHERE product_id = ?", [id]);
    await pool.query("DELETE FROM product_dependencies WHERE product_id = ? OR depends_on_product_id = ?", [id, id]);
    const [res] = await pool.query<mysql.ResultSetHeader>("DELETE FROM products WHERE id = ?", [id]);
    return res.affectedRows > 0;
  },

  // --- Product Items (Onboarded Records under a Product Definition like Doctor Dr. Smith) ---
  async getProductItems(params?: {
    product_id?: string;
    search?: string;
    status?: string;
  }): Promise<ProductItem[]> {
    let sql = `
      SELECT pi.*, p.name as product_name, p.product_type, p.category as product_category
      FROM product_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE 1=1
    `;
    const values: any[] = [];

    if (params?.product_id) {
      sql += ` AND pi.product_id = ?`;
      values.push(params.product_id);
    }

    if (params?.search) {
      sql += ` AND (pi.item_name LIKE ? OR p.name LIKE ?)`;
      const term = `%${params.search}%`;
      values.push(term, term);
    }

    if (params?.status) {
      sql += ` AND pi.status = ?`;
      values.push(params.status);
    }

    sql += ` ORDER BY pi.created_at DESC`;

    const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, values);
    if (!Array.isArray(rows)) return [];

    return rows.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      product_name: r.product_name,
      product_type: r.product_type,
      product_category: r.product_category,
      item_name: r.item_name,
      status: r.status,
      approval_request_id: r.approval_request_id,
      task_id: r.task_id,
      custom_fields: typeof r.custom_fields === "string" ? JSON.parse(r.custom_fields) : r.custom_fields || {},
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  },

  async createProductItem(data: {
    product_id: string;
    item_name: string;
    task_id?: string;
    custom_fields?: Record<string, any>;
    created_by?: string;
  }): Promise<ProductItem> {
    const parentProduct = await this.getProductById(data.product_id);
    if (!parentProduct) throw new Error("Parent Product definition not found");

    const itemId = `pitem-${crypto.randomUUID()}`;
    const customFieldsJson = JSON.stringify(data.custom_fields || {});

    const requireApproval = Boolean(parentProduct.approval_settings?.require_approval);
    const initialStatus = requireApproval ? "pending_approval" : "onboarded";
    let approvalRequestId: string | null = null;

    if (requireApproval) {
      approvalRequestId = `apreq-${crypto.randomUUID()}`;
      const workflowId = parentProduct.approval_settings.workflow_id || "default-workflow";

      await pool.query(
        `INSERT INTO approval_requests (id, workflow_id, requester_id, entity_type, entity_id, title, description, status, current_step_order)
         VALUES (?, ?, ?, 'product_item', ?, ?, ?, 'pending', 1)`,
        [
          approvalRequestId,
          workflowId,
          data.created_by || "system",
          itemId,
          `Onboarding Approval for ${data.item_name} (${parentProduct.name})`,
          `Onboarding submission under ${parentProduct.name} [Type: ${parentProduct.product_type}]`,
        ]
      );
    }

    await pool.query(
      `INSERT INTO product_items (id, product_id, item_name, status, approval_request_id, task_id, custom_fields, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        data.product_id,
        data.item_name,
        initialStatus,
        approvalRequestId,
        data.task_id || null,
        customFieldsJson,
        data.created_by || "system",
      ]
    );

    if (data.task_id) {
      await pool.query(
        `UPDATE product_tasks
         SET onboarded_count = onboarded_count + 1,
             status = CASE WHEN onboarded_count + 1 >= target_quantity THEN 'completed' ELSE status END
         WHERE id = ?`,
        [data.task_id]
      );
    }

    const items = await this.getProductItems();
    return items.find((i) => i.id === itemId)!;
  },

  async deleteProductItem(id: string): Promise<boolean> {
    const [itemRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT approval_request_id FROM product_items WHERE id = ?",
      [id]
    );
    const reqId = itemRows[0]?.approval_request_id;
    if (reqId) {
      await pool.query("DELETE FROM approval_actions WHERE request_id = ?", [reqId]);
      await pool.query("DELETE FROM approval_requests WHERE id = ?", [reqId]);
    }
    await pool.query("DELETE FROM approval_requests WHERE entity_id = ?", [id]);
    const [res] = await pool.query<mysql.ResultSetHeader>("DELETE FROM product_items WHERE id = ?", [id]);
    return res.affectedRows > 0;
  },

  // Dependencies
  async addDependency(data: {
    product_id: string;
    depends_on_product_id: string;
    dependency_type?: string;
    custom_fields?: Record<string, any>;
  }): Promise<ProductDependency> {
    const id = `pdep-${crypto.randomUUID()}`;
    const customFieldsJson = JSON.stringify(data.custom_fields || {});

    await pool.query(
      `INSERT INTO product_dependencies (id, product_id, depends_on_product_id, dependency_type, custom_fields)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        data.product_id,
        data.depends_on_product_id,
        data.dependency_type || "prerequisite",
        customFieldsJson,
      ]
    );

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT pd.*, dp.name as depends_on_product_name, dp.sku as depends_on_product_sku
       FROM product_dependencies pd
       LEFT JOIN products dp ON pd.depends_on_product_id = dp.id
       WHERE pd.id = ?`,
      [id]
    );

    const r = rows[0];
    return {
      id: r.id,
      product_id: r.product_id,
      depends_on_product_id: r.depends_on_product_id,
      depends_on_product_name: r.depends_on_product_name,
      depends_on_product_sku: r.depends_on_product_sku,
      dependency_type: r.dependency_type,
      custom_fields: typeof r.custom_fields === "string" ? JSON.parse(r.custom_fields) : r.custom_fields || {},
      created_at: r.created_at,
    };
  },

  async removeDependency(id: string): Promise<boolean> {
    const [res] = await pool.query<mysql.ResultSetHeader>(
      "DELETE FROM product_dependencies WHERE id = ?",
      [id]
    );
    return res.affectedRows > 0;
  },
};
