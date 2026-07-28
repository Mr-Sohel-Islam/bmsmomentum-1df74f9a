import { Router } from "express";

const router = Router();

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Agile PM & Organization Suite Backend API",
    version: "1.0.0",
    description:
      "Comprehensive Express.js, Node.js & MySQL RESTful API for Agile Project Management, Team Operations, Approvals, Performance Tracking & Recognition.",
  },
  servers: [{ url: "/api", description: "Production API Base URL" }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT Bearer Token header or local dev fallback with x-user-id header.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error description" },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", example: "usr-123" },
          full_name: { type: "string", example: "Alex Johnson" },
          avatar_url: { type: "string", example: "https://avatar.url/alex.png" },
          department: { type: "string", example: "Engineering" },
          position_id: { type: "string", example: "pos-1" },
          manager_id: { type: "string", example: "usr-456" },
          is_active: { type: "boolean", example: true },
          roles: { type: "array", items: { type: "string" }, example: ["admin", "developer"] },
          permissions: {
            type: "array",
            items: { type: "string" },
            example: ["tasks:create", "all"],
          },
        },
      },
      Team: {
        type: "object",
        properties: {
          id: { type: "string", example: "team-1" },
          name: { type: "string", example: "Core Backend Team" },
          description: { type: "string", example: "Responsible for API & Database services" },
          lead_id: { type: "string", example: "usr-123" },
          lead_name: { type: "string", example: "Alex Johnson" },
          members: { type: "array", items: { $ref: "#/components/schemas/TeamMember" } },
        },
      },
      TeamMember: {
        type: "object",
        properties: {
          id: { type: "string", example: "tm-1" },
          team_id: { type: "string", example: "team-1" },
          user_id: { type: "string", example: "usr-123" },
          role: { type: "string", example: "developer" },
          user_name: { type: "string", example: "Alex Johnson" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", example: "tsk-1" },
          title: { type: "string", example: "Implement OpenAPI Specification" },
          description: { type: "string", example: "Detail all REST endpoints in Swagger UI" },
          status: { type: "string", example: "in_progress" },
          priority: { type: "string", example: "high" },
          team_id: { type: "string", example: "team-1" },
          assignee_id: { type: "string", example: "usr-123" },
          sprint_id: { type: "string", example: "sp-1" },
          points: { type: "number", example: 5 },
          due_date: { type: "string", example: "2026-08-01" },
        },
      },
      TaskComment: {
        type: "object",
        properties: {
          id: { type: "string", example: "cm-1" },
          task_id: { type: "string", example: "tsk-1" },
          author_id: { type: "string", example: "usr-123" },
          author_name: { type: "string", example: "Alex Johnson" },
          body: { type: "string", example: "Implementation complete and linted." },
          created_at: { type: "string", example: "2026-07-28T10:00:00Z" },
        },
      },
      PerformanceMetric: {
        type: "object",
        properties: {
          id: { type: "string", example: "met-1" },
          name: { type: "string", example: "Code Review Speed" },
          description: { type: "string", example: "Average hours to review PRs" },
          unit: { type: "string", example: "hours" },
          weight: { type: "number", example: 1.5 },
          active: { type: "boolean", example: true },
        },
      },
      ApprovalWorkflow: {
        type: "object",
        properties: {
          id: { type: "string", example: "wf-1" },
          name: { type: "string", example: "Task Release Sign-off" },
          entity_type: { type: "string", example: "task" },
          description: { type: "string", example: "Multi-stage sign-off for release" },
          active: { type: "boolean", example: true },
        },
      },
      Appreciation: {
        type: "object",
        properties: {
          id: { type: "string", example: "appr-1" },
          sender_id: { type: "string", example: "usr-123" },
          receiver_id: { type: "string", example: "usr-456" },
          message: { type: "string", example: "Great work on the backend API!" },
          badge: { type: "string", example: "Team Player" },
          created_at: { type: "string", example: "2026-07-28T10:00:00Z" },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "System Health & Uptime Status",
        responses: {
          "200": { description: "Service operational" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate user & issue JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", example: "admin@company.com" },
                  user_id: { type: "string", example: "usr-admin" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "JWT Issued successfully" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile",
        responses: {
          "200": { description: "Authenticated user details" },
        },
      },
    },
    "/profiles": {
      get: {
        tags: ["Users & Profiles"],
        summary: "List all user profiles with roles and permissions",
        responses: {
          "200": { description: "List of user profiles" },
        },
      },
      post: {
        tags: ["Users & Profiles"],
        summary: "Upsert user profile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  full_name: { type: "string" },
                  avatar_url: { type: "string" },
                  department: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Profile upserted" } },
      },
    },
    "/profiles/{id}": {
      get: {
        tags: ["Users & Profiles"],
        summary: "Get profile by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Profile record" } },
      },
      put: {
        tags: ["Users & Profiles"],
        summary: "Update user profile details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated profile record" } },
      },
      delete: {
        tags: ["Users & Profiles"],
        summary: "Delete user profile and assigned roles",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "User deleted" } },
      },
    },
    "/profiles/{id}/roles": {
      put: {
        tags: ["Users & Profiles"],
        summary: "Set user roles",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  roles: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Roles assigned" } },
      },
    },
    "/profiles/{id}/permissions": {
      put: {
        tags: ["Users & Profiles"],
        summary: "Set user permissions",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  permissions: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Permissions assigned" } },
      },
    },
    "/teams": {
      get: {
        tags: ["Teams & Positions"],
        summary: "List all teams with member lists",
        responses: { "200": { description: "List of teams" } },
      },
      post: {
        tags: ["Teams & Positions"],
        summary: "Create a new team",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  lead_id: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Team created" } },
      },
    },
    "/teams/{id}": {
      put: {
        tags: ["Teams & Positions"],
        summary: "Update team details or lead",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Team updated" } },
      },
      delete: {
        tags: ["Teams & Positions"],
        summary: "Delete team and member assignments",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Team deleted" } },
      },
    },
    "/teams/{id}/members": {
      get: {
        tags: ["Teams & Positions"],
        summary: "Get team members",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "List of team members" } },
      },
      post: {
        tags: ["Teams & Positions"],
        summary: "Add member to team",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Team member added" } },
      },
    },
    "/teams/{id}/members/{userId}": {
      delete: {
        tags: ["Teams & Positions"],
        summary: "Remove member from team",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Team member removed" } },
      },
    },
    "/positions": {
      get: {
        tags: ["Teams & Positions"],
        summary: "List job positions",
        responses: { "200": { description: "Positions list" } },
      },
      post: {
        tags: ["Teams & Positions"],
        summary: "Create job position",
        responses: { "201": { description: "Position created" } },
      },
    },
    "/tasks": {
      get: {
        tags: ["Tasks & Backlog"],
        summary: "List tasks with optional filters (status, assignee, team, sprint)",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "assignee_id", in: "query", schema: { type: "string" } },
          { name: "team_id", in: "query", schema: { type: "string" } },
          { name: "sprint_id", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Filtered task list" } },
      },
      post: {
        tags: ["Tasks & Backlog"],
        summary: "Create a new task",
        responses: { "201": { description: "Task created" } },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tasks & Backlog"],
        summary: "Get task details by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Task details" } },
      },
      put: {
        tags: ["Tasks & Backlog"],
        summary: "Update task fields",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Task updated" } },
      },
      delete: {
        tags: ["Tasks & Backlog"],
        summary: "Delete task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Task deleted" } },
      },
    },
    "/tasks/bulk-assign": {
      post: {
        tags: ["Tasks & Backlog"],
        summary: "Bulk assign tasks to user or team",
        responses: { "200": { description: "Bulk assign outcome" } },
      },
    },
    "/tasks/bulk-status": {
      post: {
        tags: ["Tasks & Backlog"],
        summary: "Bulk update task status",
        responses: { "200": { description: "Bulk status outcome" } },
      },
    },
    "/tasks/bulk-delete": {
      post: {
        tags: ["Tasks & Backlog"],
        summary: "Bulk delete tasks",
        responses: { "200": { description: "Bulk delete outcome" } },
      },
    },
    "/tasks/{id}/comments": {
      get: {
        tags: ["Tasks & Backlog"],
        summary: "Get comments for a task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Task comments list" } },
      },
      post: {
        tags: ["Tasks & Backlog"],
        summary: "Add a comment to task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Comment added" } },
      },
    },
    "/sprints": {
      get: { tags: ["Tasks & Backlog"], summary: "List sprints" },
      post: { tags: ["Tasks & Backlog"], summary: "Create sprint" },
    },
    "/epics": {
      get: { tags: ["Tasks & Backlog"], summary: "List epics" },
      post: { tags: ["Tasks & Backlog"], summary: "Create epic" },
    },
    "/stories": {
      get: { tags: ["Tasks & Backlog"], summary: "List user stories" },
      post: { tags: ["Tasks & Backlog"], summary: "Create story" },
    },
    "/metrics": {
      get: { tags: ["Performance Metrics"], summary: "List metrics" },
      post: { tags: ["Performance Metrics"], summary: "Create metric" },
    },
    "/metrics/{id}": {
      put: { tags: ["Performance Metrics"], summary: "Update metric" },
      delete: { tags: ["Performance Metrics"], summary: "Delete metric" },
    },
    "/metrics/scores": {
      get: { tags: ["Performance Metrics"], summary: "List metric scores" },
      post: { tags: ["Performance Metrics"], summary: "Record score for metric" },
    },
    "/metrics/scores/user/{userId}": {
      get: { tags: ["Performance Metrics"], summary: "Get metric scores for specific user" },
    },
    "/metrics/scores/{id}": {
      delete: { tags: ["Performance Metrics"], summary: "Delete metric score" },
    },
    "/approval/workflows": {
      get: { tags: ["Approval Workflows"], summary: "List approval workflows" },
      post: { tags: ["Approval Workflows"], summary: "Create approval workflow" },
    },
    "/approval/workflows/{id}": {
      put: { tags: ["Approval Workflows"], summary: "Update approval workflow" },
      delete: { tags: ["Approval Workflows"], summary: "Delete approval workflow" },
    },
    "/approval/workflows/{id}/steps": {
      post: { tags: ["Approval Workflows"], summary: "Add step to workflow" },
    },
    "/approval/steps/{stepId}": {
      delete: { tags: ["Approval Workflows"], summary: "Delete step" },
    },
    "/approval/requests": {
      get: { tags: ["Approval Workflows"], summary: "List approval requests" },
      post: { tags: ["Approval Workflows"], summary: "Submit approval request" },
    },
    "/approval/requests/{id}/action": {
      post: { tags: ["Approval Workflows"], summary: "Approve or reject request step" },
    },
    "/appreciations": {
      get: { tags: ["Appreciations"], summary: "List appreciation recognitions" },
      post: { tags: ["Appreciations"], summary: "Send peer appreciation" },
    },
  },
};

router.get("/docs.json", (req, res) => {
  res.json(swaggerSpec);
});

router.get("/docs", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>API Documentation - Agile PM & Organization Suite</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      <style>
        body { margin: 0; padding: 0; background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui { filter: invert(88%) hue-rotate(180deg); max-width: 1400px; margin: 0 auto; padding: 20px; }
        .swagger-ui .info { margin: 20px 0; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
            url: "/api/docs.json",
            dom_id: "#swagger-ui",
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
          });
        };
      </script>
    </body>
    </html>
  `);
});

export default router;
