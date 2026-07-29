import { Router, Request, Response } from "express";
import { ProductModel } from "../models/product.model.js";
import { ApprovalModel } from "../models/approval.model.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Apply auth middleware to all product endpoints
router.use(requireAuth);

// --- Approval Workflows for Settings ---
router.get("/approval-workflows", async (_req: Request, res: Response) => {
  try {
    const workflows = await ApprovalModel.findAllWorkflows();
    return res.json({ success: true, workflows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Dynamic Types & Categories ---
router.get("/types-categories", async (_req: Request, res: Response) => {
  try {
    const data = await ProductModel.getTypesAndCategories();
    return res.json({ success: true, ...data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Form Schemas ---
router.get("/forms/schemas", async (req: Request, res: Response) => {
  try {
    const type = req.query.type as "onboarding" | "dependency" | undefined;
    if (type) {
      const schema = await ProductModel.getFormSchemaByType(type);
      return res.json({ success: true, schema });
    }
    const schemas = await ProductModel.getAllFormSchemas();
    return res.json({ success: true, schemas });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/forms/schemas", async (req: Request, res: Response) => {
  try {
    const { id, name, schema_type, fields } = req.body;
    if (!name || !schema_type || !Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, schema_type ('onboarding' | 'dependency'), and fields array",
      });
    }

    const schema = await ProductModel.saveFormSchema({ id, name, schema_type, fields });
    return res.status(201).json({ success: true, schema });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Product Tasks ---
router.get("/tasks/list", async (_req: Request, res: Response) => {
  try {
    const tasks = await ProductModel.getTasks();
    return res.json({ success: true, tasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/tasks/list", async (req: Request, res: Response) => {
  try {
    const { title, description, target_quantity, assigned_to } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: "Task title is required" });
    }

    const task = await ProductModel.createTask({
      title,
      description,
      target_quantity: Number(target_quantity) || 1,
      assigned_to,
    });
    return res.status(201).json({ success: true, task });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Product Items (Onboarded Records under a Product Definition like "Dr. John Smith" under "Doctor") ---
router.get("/items", async (req: Request, res: Response) => {
  try {
    const { product_id, search, status } = req.query;
    const items = await ProductModel.getProductItems({
      product_id: product_id as string,
      search: search as string,
      status: status as string,
    });
    return res.json({ success: true, items });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/items", async (req: Request, res: Response) => {
  try {
    const { product_id, item_name, task_id, custom_fields } = req.body;
    if (!product_id || !item_name) {
      return res.status(400).json({
        success: false,
        error: "Both product_id and item_name are required",
      });
    }

    const userId = (req as any).user?.id || "system";
    const item = await ProductModel.createProductItem({
      product_id,
      item_name,
      task_id,
      custom_fields,
      created_by: userId,
    });

    return res.status(201).json({ success: true, item });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/items/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await ProductModel.deleteProductItem(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Product item not found" });
    }
    return res.json({ success: true, message: "Product item deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Product Dependencies ---
router.post("/dependencies", async (req: Request, res: Response) => {
  try {
    const { product_id, depends_on_product_id, dependency_type, custom_fields } = req.body;
    if (!product_id || !depends_on_product_id) {
      return res.status(400).json({
        success: false,
        error: "Both product_id and depends_on_product_id are required",
      });
    }

    if (product_id === depends_on_product_id) {
      return res.status(400).json({
        success: false,
        error: "A product cannot depend on itself",
      });
    }

    const dependency = await ProductModel.addDependency({
      product_id,
      depends_on_product_id,
      dependency_type,
      custom_fields,
    });
    return res.status(201).json({ success: true, dependency });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/dependencies/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await ProductModel.removeDependency(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Dependency not found" });
    }
    return res.json({ success: true, message: "Dependency removed successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Product Definitions CRUD ---
router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, product_type, category } = req.query;
    const products = await ProductModel.getProducts({
      search: search as string,
      product_type: product_type as string,
      category: category as string,
    });
    return res.json({ success: true, products });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await ProductModel.getProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    return res.json({ success: true, product });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, product_type, category, sku, status, form_schema, approval_settings } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Product name is required" });
    }

    const userId = (req as any).user?.id || "system";
    const product = await ProductModel.createProduct({
      name,
      product_type,
      category,
      sku,
      status,
      form_schema,
      approval_settings,
      created_by: userId,
    });

    return res.status(201).json({ success: true, product });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await ProductModel.updateProduct(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    return res.json({ success: true, product: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await ProductModel.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
