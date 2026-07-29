import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  Unlock,
  Users,
  CheckSquare,
  TrendingUp,
  GitBranch,
  Network,
  Search,
  Sparkles,
  RotateCcw,
  Save,
  UserCheck,
  Info,
  Sliders,
  Layers,
  Shield,
  HelpCircle,
  UserPlus,
  CheckCircle2,
  Filter,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateAuditPdfReport, type Team } from "@/lib/audit-pdf-generator";

export type CRUD = "create" | "read" | "update" | "delete";

export interface ModulePermission {
  id: string;
  name: string;
  category: "Tasks & Execution" | "Team & Governance" | "Performance & Metrics" | "Org & Positions";
  iconName: string;
  description: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type RoleMatrixMap = Record<
  string,
  Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>
>;

export const DEFAULT_MODULES: Omit<ModulePermission, "create" | "read" | "update" | "delete">[] = [
  {
    id: "tasks",
    name: "Tasks & Items",
    category: "Tasks & Execution",
    iconName: "CheckSquare",
    description: "Manage individual tasks, assignees, priorities, and status updates.",
  },
  {
    id: "epics_sprints",
    name: "Epics & Sprints",
    category: "Tasks & Execution",
    iconName: "Layers",
    description: "Plan milestone epics, sprint cycles, and story points allocation.",
  },
  {
    id: "teams",
    name: "Teams & Members",
    category: "Team & Governance",
    iconName: "Users",
    description: "Team roster management, member onboarding, and leadership roles.",
  },
  {
    id: "governance",
    name: "Power Delegation & Rules",
    category: "Team & Governance",
    iconName: "ShieldCheck",
    description: "Super-admin power delegation and governance security rules.",
  },
  {
    id: "approvals",
    name: "Approval Flows",
    category: "Team & Governance",
    iconName: "GitBranch",
    description: "Multi-stage sign-off workflows and approval delegation.",
  },
  {
    id: "metrics",
    name: "Metrics & Performance",
    category: "Performance & Metrics",
    iconName: "TrendingUp",
    description: "KPI tracking, performance scoring, and metric definition.",
  },
  {
    id: "positions",
    name: "Positions & Org Chart",
    category: "Org & Positions",
    iconName: "Network",
    description: "Organization hierarchy, salary bands, and official job titles.",
  },
];

// Baseline defaults for global roles
export const DEFAULT_ROLE_MATRIX: RoleMatrixMap = {
  super_admin: {
    tasks: { create: true, read: true, update: true, delete: true },
    epics_sprints: { create: true, read: true, update: true, delete: true },
    teams: { create: true, read: true, update: true, delete: true },
    governance: { create: true, read: true, update: true, delete: true },
    approvals: { create: true, read: true, update: true, delete: true },
    metrics: { create: true, read: true, update: true, delete: true },
    positions: { create: true, read: true, update: true, delete: true },
  },
  manager: {
    tasks: { create: true, read: true, update: true, delete: true },
    epics_sprints: { create: true, read: true, update: true, delete: false },
    teams: { create: true, read: true, update: true, delete: false },
    governance: { create: false, read: true, update: false, delete: false },
    approvals: { create: true, read: true, update: true, delete: false },
    metrics: { create: true, read: true, update: true, delete: false },
    positions: { create: false, read: true, update: true, delete: false },
  },
  lead: {
    tasks: { create: true, read: true, update: true, delete: false },
    epics_sprints: { create: true, read: true, update: true, delete: false },
    teams: { create: false, read: true, update: true, delete: false },
    governance: { create: false, read: false, update: false, delete: false },
    approvals: { create: true, read: true, update: false, delete: false },
    metrics: { create: true, read: true, update: false, delete: false },
    positions: { create: false, read: true, update: false, delete: false },
  },
  reviewer: {
    tasks: { create: false, read: true, update: true, delete: false },
    epics_sprints: { create: false, read: true, update: false, delete: false },
    teams: { create: false, read: true, update: false, delete: false },
    governance: { create: false, read: false, update: false, delete: false },
    approvals: { create: false, read: true, update: true, delete: false },
    metrics: { create: false, read: true, update: false, delete: false },
    positions: { create: false, read: true, update: false, delete: false },
  },
  member: {
    tasks: { create: true, read: true, update: true, delete: false },
    epics_sprints: { create: false, read: true, update: false, delete: false },
    teams: { create: false, read: true, update: false, delete: false },
    governance: { create: false, read: false, update: false, delete: false },
    approvals: { create: true, read: true, update: false, delete: false },
    metrics: { create: false, read: true, update: false, delete: false },
    positions: { create: false, read: true, update: false, delete: false },
  },
};

interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
  roles?: string[];
}

