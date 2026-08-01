import { Router, Request, Response } from "express";
import { ProductModel } from "../models/product.model.js";
import { ApprovalModel } from "../models/approval.model.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";
import { AppError, asyncHandler } from "../utils/response.js";

const router = Router();

type RouteHandler = (req: Request, res: Response) => Promise<unknown>;

const guarded = (permission: string, handler: RouteHandler) => [
  requirePermission(permission),
  asyncHandler(handler),
];

const idParam = (req: Request, name = "id") => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
};

const ok = (res: Response, body: Record<string, unknown>, status = 200) =>
  res.status(status).json({ success: true, ...body });

router.use(requireAuth);

router.get(
  "/approval-workflows",
  ...guarded("products:read", async (_req, res) => {
    return ok(res, { workflows: await ApprovalModel.findAllWorkflows() });
  }),
);

router.get(
  "/types-categories",
  ...guarded("products:read", async (_req, res) => {
    return ok(res, await ProductModel.getTypesAndCategories());
  }),
);

router.get(
  "/forms/schemas",
  ...guarded("products:read", async (req, res) => {
    const type = req.query.type as "onboarding" | "dependency" | undefined;
    if (type) {
      return ok(res, { schema: await ProductModel.getFormSchemaByType(type) });
    }
    return ok(res, { schemas: await ProductModel.getAllFormSchemas() });
  }),
);

router.post(
  "/forms/schemas",
  ...guarded("products:manage", async (req, res) => {
    const { id, name, schema_type, fields } = req.body;
    if (!name || !schema_type || !Array.isArray(fields)) {
      throw new AppError(
        "Missing required fields: name, schema_type ('onboarding' | 'dependency'), and fields array",
        400,
      );
    }

    const schema = await ProductModel.saveFormSchema({ id, name, schema_type, fields });
    return ok(res, { schema }, 201);
  }),
);

router.get(
  "/tasks/list",
  ...guarded("products:read", async (_req, res) => {
    return ok(res, { tasks: await ProductModel.getTasks() });
  }),
);

router.post(
  "/tasks/list",
  ...guarded("products:manage", async (req, res) => {
    const { title, description, target_quantity, assigned_to } = req.body;
    if (!title) throw new AppError("Task title is required", 400);

    const task = await ProductModel.createTask({
      title,
      description,
      target_quantity: Number(target_quantity) || 1,
      assigned_to,
    });
    return ok(res, { task }, 201);
  }),
);

router.get(
  "/items",
  ...guarded("products:read", async (req, res) => {
    const { product_id, search, status } = req.query;
    const items = await ProductModel.getProductItems({
      product_id: product_id as string,
      search: search as string,
      status: status as string,
    });
    return ok(res, { items });
  }),
);

router.post(
  "/items",
  ...guarded("products:onboard_item", async (req, res) => {
    const { product_id, item_name, task_id, custom_fields } = req.body;
    if (!product_id || !item_name) {
      throw new AppError("Both product_id and item_name are required", 400);
    }

    const item = await ProductModel.createProductItem({
      product_id,
      item_name,
      task_id,
      custom_fields,
      created_by: req.user?.id || "system",
    });
    return ok(res, { item }, 201);
  }),
);

router.delete(
  "/items/:id",
  ...guarded("products:manage", async (req, res) => {
    if (!(await ProductModel.deleteProductItem(idParam(req)))) {
      throw new AppError("Product item not found", 404);
    }
    return ok(res, { message: "Product item deleted successfully" });
  }),
);

router.post(
  "/dependencies",
  ...guarded("products:manage", async (req, res) => {
    const { product_id, depends_on_product_id, dependency_type, custom_fields } = req.body;
    if (!product_id || !depends_on_product_id) {
      throw new AppError("Both product_id and depends_on_product_id are required", 400);
    }
    if (product_id === depends_on_product_id) {
      throw new AppError("A product cannot depend on itself", 400);
    }

    const dependency = await ProductModel.addDependency({
      product_id,
      depends_on_product_id,
      dependency_type,
      custom_fields,
    });
    return ok(res, { dependency }, 201);
  }),
);

router.delete(
  "/dependencies/:id",
  ...guarded("products:manage", async (req, res) => {
    if (!(await ProductModel.removeDependency(idParam(req)))) {
      throw new AppError("Dependency not found", 404);
    }
    return ok(res, { message: "Dependency removed successfully" });
  }),
);

router.get(
  "/",
  ...guarded("products:read", async (req, res) => {
    const { search, product_type, category } = req.query;
    const products = await ProductModel.getProducts({
      search: search as string,
      product_type: product_type as string,
      category: category as string,
    });
    return ok(res, { products });
  }),
);

router.get(
  "/:id",
  ...guarded("products:read", async (req, res) => {
    const product = await ProductModel.getProductById(idParam(req));
    if (!product) throw new AppError("Product not found", 404);
    return ok(res, { product });
  }),
);

router.post(
  "/",
  ...guarded("products:manage", async (req, res) => {
    const { name, product_type, category, sku, status, form_schema, approval_settings } = req.body;
    if (!name) throw new AppError("Product name is required", 400);

    const product = await ProductModel.createProduct({
      name,
      product_type,
      category,
      sku,
      status,
      form_schema,
      approval_settings,
      created_by: req.user?.id || "system",
    });
    return ok(res, { product }, 201);
  }),
);

router.put(
  "/:id",
  ...guarded("products:manage", async (req, res) => {
    const product = await ProductModel.updateProduct(idParam(req), req.body);
    if (!product) throw new AppError("Product not found", 404);
    return ok(res, { product });
  }),
);

router.delete(
  "/:id",
  ...guarded("products:manage", async (req, res) => {
    if (!(await ProductModel.deleteProduct(idParam(req)))) {
      throw new AppError("Product not found", 404);
    }
    return ok(res, { message: "Product deleted successfully" });
  }),
);

export default router;
