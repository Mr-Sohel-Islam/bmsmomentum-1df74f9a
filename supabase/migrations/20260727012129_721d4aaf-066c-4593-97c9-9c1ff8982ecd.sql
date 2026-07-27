-- ============ TEAMS ============
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  lead_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage teams" ON public.teams FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_tasks'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_tasks'));

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('lead','manager','member','reviewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read team members" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage team members" ON public.team_members FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_tasks'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_tasks'));

-- ============ EPICS / SPRINTS / STORIES ============
CREATE TABLE public.epics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','in_progress','completed')),
  color text NOT NULL DEFAULT '#10b981',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epics TO authenticated;
GRANT ALL ON public.epics TO service_role;
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read epics" ON public.epics FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage epics" ON public.epics FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_tasks'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_tasks'));

CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  goal text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read sprints" ON public.sprints FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage sprints" ON public.sprints FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_tasks'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_tasks'));

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  epic_id uuid REFERENCES public.epics(id) ON DELETE SET NULL,
  sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL,
  points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','in_progress','review','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read stories" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage stories" ON public.stories FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_tasks'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_tasks'));

-- ============ TASK LINKAGE ============
ALTER TABLE public.tasks
  ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN epic_id uuid REFERENCES public.epics(id) ON DELETE SET NULL,
  ADD COLUMN sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL,
  ADD COLUMN story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low','medium','high','urgent'));

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER epics_updated_at BEFORE UPDATE ON public.epics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sprints_updated_at BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER stories_updated_at BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SECURITY FIXES ============
DROP POLICY IF EXISTS "read actions" ON public.approval_actions;
CREATE POLICY "read actions" ON public.approval_actions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.approval_requests r
  WHERE r.id = approval_actions.request_id
    AND (
      r.requester_id = auth.uid()
      OR public.can_approve_request(auth.uid(), r.id)
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
));

DROP POLICY IF EXISTS "read task comments" ON public.task_comments;
CREATE POLICY "read task comments" ON public.task_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_comments.task_id
    AND (
      t.assignee_id = auth.uid()
      OR t.assigner_id = auth.uid()
      OR public.is_manager_of(auth.uid(), t.assignee_id)
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
));

DROP POLICY IF EXISTS "auth read reserved" ON public.reserved_super_admins;
CREATE POLICY "admins read reserved" ON public.reserved_super_admins FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============ DEMO SEED ============
INSERT INTO public.approval_workflows (id, name, entity_type, active, created_by)
VALUES ('3f4b1c20-0000-4000-a000-000000000001', 'Task Completion Review', 'task', true, NULL);

INSERT INTO public.approval_steps (workflow_id, step_order, approver_type, approver_ref) VALUES
  ('3f4b1c20-0000-4000-a000-000000000001', 1, 'manager_of_requester', NULL),
  ('3f4b1c20-0000-4000-a000-000000000001', 2, 'role', 'admin');

INSERT INTO public.epics (id, title, description, status, color) VALUES
  ('3f4b1c20-0000-4000-a000-000000000101', 'Q3 Platform Foundations', 'Performance engine, task governance, and reporting rollups.', 'in_progress', '#10b981');

INSERT INTO public.sprints (id, name, goal, start_date, end_date, status) VALUES
  ('3f4b1c20-0000-4000-a000-000000000201', 'Sprint 1', 'Ship the delivery board and approval routing.', CURRENT_DATE, CURRENT_DATE + 14, 'active');

INSERT INTO public.stories (id, title, description, epic_id, sprint_id, points, status) VALUES
  ('3f4b1c20-0000-4000-a000-000000000301', 'Approval routing for completed tasks', 'Route finished tasks through manager then admin review.', '3f4b1c20-0000-4000-a000-000000000101', '3f4b1c20-0000-4000-a000-000000000201', 8, 'in_progress');

INSERT INTO public.teams (id, name, description) VALUES
  ('3f4b1c20-0000-4000-a000-000000000401', 'Engineering Core', 'Core platform development and infrastructure.');