interface RolePermissionMatrixProps {
  users?: UserOption[];
  teams?: Team[];
}

export function RolePermissionMatrix({ users = [], teams = [] }: RolePermissionMatrixProps) {
  // Store matrix state in localStorage key for persistence across sessions
  const STORAGE_KEY = "momentum_role_permission_matrix_v2";

  const [matrix, setMatrix] = useState<RoleMatrixMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_ROLE_MATRIX;
  });

  // Individual Manager overrides
  const MANAGER_OVERRIDES_KEY = "momentum_manager_permission_overrides_v1";
  const [managerOverrides, setManagerOverrides] = useState<
    Record<
      string,
      Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>
    >
  >(() => {
    try {
      const saved = localStorage.getItem(MANAGER_OVERRIDES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  // Bulk Action State
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedBulkPreset, setSelectedBulkPreset] = useState<
    "full" | "standard" | "restricted" | "auditor"
  >("standard");
  const [selectedBulkManagerIds, setSelectedBulkManagerIds] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState("");

  const [selectedTargetType, setSelectedTargetType] = useState<"role" | "manager">("role");
  const [selectedRole, setSelectedRole] = useState<string>("manager");
  const [selectedManagerId, setSelectedManagerId] = useState<string>(() => {
    return users.find((u) => u.roles?.includes("manager"))?.id ?? users[0]?.id ?? "";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [auditLogs, setAuditLogs] = useState<
    { id: string; timestamp: string; actor: string; action: string; target: string }[]
  >([
    {
      id: "log-1",
      timestamp: "Just now",
      actor: "Super Admin",
      action: "Initialized CRUD Governance Baseline",
      target: "Team Manager Matrix",
    },
    {
      id: "log-2",
      timestamp: "10m ago",
      actor: "Super Admin",
      action: "Granted Task Delete privilege",
      target: "Team Managers",
    },
  ]);

  // Team managers list
  const teamManagers = useMemo(() => {
    return users.filter(
      (u) =>
        u.roles?.includes("manager") ||
        u.roles?.includes("lead") ||
        u.full_name?.toLowerCase().includes("manager") ||
        true, // Show all available team members so super admin can assign manager CRUD
    );
  }, [users]);

  // Filter managers in bulk dialog
  const filteredBulkManagers = useMemo(() => {
    return teamManagers.filter((mgr) => {
      const q = bulkSearch.toLowerCase();
      return (
        (mgr.full_name?.toLowerCase().includes(q) ?? false) ||
        (mgr.email?.toLowerCase().includes(q) ?? false) ||
        mgr.id.toLowerCase().includes(q)
      );
    });
  }, [teamManagers, bulkSearch]);

  const handleSelectAllBulk = () => {
    setSelectedBulkManagerIds(filteredBulkManagers.map((m) => m.id));
  };

  const handleDeselectAllBulk = () => {
    setSelectedBulkManagerIds([]);
  };

  const toggleBulkManager = (id: string) => {
    setSelectedBulkManagerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleApplyBulkPermissions = () => {
    if (selectedBulkManagerIds.length === 0) {
      toast.error("Please select at least one team manager.");
      return;
    }

    let presetMatrix: Record<
      string,
      { create: boolean; read: boolean; update: boolean; delete: boolean }
    > = {};
    if (selectedBulkPreset === "full") {
      DEFAULT_MODULES.forEach((m) => {
        presetMatrix[m.id] = { create: true, read: true, update: true, delete: true };
      });
    } else if (selectedBulkPreset === "standard") {
      presetMatrix = {
        tasks: { create: true, read: true, update: true, delete: true },
        epics_sprints: { create: true, read: true, update: true, delete: false },
        teams: { create: true, read: true, update: true, delete: false },
        governance: { create: false, read: true, update: false, delete: false },
        approvals: { create: true, read: true, update: true, delete: false },
        metrics: { create: true, read: true, update: true, delete: false },
        positions: { create: false, read: true, update: true, delete: false },
      };
    } else if (selectedBulkPreset === "restricted") {
      presetMatrix = {
        tasks: { create: true, read: true, update: true, delete: false },
        epics_sprints: { create: false, read: true, update: false, delete: false },
        teams: { create: false, read: true, update: false, delete: false },
        governance: { create: false, read: false, update: false, delete: false },
        approvals: { create: true, read: true, update: false, delete: false },
        metrics: { create: false, read: true, update: false, delete: false },
        positions: { create: false, read: true, update: false, delete: false },
      };
    } else if (selectedBulkPreset === "auditor") {
      DEFAULT_MODULES.forEach((m) => {
        presetMatrix[m.id] = { create: false, read: true, update: false, delete: false };
      });
    }

    const updatedOverrides = { ...managerOverrides };
    selectedBulkManagerIds.forEach((mgrId) => {
      updatedOverrides[mgrId] = presetMatrix;
    });

    setManagerOverrides(updatedOverrides);
    try {
      localStorage.setItem(MANAGER_OVERRIDES_KEY, JSON.stringify(updatedOverrides));
    } catch {
      // ignore
    }

    const presetNames: Record<string, string> = {
      full: "Full CRUD (100%)",
      standard: "Standard Manager",
      restricted: "Restricted Access",
      auditor: "Read-Only Auditor",
    };

    toast.success(
      `Successfully applied ${presetNames[selectedBulkPreset]} permission set to ${selectedBulkManagerIds.length} manager(s)!`,
    );

    setAuditLogs((prev) => [
      {
        id: "log-" + Date.now(),
        timestamp: "Just now",
        actor: "Super Admin",
        action: `Bulk Applied ${presetNames[selectedBulkPreset]}`,
        target: `${selectedBulkManagerIds.length} Team Managers`,
      },
      ...prev,
    ]);

    setBulkOpen(false);
  };

  // Current active permission state for the selected target
  const activePermissions = useMemo(() => {
    if (selectedTargetType === "role") {
      return matrix[selectedRole] ?? DEFAULT_ROLE_MATRIX.manager;
    } else {
      // If manager has specific override, return that; else fallback to manager baseline
      return managerOverrides[selectedManagerId] ?? matrix.manager ?? DEFAULT_ROLE_MATRIX.manager;
    }
  }, [selectedTargetType, selectedRole, selectedManagerId, matrix, managerOverrides]);

  // Handle cell toggle
  const handleToggle = (moduleId: string, crud: CRUD) => {
    const current = activePermissions[moduleId] ?? {
      create: false,
      read: false,
      update: false,
      delete: false,
    };
    const updatedModule = { ...current, [crud]: !current[crud] };

    if (selectedTargetType === "role") {
      const updatedMatrix = {
        ...matrix,
        [selectedRole]: {
          ...(matrix[selectedRole] ?? {}),
          [moduleId]: updatedModule,
        },
      };
      setMatrix(updatedMatrix);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMatrix));
      } catch {
        // ignore
      }
    } else {
      const updatedOverrides = {
        ...managerOverrides,
        [selectedManagerId]: {
          ...(managerOverrides[selectedManagerId] ?? matrix.manager ?? {}),
          [moduleId]: updatedModule,
        },
      };
      setManagerOverrides(updatedOverrides);
      try {
        localStorage.setItem(MANAGER_OVERRIDES_KEY, JSON.stringify(updatedOverrides));
      } catch {
        // ignore
      }
    }
  };

  // Toggle whole column (Create, Read, Update, Delete)
  const handleColumnToggle = (crud: CRUD, enable: boolean) => {
    const newModuleMap: Record<
      string,
      { create: boolean; read: boolean; update: boolean; delete: boolean }
    > = {};
    DEFAULT_MODULES.forEach((mod) => {
      const curr = activePermissions[mod.id] ?? {
        create: false,
        read: false,
        update: false,
        delete: false,
      };
      newModuleMap[mod.id] = { ...curr, [crud]: enable };
    });

    if (selectedTargetType === "role") {
      const updated = { ...matrix, [selectedRole]: newModuleMap };
      setMatrix(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      const updated = { ...managerOverrides, [selectedManagerId]: newModuleMap };
      setManagerOverrides(updated);
      localStorage.setItem(MANAGER_OVERRIDES_KEY, JSON.stringify(updated));
    }
    toast.success(`Set ${crud.toUpperCase()} = ${enable ? "ON" : "OFF"} for all modules.`);
  };

  // Toggle whole module (Row)
  const handleRowPreset = (moduleId: string, mode: "all" | "read" | "clear") => {
    let rowVal = { create: false, read: false, update: false, delete: false };
    if (mode === "all") rowVal = { create: true, read: true, update: true, delete: true };
    if (mode === "read") rowVal = { create: false, read: true, update: false, delete: false };

    if (selectedTargetType === "role") {
      const updated = {
        ...matrix,
        [selectedRole]: {
          ...(matrix[selectedRole] ?? {}),
          [moduleId]: rowVal,
        },
      };
      setMatrix(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      const updated = {
        ...managerOverrides,
        [selectedManagerId]: {
          ...(managerOverrides[selectedManagerId] ?? {}),
          [moduleId]: rowVal,
        },
      };
      setManagerOverrides(updated);
      localStorage.setItem(MANAGER_OVERRIDES_KEY, JSON.stringify(updated));
    }
  };

  // Apply Global Preset
  const applyPreset = (preset: "full" | "standard" | "restricted" | "auditor") => {
    let presetMatrix: Record<
      string,
      { create: boolean; read: boolean; update: boolean; delete: boolean }
    > = {};

    if (preset === "full") {
      DEFAULT_MODULES.forEach((m) => {
        presetMatrix[m.id] = { create: true, read: true, update: true, delete: true };
      });
    } else if (preset === "standard") {
      presetMatrix = {
        tasks: { create: true, read: true, update: true, delete: true },
        epics_sprints: { create: true, read: true, update: true, delete: false },
        teams: { create: true, read: true, update: true, delete: false },
        governance: { create: false, read: true, update: false, delete: false },
        approvals: { create: true, read: true, update: true, delete: false },
        metrics: { create: true, read: true, update: true, delete: false },
        positions: { create: false, read: true, update: true, delete: false },
      };
    } else if (preset === "restricted") {
      presetMatrix = {
        tasks: { create: true, read: true, update: true, delete: false },
        epics_sprints: { create: false, read: true, update: false, delete: false },
        teams: { create: false, read: true, update: false, delete: false },
        governance: { create: false, read: false, update: false, delete: false },
        approvals: { create: true, read: true, update: false, delete: false },
        metrics: { create: false, read: true, update: false, delete: false },
        positions: { create: false, read: true, update: false, delete: false },
      };
    } else if (preset === "auditor") {
      DEFAULT_MODULES.forEach((m) => {
        presetMatrix[m.id] = { create: false, read: true, update: false, delete: false };
      });
    }

    if (selectedTargetType === "role") {
      const updated = { ...matrix, [selectedRole]: presetMatrix };
      setMatrix(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      const updated = { ...managerOverrides, [selectedManagerId]: presetMatrix };
      setManagerOverrides(updated);
      localStorage.setItem(MANAGER_OVERRIDES_KEY, JSON.stringify(updated));
    }

    const name = selectedTargetType === "role" ? selectedRole : "Manager Override";
    toast.success(`Applied ${preset.toUpperCase()} preset to ${name}`);

    setAuditLogs((prev) => [
      {
        id: "log-" + Date.now(),
        timestamp: "Just now",
        actor: "Super Admin",
        action: `Applied ${preset} preset`,
        target:
          selectedTargetType === "role"
            ? `Role: ${selectedRole}`
            : `Manager ID: ${selectedManagerId}`,
      },
      ...prev,
    ]);
  };

  // Reset to default
  const handleResetDefaults = () => {
    setMatrix(DEFAULT_ROLE_MATRIX);
    setManagerOverrides({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MANAGER_OVERRIDES_KEY);
    toast.success("Reset all matrix permissions to default governance schema.");
  };

  // Save explicitly
  const handleSaveMatrix = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
      localStorage.setItem(MANAGER_OVERRIDES_KEY, JSON.stringify(managerOverrides));
      toast.success("Role & Manager CRUD Permission Matrix saved successfully!");

      const activeTargetName =
        selectedTargetType === "role"
          ? `Role: ${selectedRole.toUpperCase()}`
          : `Manager: ${users.find((u) => u.id === selectedManagerId)?.full_name ?? selectedManagerId}`;

      setAuditLogs((prev) => [
        {
          id: "log-" + Date.now(),
          timestamp: "Just now",
          actor: "Super Admin",
          action: "Saved Matrix Privileges",
          target: activeTargetName,
        },
        ...prev,
      ]);
    } catch {
      toast.error("Failed to persist permission matrix.");
    }
  };

  // Export PDF Report
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      generateAuditPdfReport({
        matrix,
        managerOverrides,
        users,
        teams,
        auditLogs,
        modules: DEFAULT_MODULES,
      });

      toast.success("Governance Audit PDF Report generated and downloaded!");

      setAuditLogs((prev) => [
        {
          id: "log-" + Date.now(),
          timestamp: "Just now",
          actor: "Super Admin",
          action: "Exported Audit PDF Report",
          target: "Full Governance Matrix & Roster",
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to generate audit PDF report.");
    } finally {
      setIsExporting(false);
    }
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    return DEFAULT_MODULES.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  // Statistics
  const totalPrivileges = DEFAULT_MODULES.length * 4;
  const grantedPrivileges = useMemo(() => {
    let count = 0;
    DEFAULT_MODULES.forEach((m) => {
      const p = activePermissions[m.id];
      if (p?.create) count++;
      if (p?.read) count++;
      if (p?.update) count++;
      if (p?.delete) count++;
    });
    return count;
  }, [activePermissions]);

  const percentage = Math.round((grantedPrivileges / totalPrivileges) * 100);

  const getBadgeVariant = (pct: number) => {
    if (pct >= 85)
      return {
        label: "Full CRUD Access",
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      };
    if (pct >= 50)
      return { label: "Standard Access", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    if (pct >= 25)
      return {
        label: "Restricted Access",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      };
    return { label: "Minimal Access", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
  };

  const currentBadge = getBadgeVariant(percentage);

  const activeManagerObj = users.find((u) => u.id === selectedManagerId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Toggle */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary font-mono text-[10px] uppercase"
              >
                Super-Admin Control
              </Badge>
              <Badge variant="outline" className={`font-medium text-xs ${currentBadge.color}`}>
                {currentBadge.label} ({percentage}%)
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" /> Visual Role Permission Matrix
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Grant granular Create, Read, Update, and Delete (CRUD) privileges across modules for
              global roles or assign customized permission overrides directly to individual Team
              Managers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="gap-1.5 text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedBulkManagerIds.length === 0) {
                  setSelectedBulkManagerIds(teamManagers.map((m) => m.id));
                }
                setBulkOpen(true);
              }}
              className="gap-1.5 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 font-medium"
            >
              <Users className="h-3.5 w-3.5" /> Bulk Apply to Managers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Matrix
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMatrix}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </div>

        {/* Target Switcher Panel */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target Type
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              <button
                type="button"
                onClick={() => setSelectedTargetType("role")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedTargetType === "role"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Global Role
              </button>
              <button
                type="button"
                onClick={() => setSelectedTargetType("manager")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedTargetType === "manager"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Team Manager
              </button>
            </div>
          </div>

          {selectedTargetType === "role" ? (
            <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Select Global Role
              </Label>
              <div className="mt-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">👑 Super Admin (Full Control)</SelectItem>
                    <SelectItem value="manager">🛡️ Team Manager</SelectItem>
                    <SelectItem value="lead">🚀 Team Lead</SelectItem>
                    <SelectItem value="reviewer">🔍 Reviewer</SelectItem>
                    <SelectItem value="member">👤 Standard Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Select Specific Team Manager
              </Label>
              <div className="mt-2">
                <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamManagers.map((mgr) => (
                      <SelectItem key={mgr.id} value={mgr.id}>
                        👤 {mgr.full_name || mgr.email}{" "}
                        {mgr.roles?.includes("manager") ? "(Manager)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Quick Stats Box */}
          <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Active Privileges</span>
              <span className="font-mono text-xs text-foreground font-bold">
                {grantedPrivileges} / {totalPrivileges}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {percentage}% of system actions permitted
            </p>
          </div>

          {/* Presets Box */}
          <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Apply Preset
            </Label>
            <div className="mt-2 flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => applyPreset("full")}
              >
                Full CRUD
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => applyPreset("standard")}
              >
                Standard Manager
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => applyPreset("restricted")}
              >
                Restricted
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => applyPreset("auditor")}
              >
                Auditor
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Indicator Alert */}
      {selectedTargetType === "manager" && activeManagerObj && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Configuring custom manager CRUD overrides for{" "}
              <strong>{activeManagerObj.full_name || activeManagerObj.email}</strong> (
              {activeManagerObj.email}). These permissions override the default role rules.
            </span>
          </div>
          <Badge
            variant="outline"
            className="bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px]"
          >
            Manager Override Active
          </Badge>
        </div>
      )}

      {/* Filter and Bulk Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search module or privilege..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Tasks & Execution">Tasks & Execution</SelectItem>
              <SelectItem value="Team & Governance">Team & Governance</SelectItem>
              <SelectItem value="Performance & Metrics">Performance & Metrics</SelectItem>
              <SelectItem value="Org & Positions">Org & Positions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Global CRUD Toggles */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground mr-1 text-[11px] font-medium uppercase tracking-wider">
            Bulk Enable:
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] hover:bg-emerald-500/10 hover:text-emerald-600"
            onClick={() => handleColumnToggle("create", true)}
          >
            + Create
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] hover:bg-blue-500/10 hover:text-blue-600"
            onClick={() => handleColumnToggle("read", true)}
          >
            + Read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] hover:bg-amber-500/10 hover:text-amber-600"
            onClick={() => handleColumnToggle("update", true)}
          >
            + Update
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] hover:bg-rose-500/10 hover:text-rose-600"
            onClick={() => handleColumnToggle("delete", true)}
          >
            + Delete
          </Button>
        </div>
      </div>

      {/* CRUD Permission Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
              <th className="p-3.5 pl-4 w-72">Module / Capability</th>
              <th className="p-3.5 text-center w-28">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    CREATE (C)
                  </span>
                  <div className="flex gap-1">
                    <button
                      title="Enable all Create"
                      onClick={() => handleColumnToggle("create", true)}
                      className="text-[9px] hover:underline text-emerald-600"
                    >
                      All
                    </button>
                    <span>/</span>
                    <button
                      title="Disable all Create"
                      onClick={() => handleColumnToggle("create", false)}
                      className="text-[9px] hover:underline text-muted-foreground"
                    >
                      None
                    </button>
                  </div>
                </div>
              </th>
              <th className="p-3.5 text-center w-28">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">READ (R)</span>
                  <div className="flex gap-1">
                    <button
                      title="Enable all Read"
                      onClick={() => handleColumnToggle("read", true)}
                      className="text-[9px] hover:underline text-blue-600"
                    >
                      All
                    </button>
                    <span>/</span>
                    <button
                      title="Disable all Read"
                      onClick={() => handleColumnToggle("read", false)}
                      className="text-[9px] hover:underline text-muted-foreground"
                    >
                      None
                    </button>
                  </div>
                </div>
              </th>
              <th className="p-3.5 text-center w-28">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">UPDATE (U)</span>
                  <div className="flex gap-1">
                    <button
                      title="Enable all Update"
                      onClick={() => handleColumnToggle("update", true)}
                      className="text-[9px] hover:underline text-amber-600"
                    >
                      All
                    </button>
                    <span>/</span>
                    <button
                      title="Disable all Update"
                      onClick={() => handleColumnToggle("update", false)}
                      className="text-[9px] hover:underline text-muted-foreground"
                    >
                      None
                    </button>
                  </div>
                </div>
              </th>
              <th className="p-3.5 text-center w-28">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">DELETE (D)</span>
                  <div className="flex gap-1">
                    <button
                      title="Enable all Delete"
                      onClick={() => handleColumnToggle("delete", true)}
                      className="text-[9px] hover:underline text-rose-600"
                    >
                      All
                    </button>
                    <span>/</span>
                    <button
                      title="Disable all Delete"
                      onClick={() => handleColumnToggle("delete", false)}
                      className="text-[9px] hover:underline text-muted-foreground"
                    >
                      None
                    </button>
                  </div>
                </div>
              </th>
              <th className="p-3.5 text-center w-32">Status</th>
              <th className="p-3.5 pr-4 text-right w-28">Quick Row</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredModules.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No modules found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredModules.map((mod) => {
                const perms = activePermissions[mod.id] ?? {
                  create: false,
                  read: false,
                  update: false,
                  delete: false,
                };

                const enabledCount = [perms.create, perms.read, perms.update, perms.delete].filter(
                  Boolean,
                ).length;

                return (
                  <tr key={mod.id} className="hover:bg-muted/30 transition-colors">
                    {/* Module Info */}
                    <td className="p-3.5 pl-4">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-md border border-border bg-muted p-1.5 text-primary">
                          {mod.id === "tasks" && <CheckSquare className="h-4 w-4" />}
                          {mod.id === "epics_sprints" && <Layers className="h-4 w-4" />}
                          {mod.id === "teams" && <Users className="h-4 w-4" />}
                          {mod.id === "governance" && <ShieldCheck className="h-4 w-4" />}
                          {mod.id === "approvals" && <GitBranch className="h-4 w-4" />}
                          {mod.id === "metrics" && <TrendingUp className="h-4 w-4" />}
                          {mod.id === "positions" && <Network className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {mod.name}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">
                              {mod.category}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* CREATE */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(mod.id, "create")}
                        className={`inline-flex h-8 w-14 items-center justify-center rounded-md border text-xs font-semibold transition-all ${
                          perms.create
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-xs hover:bg-emerald-500/25"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {perms.create ? (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <X className="h-3.5 w-3.5 mr-1 opacity-50" />
                        )}
                        Create
                      </button>
                    </td>

                    {/* READ */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(mod.id, "read")}
                        className={`inline-flex h-8 w-14 items-center justify-center rounded-md border text-xs font-semibold transition-all ${
                          perms.read
                            ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-xs hover:bg-blue-500/25"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {perms.read ? (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <X className="h-3.5 w-3.5 mr-1 opacity-50" />
                        )}
                        Read
                      </button>
                    </td>

                    {/* UPDATE */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(mod.id, "update")}
                        className={`inline-flex h-8 w-14 items-center justify-center rounded-md border text-xs font-semibold transition-all ${
                          perms.update
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-xs hover:bg-amber-500/25"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {perms.update ? (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <X className="h-3.5 w-3.5 mr-1 opacity-50" />
                        )}
                        Update
                      </button>
                    </td>

                    {/* DELETE */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(mod.id, "delete")}
                        className={`inline-flex h-8 w-14 items-center justify-center rounded-md border text-xs font-semibold transition-all ${
                          perms.delete
                            ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-xs hover:bg-rose-500/25"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {perms.delete ? (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <X className="h-3.5 w-3.5 mr-1 opacity-50" />
                        )}
                        Delete
                      </button>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 text-center">
                      {enabledCount === 4 && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                        >
                          Full CRUD (4/4)
                        </Badge>
                      )}
                      {enabledCount > 0 && enabledCount < 4 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                        >
                          Partial ({enabledCount}/4)
                        </Badge>
                      )}
                      {enabledCount === 0 && (
                        <Badge
                          variant="outline"
                          className="bg-slate-500/10 text-slate-500 border-slate-500/30 text-[10px]"
                        >
                          Blocked (0/4)
                        </Badge>
                      )}
                    </td>

                    {/* Row Quick Actions */}
                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleRowPreset(mod.id, "all")}
                          className="rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Grant All CRUD"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRowPreset(mod.id, "read")}
                          className="rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Read-Only"
                        >
                          Read
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRowPreset(mod.id, "clear")}
                          className="rounded px-1.5 py-1 text-[10px] font-medium text-rose-500 hover:bg-rose-500/10"
                          title="Clear Row"
                        >
                          Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Audit Log / Governance History */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" /> Privilege Governance Audit Trail
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            Real-time Session Logs
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-border/70 bg-muted/30 p-2.5 text-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{log.actor}</span>
                <span>{log.timestamp}</span>
              </div>
              <p className="font-semibold text-primary">{log.action}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Target: {log.target}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Apply Permission Sets Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" /> Bulk Apply Permission Sets to Managers
            </DialogTitle>
            <DialogDescription>
              Select multiple team managers and apply a uniform CRUD permission set across all
              selected profiles in one action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Step 1: Select Preset */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Select Permission Set
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: "standard",
                    title: "Standard Manager",
                    badge: "Default (Recommended)",
                    desc: "Full CRUD on Tasks, Epics, Teams, Approvals & Metrics. Read-only on Governance & Positions.",
                    color: "border-primary bg-primary/5",
                  },
                  {
                    id: "full",
                    title: "Full CRUD (100% Access)",
                    badge: "Super Power",
                    desc: "Unrestricted Create, Read, Update & Delete privileges across all system modules.",
                    color: "border-emerald-500/50 bg-emerald-500/5",
                  },
                  {
                    id: "restricted",
                    title: "Restricted Manager",
                    badge: "Execution Only",
                    desc: "Task creation and Approval processing. Read-only across all other team modules.",
                    color: "border-amber-500/50 bg-amber-500/5",
                  },
                  {
                    id: "auditor",
                    title: "Read-Only Auditor",
                    badge: "Inspection Only",
                    desc: "100% Read access across all metrics, tasks, and positions. Zero editing rights.",
                    color: "border-slate-500/50 bg-slate-500/5",
                  },
                ].map((preset) => {
                  const isSelected = selectedBulkPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() =>
                        setSelectedBulkPreset(
                          preset.id as "full" | "standard" | "restricted" | "auditor",
                        )
                      }
                      className={`relative cursor-pointer rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? `ring-2 ring-primary ${preset.color}`
                          : "border-border/70 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm flex items-center gap-1.5">
                          {preset.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {preset.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{preset.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Managers */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Select Target Managers ({selectedBulkManagerIds.length} / {teamManagers.length}{" "}
                  selected)
                </Label>
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllBulk}
                    className="h-7 px-2 text-xs text-primary"
                  >
                    Select All
                  </Button>
                  <span className="text-muted-foreground">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAllBulk}
                    className="h-7 px-2 text-xs text-muted-foreground"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Manager Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search managers by name, email, or ID..."
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              {/* Manager List */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-2 space-y-1">
                {filteredBulkManagers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching managers found.
                  </div>
                ) : (
                  filteredBulkManagers.map((mgr) => {
                    const checked = selectedBulkManagerIds.includes(mgr.id);
                    const hasOverride = !!managerOverrides[mgr.id];
                    return (
                      <div
                        key={mgr.id}
                        onClick={() => toggleBulkManager(mgr.id)}
                        className={`flex items-center justify-between rounded-lg p-2.5 text-xs cursor-pointer transition-colors ${
                          checked
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleBulkManager(mgr.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <p className="font-semibold text-foreground">
                              {mgr.full_name || mgr.email || mgr.id}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{mgr.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasOverride && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                            >
                              Custom Override
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {mgr.roles?.[0] || "Manager"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Summary Confirmation */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Ready to Apply</p>
                  <p className="text-muted-foreground">
                    Applying{" "}
                    <strong className="text-primary">{selectedBulkPreset.toUpperCase()}</strong>{" "}
                    permission set across <strong>{selectedBulkManagerIds.length}</strong> selected
                    manager(s).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyBulkPermissions}
              disabled={selectedBulkManagerIds.length === 0}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Apply Permission Set (
              {selectedBulkManagerIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
