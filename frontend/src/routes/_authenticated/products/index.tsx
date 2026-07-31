import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  ListTodo,
  ShieldAlert,
  UserCheck,
  Stethoscope,
  Sliders,
  Eye,
  Info,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  getProductTypesAndCategories,
  createProduct,
  deleteProduct,
  createProductItem,
  deleteProductItem,
  createProductTask,
  Product,
  ProductItem,
  FormField,
} from "@/lib/products.functions";
import { DynamicFormRenderer } from "@/components/products/dynamic-form-renderer";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products/")({
  component: ProductsDashboardPage,
});

function ProductsDashboardPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Side Drawers State
  const [isDefineProductDrawerOpen, setIsDefineProductDrawerOpen] = useState(false);
  const [isOnboardItemDrawerOpen, setIsOnboardItemDrawerOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<ProductItem | null>(null);

  // Selected parent product for onboarding
  const [selectedParentProduct, setSelectedParentProduct] = useState<Product | null>(null);

  // Form State: Define Product
  const [defName, setDefName] = useState("");
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

  // Form State: Onboard Item
  const [itemName, setItemName] = useState("");
  const [itemTaskId, setItemTaskId] = useState<string>("none");
  const [itemCustomValues, setItemCustomValues] = useState<Record<string, any>>({});

  // Form State: Task
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
      setIsDefineProductDrawerOpen(false);
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
        toast.success(`Item onboarded & submitted for approval! (ID: ${resItem.approval_request_id})`);
      } else {
        toast.success("Item onboarded successfully!");
      }
      setIsOnboardItemDrawerOpen(false);
      resetItemForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to onboard item"),
  });

  const createTaskMutation = useMutation({
    mutationFn: createProductTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-tasks"] });
      toast.success("Product onboarding task created!");
      setIsTaskDrawerOpen(false);
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

    if (!finalType || !finalCategory) {
      toast.error("Product Type and Category are required");
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

  const openOnboardItemDrawer = (prod: Product) => {
    setSelectedParentProduct(prod);
    resetItemForm();
    setIsOnboardItemDrawerOpen(true);
  };

  const totalProductDefs = products.length;
  const totalItems = productItems.length;
  const pendingApprovalsCount = productItems.filter((i) => i.status === "pending_approval").length;

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        {/* Header with Icon Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
                Products & Entity Onboarding
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dynamic onboarding schemas, tabular data views, and real-time approval status routing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTaskDrawerOpen(true)}
                  className="gap-1.5 text-xs h-9"
                >
                  <ListTodo className="h-4 w-4 text-primary" /> Create Task Goal
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Set onboarding target quantity goals</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    resetProductDefForm();
                    setIsDefineProductDrawerOpen(true);
                  }}
                  className="gap-1.5 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Define Product Form
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Create new product definition with custom form schema</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tabular Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border/70 shadow-xs bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Product Definitions
                </p>
                <p className="text-2xl font-bold font-display mt-0.5">{totalProductDefs}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary border border-primary/20">
                <Package className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-xs bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Onboarded Records
                </p>
                <p className="text-2xl font-bold font-display mt-0.5">{totalItems}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 grid place-items-center text-emerald-500 border border-emerald-500/20">
                <UserCheck className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-xs bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Pending Approvals
                </p>
                <p className="text-2xl font-bold font-display mt-0.5 text-amber-500">{pendingApprovalsCount}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 grid place-items-center text-amber-500 border border-amber-500/20">
                <Clock className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-xs bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Onboarding Tasks
                </p>
                <p className="text-2xl font-bold font-display mt-0.5">{tasks.length}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-sky-500/10 grid place-items-center text-sky-500 border border-sky-500/20">
                <ListTodo className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Surface */}
        <Tabs defaultValue="records" className="space-y-4">
          <TabsList className="bg-muted/60 p-1 border border-border/50">
            <TabsTrigger value="records" className="text-xs gap-1.5 px-3 py-1.5">
              <UserCheck className="h-3.5 w-3.5" /> Records & Approvals ({totalItems})
            </TabsTrigger>
            <TabsTrigger value="definitions" className="text-xs gap-1.5 px-3 py-1.5">
              <Package className="h-3.5 w-3.5" /> Product Definitions ({totalProductDefs})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1.5 px-3 py-1.5">
              <ListTodo className="h-3.5 w-3.5" /> Tasks ({tasks.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Tabular Onboarded Records */}
          <TabsContent value="records" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-xs">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter records by name (e.g. Dr. Sarah Connor)..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[11px] font-mono bg-muted/50 py-1">
                  {productItems.length} Total Records
                </Badge>
              </div>
            </div>

            {isLoadingItems ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono">Loading tabular records...</div>
            ) : productItems.length === 0 ? (
              <div className="p-12 text-center border border-dashed rounded-xl text-muted-foreground space-y-3 bg-card/20">
                <UserCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No records onboarded yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click on "Product Definitions" tab and click the Onboard icon button under any template to add records.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60 shadow-xs">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Record / Entity Name</TableHead>
                      <TableHead className="text-xs font-semibold">Product Template</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Custom Attributes</TableHead>
                      <TableHead className="text-xs font-semibold">Submission Date</TableHead>
                      <TableHead className="text-xs font-semibold text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-xs py-3">
                          <div className="flex items-center gap-2">
                            {item.product_name === "Doctor" ? (
                              <Stethoscope className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-primary shrink-0" />
                            )}
                            {item.item_name}
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                            {item.product_name || "Product"}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3">
                          {item.status === "pending_approval" ? (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1">
                              <Clock className="h-3 w-3 animate-spin-slow" /> Pending Approval
                            </Badge>
                          ) : item.status === "rejected" ? (
                            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]">
                              Rejected
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Onboarded
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="py-3">
                          {item.custom_fields && Object.keys(item.custom_fields).length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {Object.entries(item.custom_fields)
                                .slice(0, 2)
                                .map(([k, v]) => (
                                  <Badge key={k} variant="secondary" className="text-[10px] font-mono">
                                    {k.replace(/^f_/, "")}: {String(v)}
                                  </Badge>
                                ))}
                              {Object.keys(item.custom_fields).length > 2 && (
                                <Badge variant="outline" className="text-[9px] font-mono">
                                  +{Object.keys(item.custom_fields).length - 2} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Standard</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs font-mono text-muted-foreground py-3">
                          {new Date(item.created_at || Date.now()).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-right py-3 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-primary hover:bg-primary/10"
                                  onClick={() => setSelectedRecordDetail(item)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">View Full Attributes Side Drawer</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteItemMutation.mutate(item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Delete Record</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Tabular Product Definitions */}
          <TabsContent value="definitions" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-xs">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search product definitions..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
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
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono">Loading product templates...</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center border border-dashed rounded-xl text-muted-foreground space-y-3 bg-card/20">
                <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No product definitions found</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60 shadow-xs">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Template Name</TableHead>
                      <TableHead className="text-xs font-semibold">Type & Category</TableHead>
                      <TableHead className="text-xs font-semibold">Form Schema</TableHead>
                      <TableHead className="text-xs font-semibold">Approval Routing</TableHead>
                      <TableHead className="text-xs font-semibold">Onboarded Count</TableHead>
                      <TableHead className="text-xs font-semibold text-right pr-4">Quick Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const itemCount = productItems.filter((i) => i.product_id === product.id).length;
                      return (
                        <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-bold text-xs py-3">
                            <div className="flex items-center gap-2">
                              {product.name === "Doctor" ? (
                                <Stethoscope className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Package className="h-4.5 w-4.5 text-primary shrink-0" />
                              )}
                              <div>
                                <span className="text-sm">{product.name}</span>
                                <p className="text-[10px] font-mono text-muted-foreground">SKU: {product.sku || "N/A"}</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                                {product.product_type}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] font-mono bg-muted/50">
                                {product.category}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs py-3 font-mono">
                            <span className="font-semibold text-primary">{product.form_schema?.length || 0}</span> fields
                          </TableCell>

                          <TableCell className="py-3">
                            {product.approval_settings?.require_approval ? (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1">
                                <ShieldAlert className="h-3 w-3" /> Approval Required
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                Auto-Approve
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs font-semibold">
                            {itemCount} records
                          </TableCell>

                          <TableCell className="text-right py-3 pr-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => openOnboardItemDrawer(product)}
                                    className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    <Plus className="h-3.5 w-3.5" /> Onboard
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Open Onboard Record Drawer for {product.name}</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteProductDefMutation.mutate(product.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete Template</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Tabular Onboarding Tasks */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/40">
              <h3 className="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider">
                Active Onboarding Target Goals
              </h3>
              <Button size="sm" onClick={() => setIsTaskDrawerOpen(true)} className="text-xs gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" /> Create Goal Task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl text-xs text-muted-foreground bg-card/20">
                No product onboarding tasks created yet.
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60 shadow-xs">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Task Title</TableHead>
                      <TableHead className="text-xs font-semibold">Target vs Onboarded</TableHead>
                      <TableHead className="text-xs font-semibold">Progress Bar</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const progressPct = Math.min(100, Math.round((task.onboarded_count / task.target_quantity) * 100));
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-semibold text-xs py-3">
                            <p>{task.title}</p>
                            {task.description && (
                              <p className="text-[11px] text-muted-foreground font-normal line-clamp-1">{task.description}</p>
                            )}
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs">
                            <span className="font-bold text-primary">{task.onboarded_count}</span> / {task.target_quantity} Onboarded
                          </TableCell>

                          <TableCell className="py-3 w-48">
                            <div className="space-y-1">
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{progressPct}% completed</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={
                                task.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                              }
                            >
                              {task.status === "completed" ? "Completed Goal" : "In Progress"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* DRAWER 1: Define New Product & Custom Form (Slide-over Sheet) */}
        <Sheet open={isDefineProductDrawerOpen} onOpenChange={setIsDefineProductDrawerOpen}>
          <SheetContent side="right" className="sm:max-w-xl overflow-y-auto p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <Package className="h-4.5 w-4.5 text-primary" /> Define Product & Custom Onboarding Form
              </SheetTitle>
              <SheetDescription className="text-xs">
                Configure Product Name (e.g. Doctor), Product Type, Category, Custom Onboarding Form, and Approval Settings.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
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
                      {isCustomType ? "← Pick Saved Type" : "+ Custom Type"}
                    </Button>
                  </div>

                  {isCustomType ? (
                    <Input
                      value={customTypeInput}
                      onChange={(e) => setCustomTypeInput(e.target.value)}
                      placeholder="Type new Product Type..."
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
                      {isCustomCategory ? "← Pick Category" : "+ Custom Category"}
                    </Button>
                  </div>

                  {isCustomCategory ? (
                    <Input
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Type new Category..."
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
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="h-4 w-4" /> Require Approval on Submit
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Submissions enter approval workflow before status transitions to onboarded.
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

                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {defCustomFields.map((f) => (
                    <div key={f.id} className="p-2.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between gap-2">
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

            <SheetFooter className="pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setIsDefineProductDrawerOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateProductDef} disabled={createProductDefMutation.isPending}>
                {createProductDefMutation.isPending ? "Saving..." : "Save Product Template"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* DRAWER 2: Onboard Record under a Product Definition (Slide-over Sheet) */}
        <Sheet open={isOnboardItemDrawerOpen} onOpenChange={setIsOnboardItemDrawerOpen}>
          <SheetContent side="right" className="sm:max-w-xl overflow-y-auto p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-primary" /> Onboard Record under {selectedParentProduct?.name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Fill in custom onboarding attributes configured for <strong>{selectedParentProduct?.name}</strong>.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Record / Entity Name *</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={`e.g. ${selectedParentProduct?.name === "Doctor" ? "Dr. Sarah Connor" : "Entity Name"}`}
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
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>On submission, this record will enter the approval workflow.</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Auto-approve on submission enabled.</span>
                </div>
              )}

              {/* Render Custom Onboarding Form for this parent product */}
              {selectedParentProduct?.form_schema && selectedParentProduct.form_schema.length > 0 && (
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 space-y-3">
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

            <SheetFooter className="pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setIsOnboardItemDrawerOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleOnboardItemSubmit} disabled={createItemMutation.isPending}>
                {createItemMutation.isPending ? "Submitting..." : "Submit Onboarding Record"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* DRAWER 3: Create Onboarding Task (Slide-over Sheet) */}
        <Sheet open={isTaskDrawerOpen} onOpenChange={setIsTaskDrawerOpen}>
          <SheetContent side="right" className="sm:max-w-md p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <ListTodo className="h-4.5 w-4.5 text-primary" /> Create Product Onboarding Task
              </SheetTitle>
              <SheetDescription className="text-xs">
                Assign a task specifying target quantity of products/records to onboard.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Task Title *</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Onboard 5 Regional Clinic Doctors"
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
                  placeholder="Optional task scope notes..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <SheetFooter className="pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setIsTaskDrawerOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleTaskSubmit} disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* DRAWER 4: Record Attributes Full Details Side Drawer */}
        <Sheet open={Boolean(selectedRecordDetail)} onOpenChange={(open) => !open && setSelectedRecordDetail(null)}>
          <SheetContent side="right" className="sm:max-w-md p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="h-4.5 w-4.5 text-primary" /> Record Details: {selectedRecordDetail?.item_name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Full attribute details for onboarded record under template <strong>{selectedRecordDetail?.product_name}</strong>.
              </SheetDescription>
            </SheetHeader>

            {selectedRecordDetail && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    {selectedRecordDetail.status === "pending_approval" ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                        Pending Approval
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        Onboarded
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Submitted By:</span>
                    <span className="font-mono">{selectedRecordDetail.created_by || "System"}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Submission Date:</span>
                    <span className="font-mono">
                      {new Date(selectedRecordDetail.created_at || Date.now()).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Custom Fields Breakdown:
                  </Label>
                  <div className="rounded-xl border border-border/70 divide-y divide-border/40 overflow-hidden bg-card/60">
                    {selectedRecordDetail.custom_fields && Object.keys(selectedRecordDetail.custom_fields).length > 0 ? (
                      Object.entries(selectedRecordDetail.custom_fields).map(([k, v]) => (
                        <div key={k} className="p-3 flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground capitalize">{k.replace(/^f_/, "")}:</span>
                          <span className="font-bold font-mono text-foreground">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">No custom fields defined</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
