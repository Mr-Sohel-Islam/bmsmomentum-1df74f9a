import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  Filter,
  Settings2,
  CheckCircle2,
  Clock,
  Link2,
  Trash2,
  Sparkles,
  ListTodo,
  ShieldAlert,
  UserCheck,
  Building2,
  Stethoscope,
  ChevronRight,
  Sliders,
  FileCheck,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProducts,
  getProductItems,
  getProductTasks,
  getApprovalWorkflows,
  getFormSchemas,
  getProductTypesAndCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductItem,
  deleteProductItem,
  createProductTask,
  addProductDependency,
  removeProductDependency,
  Product,
  ProductItem,
  FormField,
  FormSchema,
} from "@/lib/products.functions";
import { DynamicFormRenderer } from "@/components/products/dynamic-form-renderer";
import { FormBuilder } from "@/components/products/form-builder";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products/")({
  component: ProductsDashboardPage,
});

function ProductsDashboardPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modals
  const [isDefineProductModalOpen, setIsDefineProductModalOpen] = useState(false);
  const [isOnboardItemModalOpen, setIsOnboardItemModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Selected state for onboarding an item under a specific Product Definition
  const [selectedParentProduct, setSelectedParentProduct] = useState<Product | null>(null);

  // Form State: Create/Edit Product Definition (e.g. Doctor, Vendor, API Service)
  const [defName, setDefName] = useState(""); // e.g. "Doctor"
  const [defType, setDefType] = useState("Entity Onboarding");
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState("");

  const [defCategory, setDefCategory] = useState("Healthcare");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const [defRequireApproval, setDefRequireApproval] = useState(true);
  const [defWorkflowId, setDefWorkflowId] = useState<string>("default");
  const [defCustomFields, setDefCustomFields] = useState<FormField[]>([
    {
      id: "f_specialty",
      label: "Medical Specialty / Role",
      type: "select",
      required: true,
      options: ["General Practitioner", "Cardiology", "Neurology", "Pediatrics", "Surgeon"],
    },
    {
      id: "f_license_no",
      label: "Medical License Number",
      type: "text",
      required: true,
      placeholder: "e.g. MD-982341",
    },
    {
      id: "f_hospital",
      label: "Hospital / Affiliation",
      type: "text",
      required: false,
      placeholder: "e.g. St. Jude General",
    },
  ]);

  // Form State: Onboard Item / Instance under a Product (e.g. Dr. John Smith under Doctor)
  const [itemName, setItemName] = useState(""); // e.g. "Dr. John Smith"
  const [itemTaskId, setItemTaskId] = useState<string>("none");
  const [itemCustomValues, setItemCustomValues] = useState<Record<string, any>>({});

  // Task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskQuantity, setNewTaskQuantity] = useState(3);

  // Queries
  const { data: typesAndCategories } = useQuery({
    queryKey: ["product-types-categories"],
    queryFn: () => getProductTypesAndCategories(),
  });

  const availableTypes = typesAndCategories?.product_types || [
    "Entity Onboarding",
    "Software Service",
    "Hardware Component",
    "Workflow Template",
  ];

  const availableCategories = typesAndCategories?.categories || [
    "Healthcare",
    "Software Platform",
    "Operations & Vendor",
    "Finance",
    "General",
  ];

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", searchTerm, selectedProductType, selectedCategory],
    queryFn: () =>
      getProducts({
        search: searchTerm,
        product_type: selectedProductType === "all" ? undefined : selectedProductType,
        category: selectedCategory === "all" ? undefined : selectedCategory,
      }),
  });

  const { data: productItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["product-items", searchTerm],
    queryFn: () => getProductItems({ search: searchTerm }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["product-tasks"],
    queryFn: () => getProductTasks(),
  });

  const { data: approvalWorkflows = [] } = useQuery({
    queryKey: ["approval-workflows"],
    queryFn: () => getApprovalWorkflows(),
  });

  // Mutations
  const createProductDefMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-types-categories"] });
      toast.success("Product Definition created and saved successfully!");
      setIsDefineProductModalOpen(false);
      resetProductDefForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create product definition"),
  });

  const createItemMutation = useMutation({
    mutationFn: createProductItem,
    onSuccess: (resItem) => {
      queryClient.invalidateQueries({ queryKey: ["product-items"] });
      queryClient.invalidateQueries({ queryKey: ["product-tasks"] });
      if (resItem.status === "pending_approval") {
        toast.success(`Item onboarded & submitted for approval! (Request ID: ${resItem.approval_request_id})`);
      } else {
        toast.success("Item onboarded successfully!");
      }
      setIsOnboardItemModalOpen(false);
      resetItemForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to onboard item"),
  });

  const createTaskMutation = useMutation({
    mutationFn: createProductTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-tasks"] });
      toast.success("Product onboarding task created!");
      setIsTaskModalOpen(false);
      resetTaskForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create task"),
  });

  const deleteProductDefMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-items"] });
      toast.success("Product definition deleted");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteProductItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-items"] });
      toast.success("Onboarded record deleted");
    },
  });

  const resetProductDefForm = () => {
    setDefName("");
    setDefType("Entity Onboarding");
    setIsCustomType(false);
    setCustomTypeInput("");
    setDefCategory("Healthcare");
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setDefRequireApproval(true);
    setDefWorkflowId("default");
    setDefCustomFields([
      {
        id: "f_specialty",
        label: "Medical Specialty / Role",
        type: "select",
        required: true,
        options: ["General Practitioner", "Cardiology", "Neurology", "Pediatrics", "Surgeon"],
      },
      {
        id: "f_license_no",
        label: "Medical License Number",
        type: "text",
        required: true,
        placeholder: "e.g. MD-982341",
      },
    ]);
  };

  const resetItemForm = () => {
    setItemName("");
    setItemTaskId("none");
    setItemCustomValues({});
  };

  const resetTaskForm = () => {
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskQuantity(3);
  };

  const handleCreateProductDef = () => {
    if (!defName.trim()) {
      toast.error("Product name is required (e.g. 'Doctor')");
      return;
    }

    const finalType = isCustomType ? customTypeInput.trim() : defType;
    const finalCategory = isCustomCategory ? customCategoryInput.trim() : defCategory;

    if (!finalType) {
      toast.error("Product Type is required");
      return;
    }
    if (!finalCategory) {
      toast.error("Category is required");
      return;
    }

    createProductDefMutation.mutate({
      name: defName.trim(),
      product_type: finalType,
      category: finalCategory,
      form_schema: defCustomFields,
      approval_settings: {
        require_approval: defRequireApproval,
        workflow_id: defWorkflowId,
      },
    });
  };

  const handleOnboardItemSubmit = () => {
    if (!selectedParentProduct) {
      toast.error("Please select a Product Definition first");
      return;
    }
    if (!itemName.trim()) {
      toast.error("Item name is required (e.g. 'Dr. John Smith')");
      return;
    }

    createItemMutation.mutate({
      product_id: selectedParentProduct.id,
      item_name: itemName.trim(),
      task_id: itemTaskId === "none" ? undefined : itemTaskId,
      custom_fields: itemCustomValues,
    });
  };

  const handleTaskSubmit = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    createTaskMutation.mutate({
      title: newTaskTitle.trim(),
      description: newTaskDesc,
      target_quantity: Number(newTaskQuantity) || 1,
    });
  };

  const openOnboardItemModal = (prod: Product) => {
    setSelectedParentProduct(prod);
    resetItemForm();
    setIsOnboardItemModalOpen(true);
  };

  // Metrics
  const totalProductDefs = products.length;
  const totalItems = productItems.length;
  const pendingApprovalsCount = productItems.filter((i) => i.status === "pending_approval").length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight">
              Products & Entity Onboarding
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Build custom onboarding forms per Product (e.g. Doctor, Vendor), configure dynamic categories & on-submit approvals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTaskModalOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <ListTodo className="h-4 w-4 text-primary" /> Create Onboarding Task
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetProductDefForm();
              setIsDefineProductModalOpen(true);
            }}
            className="gap-1.5 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Define New Product & Custom Form
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-xs bg-card/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Product Definitions
              </p>
              <p className="text-2xl font-bold font-display mt-0.5">{totalProductDefs}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs bg-card/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Onboarded Records
              </p>
              <p className="text-2xl font-bold font-display mt-0.5">{totalItems}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 grid place-items-center text-emerald-500">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs bg-card/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Pending Approvals
              </p>
              <p className="text-2xl font-bold font-display mt-0.5 text-amber-500">{pendingApprovalsCount}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 grid place-items-center text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs bg-card/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Active Onboarding Tasks
              </p>
              <p className="text-2xl font-bold font-display mt-0.5">{tasks.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-500/10 grid place-items-center text-sky-500">
              <ListTodo className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="definitions" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border/50">
          <TabsTrigger value="definitions" className="text-xs gap-1.5 px-3 py-1.5">
            <Package className="h-3.5 w-3.5" /> Product Definitions ({totalProductDefs})
          </TabsTrigger>
          <TabsTrigger value="records" className="text-xs gap-1.5 px-3 py-1.5">
            <UserCheck className="h-3.5 w-3.5" /> Onboarded Records & Approvals ({totalItems})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs gap-1.5 px-3 py-1.5">
            <ListTodo className="h-3.5 w-3.5" /> Onboarding Tasks ({tasks.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Product Definitions */}
        <TabsContent value="definitions" className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card/50">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by name (e.g. Doctor), type, or category..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Dynamic Filter Dropdowns */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <Select value={selectedProductType} onValueChange={setSelectedProductType}>
                <SelectTrigger className="h-9 text-xs min-w-[140px]">
                  <SelectValue placeholder="All Product Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Product Types</SelectItem>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-xs min-w-[130px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={() => {
                  resetProductDefForm();
                  setIsDefineProductModalOpen(true);
                }}
                className="text-xs gap-1.5 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> New Product Definition
              </Button>
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading product definitions...</div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-lg text-muted-foreground space-y-3">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">No product definitions found</p>
              <Button
                size="sm"
                onClick={() => {
                  resetProductDefForm();
                  setIsDefineProductModalOpen(true);
                }}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Define Product "Doctor" or Custom
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const itemCount = productItems.filter((i) => i.product_id === product.id).length;

                return (
                  <Card
                    key={product.id}
                    className="border-border/80 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                              {product.product_type}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono bg-muted/60">
                              {product.category}
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            {product.name === "Doctor" ? (
                              <Stethoscope className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Package className="h-4 w-4 text-primary shrink-0" />
                            )}
                            {product.name}
                          </CardTitle>
                        </div>
                        {product.approval_settings?.require_approval ? (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] gap-1 shrink-0">
                            <ShieldAlert className="h-3 w-3" /> Requires Approval
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] shrink-0">
                            Auto-Approve
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="p-2.5 rounded bg-muted/30 border border-border/40 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Custom Form Fields:</span>
                          <span className="font-semibold text-foreground font-mono">
                            {product.form_schema?.length || 0} fields
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Onboarded Records:</span>
                          <span className="font-semibold text-foreground font-mono">{itemCount} items</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => openOnboardItemModal(product)}
                        className="w-full text-xs gap-1.5 h-8 bg-primary/90 hover:bg-primary text-primary-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" /> Onboard New Record under {product.name}
                      </Button>
                    </CardContent>

                    <div className="p-3 pt-0 flex items-center justify-between border-t border-border/40 mt-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        SKU: {product.sku || "N/A"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteProductDefMutation.mutate(product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Onboarded Records & Approval Submissions */}
        <TabsContent value="records" className="space-y-4">
          {isLoadingItems ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading onboarded records...</div>
          ) : productItems.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-lg text-muted-foreground space-y-3">
              <UserCheck className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">No records onboarded yet</p>
              <p className="text-xs text-muted-foreground">
                Select a Product Definition (e.g. "Doctor") in the first tab to onboard a new record.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productItems.map((item) => (
                <Card key={item.id} className="border-border/80 shadow-xs flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] font-mono bg-muted/60 mb-1">
                          Product: {item.product_name}
                        </Badge>
                        <CardTitle className="text-base font-bold">{item.item_name}</CardTitle>
                      </div>
                      {item.status === "pending_approval" ? (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 shrink-0">
                          <Clock className="h-3 w-3 animate-spin-slow" /> Pending Approval
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Onboarded
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {item.custom_fields && Object.keys(item.custom_fields).length > 0 && (
                      <div className="p-2.5 rounded bg-muted/30 border border-border/40 text-[11px] space-y-1">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          Custom Record Details:
                        </p>
                        {Object.entries(item.custom_fields).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-muted-foreground">
                            <span className="truncate max-w-[120px] capitalize">{k.replace(/^f_/, "")}:</span>
                            <span className="font-medium text-foreground truncate max-w-[140px]">
                              {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <div className="p-3 pt-0 flex items-center justify-between border-t border-border/40 mt-2">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Submitted {new Date(item.created_at || Date.now()).toLocaleDateString()}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Onboarding Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Active Product Onboarding Tasks</h3>
            <Button size="sm" onClick={() => setIsTaskModalOpen(true)} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Task with Target Quantity
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg text-xs text-muted-foreground">
              No product onboarding tasks created yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => {
                const progressPct = Math.min(100, Math.round((task.onboarded_count / task.target_quantity) * 100));
                return (
                  <Card key={task.id} className="border-border/80 shadow-xs">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-bold">{task.title}</CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            task.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                          }
                        >
                          {task.status === "completed" ? "Completed" : "In Progress"}
                        </Badge>
                      </div>
                      {task.description && (
                        <CardDescription className="text-xs mt-1 line-clamp-2">
                          {task.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-muted-foreground">Onboarding Progress</span>
                          <span className="font-mono text-primary">
                            {task.onboarded_count} / {task.target_quantity} Onboarded
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal 1: Define New Product & Custom Form (e.g. Doctor, Vendor) */}
      <Dialog open={isDefineProductModalOpen} onOpenChange={setIsDefineProductModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Define Product & Custom Onboarding Form
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure Product Name (e.g. Doctor), Product Type, Category, Custom Onboarding Form, and Approval Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Product Name *</Label>
              <Input
                value={defName}
                onChange={(e) => setDefName(e.target.value)}
                placeholder="e.g. Doctor, Vendor, Microservice"
                className="h-9 text-xs"
              />
            </div>

            {/* Dynamic & Creatable Product Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Product Type *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-primary p-0 h-auto hover:bg-transparent"
                    onClick={() => setIsCustomType(!isCustomType)}
                  >
                    {isCustomType ? "← Pick Saved Type" : "+ Create Custom Type"}
                  </Button>
                </div>

                {isCustomType ? (
                  <Input
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    placeholder="Type new Product Type name..."
                    className="h-9 text-xs"
                  />
                ) : (
                  <Select value={defType} onValueChange={setDefType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Dynamic & Creatable Category */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Category *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-primary p-0 h-auto hover:bg-transparent"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                  >
                    {isCustomCategory ? "← Pick Saved Category" : "+ Create Custom Category"}
                  </Button>
                </div>

                {isCustomCategory ? (
                  <Input
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Type new Category name..."
                    className="h-9 text-xs"
                  />
                ) : (
                  <Select value={defCategory} onValueChange={setDefCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Approval Settings */}
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4" /> Require Approval on Submit
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    When enabled, onboarding submissions enter approval workflow before marking as onboarded.
                  </p>
                </div>
                <Switch checked={defRequireApproval} onCheckedChange={setDefRequireApproval} />
              </div>

              {defRequireApproval && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold">Select Approval Workflow</Label>
                  <Select value={defWorkflowId} onValueChange={setDefWorkflowId}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select approval workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Manager & Admin Approval</SelectItem>
                      {approvalWorkflows.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id}>
                          {wf.name} ({wf.steps?.length || 1} steps)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Custom Onboarding Form Builder Embed */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                  <Sliders className="h-3.5 w-3.5" /> Customized Form Fields for {defName || "Product"}
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDefCustomFields((prev) => [
                      ...prev,
                      {
                        id: `f_${Date.now()}`,
                        label: "New Field",
                        type: "text",
                        required: false,
                      },
                    ])
                  }
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Custom Field
                </Button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {defCustomFields.map((f, idx) => (
                  <div key={f.id} className="p-2.5 rounded border border-border/70 bg-card/60 flex items-center justify-between gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={f.label}
                        onChange={(e) =>
                          setDefCustomFields((prev) =>
                            prev.map((item) => (item.id === f.id ? { ...item, label: e.target.value } : item))
                          )
                        }
                        className="h-7 text-xs"
                      />
                      <Select
                        value={f.type}
                        onValueChange={(val: FormField["type"]) =>
                          setDefCustomFields((prev) =>
                            prev.map((item) => (item.id === f.id ? { ...item, type: val } : item))
                          )
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="select">Dropdown Select</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setDefCustomFields((prev) => prev.filter((item) => item.id !== f.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDefineProductModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateProductDef} disabled={createProductDefMutation.isPending}>
              {createProductDefMutation.isPending ? "Saving..." : "Save Product Definition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Onboard Record under a Product Definition */}
      <Dialog open={isOnboardItemModalOpen} onOpenChange={setIsOnboardItemModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Onboard Record under {selectedParentProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in custom onboarding attributes configured for <strong>{selectedParentProduct?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Record / Entity Name *</Label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={`e.g. ${selectedParentProduct?.name === "Doctor" ? "Dr. John Smith" : "Entity Name"}`}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assign to Onboarding Task</Label>
              <Select value={itemTaskId} onValueChange={setItemTaskId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select task (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Standalone Onboarding (No Task) --</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} ({t.onboarded_count}/{t.target_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Approval Setting Badge Indicator */}
            {selectedParentProduct?.approval_settings?.require_approval ? (
              <div className="p-2.5 rounded border border-amber-500/30 bg-amber-500/10 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>On submission, this record will enter approval workflow.</span>
              </div>
            ) : (
              <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Auto-approve on submission enabled.</span>
              </div>
            )}

            {/* Render Custom Onboarding Form for this parent product */}
            {selectedParentProduct?.form_schema && selectedParentProduct.form_schema.length > 0 && (
              <div className="p-3 rounded-lg border border-border/70 bg-muted/30 space-y-3">
                <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Customized Form Fields for {selectedParentProduct.name}
                </Label>
                <DynamicFormRenderer
                  schema={{
                    id: selectedParentProduct.id,
                    name: selectedParentProduct.name,
                    schema_type: "onboarding",
                    fields: selectedParentProduct.form_schema,
                  }}
                  values={itemCustomValues}
                  onChange={(k, v) => setItemCustomValues((prev) => ({ ...prev, [k]: v }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsOnboardItemModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleOnboardItemSubmit} disabled={createItemMutation.isPending}>
              {createItemMutation.isPending ? "Submitting..." : "Submit Onboarding Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Create Onboarding Task */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" /> Create Product Onboarding Task
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign a task specifying target quantity of products/records to onboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Title *</Label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Onboard 10 Doctors for Regional Clinic"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Product Onboarding Quantity *</Label>
              <Input
                type="number"
                min={1}
                value={newTaskQuantity}
                onChange={(e) => setNewTaskQuantity(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Scope & Description</Label>
              <Input
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Optional details..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleTaskSubmit} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
