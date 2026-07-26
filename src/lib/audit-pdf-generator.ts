import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
  roles?: string[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  user_name?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  created_at: string;
  members: TeamMember[];
}

export interface ModulePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type RoleMatrixMap = Record<string, Record<string, ModulePermission>>;

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
}

export interface GeneratePdfOptions {
  matrix: RoleMatrixMap;
  managerOverrides: Record<string, Record<string, ModulePermission>>;
  users: UserOption[];
  teams: Team[];
  auditLogs: AuditLogEntry[];
  modules: { id: string; name: string; category: string; description: string }[];
}

export function generateAuditPdfReport(options: GeneratePdfOptions) {
  const { matrix, managerOverrides, users, teams, auditLogs, modules } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600
  const secondaryColor: [number, number, number] = [100, 116, 139]; // Slate 500

  const nowStr = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const auditDocId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 36, "F");

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SECURITY & GOVERNANCE AUDIT REPORT", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text("Role Permission Matrix & Team Roster Audit Summary", 14, 24);

  doc.setFontSize(8);
  doc.text(`DOC ID: ${auditDocId}  |  ISSUED: ${nowStr}`, 14, 31);

  // Metadata Card
  let currentY = 44;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 22, 2, 2, "FD");

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("AUDIT METADATA & SCOPE", 18, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const managerCount = users.filter((u) => u.roles?.includes("manager") || true).length;
  doc.text(`Issuer: Super Admin Governance Console`, 18, currentY + 14);
  doc.text(`Total Users Analyzed: ${users.length}`, 95, currentY + 14);
  doc.text(`Active Teams: ${teams.length}`, 150, currentY + 14);

  currentY += 28;

  // SECTION 1: GLOBAL ROLE PERMISSION MATRIX
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("1. Global Role Permission Matrix (Baseline)", 14, currentY);

  currentY += 4;

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    manager: "Team Manager",
    lead: "Team Lead",
    reviewer: "Reviewer",
    member: "Standard Member",
  };

  const matrixHead = [
    ["Module / Capability", "Category", "Super Admin", "Manager", "Lead", "Reviewer", "Member"],
  ];

  const matrixRows = modules.map((mod) => {
    const formatPerm = (roleKey: string) => {
      const p = matrix[roleKey]?.[mod.id] ?? {
        create: false,
        read: false,
        update: false,
        delete: false,
      };
      const codes = [];
      if (p.create) codes.push("C");
      if (p.read) codes.push("R");
      if (p.update) codes.push("U");
      if (p.delete) codes.push("D");
      return codes.length > 0 ? codes.join("") : "-";
    };

    return [
      mod.name,
      mod.category,
      formatPerm("super_admin"),
      formatPerm("manager"),
      formatPerm("lead"),
      formatPerm("reviewer"),
      formatPerm("member"),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: matrixHead,
    body: matrixRows,
    theme: "striped",
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42 },
      1: { cellWidth: 38 },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 20 },
      6: { halign: "center", cellWidth: 20 },
    },
  });

  interface DocWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
    internal: { getNumberOfPages: () => number };
  }

  currentY = (doc as unknown as DocWithAutoTable).lastAutoTable.finalY + 10;

  // SECTION 2: MANAGER CUSTOM OVERRIDES
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("2. Team Manager Custom Overrides Directory", 14, currentY);

  currentY += 4;

  const managerHead = [
    ["Manager Name", "Email", "System Roles", "Custom Override Status", "Permitted Modules"],
  ];

  const managerRows = users.map((u) => {
    const hasOverride = !!managerOverrides[u.id];
    let permSummary = "Default Baseline";
    if (hasOverride) {
      const ov = managerOverrides[u.id];
      const activeMods = Object.keys(ov).filter((mId) => {
        const p = ov[mId];
        return p.create || p.read || p.update || p.delete;
      });
      permSummary = `${activeMods.length} Module Override(s)`;
    }

    return [
      u.full_name || u.email || u.id,
      u.email || "N/A",
      (u.roles && u.roles.length > 0 ? u.roles.join(", ") : "Member").toUpperCase(),
      hasOverride ? "ACTIVE OVERRIDE" : "STANDARD",
      permSummary,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: managerHead,
    body: managerRows,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "center", fontStyle: "bold" },
    },
  });

  currentY = (doc as unknown as DocWithAutoTable).lastAutoTable.finalY + 10;

  // SECTION 3: TEAM MEMBERSHIP ROSTER
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("3. Team Membership Roster", 14, currentY);

  currentY += 4;

  const teamHead = [
    ["Team Name", "Description", "Team Lead", "Member Count", "Assigned Members & Roles"],
  ];

  const teamRows = teams.map((t) => {
    const leadObj = users.find((u) => u.id === t.lead_id);
    const memberSummary =
      t.members.length > 0
        ? t.members.map((m) => `${m.user_name || m.user_id} (${m.role.toUpperCase()})`).join("; ")
        : "No members assigned";

    return [
      t.name,
      t.description || "N/A",
      leadObj?.full_name || leadObj?.email || "Unassigned",
      t.members.length.toString(),
      memberSummary,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: teamHead,
    body: teamRows.length > 0 ? teamRows : [["No teams registered", "-", "-", "0", "-"]],
    theme: "striped",
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { halign: "center", cellWidth: 18 },
      4: { cellWidth: 59 },
    },
  });

  currentY = (doc as unknown as DocWithAutoTable).lastAutoTable.finalY + 10;

  // SECTION 4: RECENT AUDIT LOGS
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("4. Governance Action Audit Trail", 14, currentY);

  currentY += 4;

  const auditHead = [["Timestamp", "Actor", "Action Taken", "Target Entity"]];
  const auditRows = auditLogs.map((log) => [log.timestamp, log.actor, log.action, log.target]);

  autoTable(doc, {
    startY: currentY,
    head: auditHead,
    body: auditRows,
    theme: "grid",
    headStyles: {
      fillColor: secondaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
  });

  // Footer & Page Numbers
  const totalPages = (doc as unknown as DocWithAutoTable).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("CONFIDENTIAL — Official Governance & Compliance Audit Document", 14, 287);
    doc.text(`Page ${i} of ${totalPages}`, 196, 287, { align: "right" });
  }

  // Save PDF
  doc.save(`Governance_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
