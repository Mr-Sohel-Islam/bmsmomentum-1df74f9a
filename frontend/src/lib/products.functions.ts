import { fetchApi } from "@/lib/api-client";

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

// API Functions
export async function getApprovalWorkflows(): Promise<any[]> {
  const res = await fetchApi<any>("/products/approval-workflows");
  return res.workflows || [];
}

export async function getProductTypesAndCategories(): Promise<{ product_types: string[]; categories: string[] }> {
  const res = await fetchApi<any>("/products/types-categories");
  return {
    product_types: res.product_types || ["Entity Onboarding", "Software Service", "Hardware Component", "Workflow Template"],
    categories: res.categories || ["Healthcare", "Software Platform", "Operations & Vendor", "Finance", "General"],
  };
}

export async function getFormSchemas(type?: "onboarding" | "dependency"): Promise<FormSchema[]> {
  const query = type ? `?type=${type}` : "";
  const res = await fetchApi<any>(`/products/forms/schemas${query}`);
  if (res.schema) return [res.schema];
  return res.schemas || [];
}

export async function saveFormSchema(data: {
  id?: string;
  name: string;
  schema_type: "onboarding" | "dependency";
  fields: FormField[];
}): Promise<FormSchema> {
  const res = await fetchApi<any>("/products/forms/schemas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.schema;
}

export async function getProductTasks(): Promise<ProductTask[]> {
  const res = await fetchApi<any>("/products/tasks/list");
  return res.tasks || [];
}

export async function createProductTask(data: {
  title: string;
  description?: string;
  target_quantity: number;
  assigned_to?: string;
}): Promise<ProductTask> {
  const res = await fetchApi<any>("/products/tasks/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.task;
}

// Products (Definitions / Templates)
export async function getProducts(params?: {
  search?: string;
  product_type?: string;
  category?: string;
}): Promise<Product[]> {
  const queryParts: string[] = [];
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params?.product_type) queryParts.push(`product_type=${encodeURIComponent(params.product_type)}`);
  if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const res = await fetchApi<any>(`/products${queryString}`);
  return res.products || [];
}

export async function createProduct(data: {
  name: string;
  product_type?: string;
  category?: string;
  sku?: string;
  status?: string;
  form_schema?: FormField[];
  approval_settings?: ApprovalSettings;
}): Promise<Product> {
  const res = await fetchApi<any>("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.product;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  const res = await fetchApi<any>(`/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.product;
}

export async function deleteProduct(id: string): Promise<void> {
  await fetchApi<any>(`/products/${id}`, { method: "DELETE" });
}

// Product Items (Onboarded Records under a Product Definition like "Dr. John Smith" under "Doctor")
export async function getProductItems(params?: {
  product_id?: string;
  search?: string;
  status?: string;
}): Promise<ProductItem[]> {
  const queryParts: string[] = [];
  if (params?.product_id) queryParts.push(`product_id=${encodeURIComponent(params.product_id)}`);
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const res = await fetchApi<any>(`/products/items${queryString}`);
  return res.items || [];
}

export async function createProductItem(data: {
  product_id: string;
  item_name: string;
  task_id?: string;
  custom_fields?: Record<string, any>;
}): Promise<ProductItem> {
  const res = await fetchApi<any>("/products/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.item;
}

export async function deleteProductItem(id: string): Promise<void> {
  await fetchApi<any>(`/products/items/${id}`, { method: "DELETE" });
}

// Dependencies
export async function addProductDependency(data: {
  product_id: string;
  depends_on_product_id: string;
  dependency_type?: string;
  custom_fields?: Record<string, any>;
}): Promise<ProductDependency> {
  const res = await fetchApi<any>("/products/dependencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.dependency;
}

export async function removeProductDependency(id: string): Promise<void> {
  await fetchApi<any>(`/products/dependencies/${id}`, { method: "DELETE" });
}
