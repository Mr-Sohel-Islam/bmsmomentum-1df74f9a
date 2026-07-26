
-- helper: manager check
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user AND manager_id = _manager);
$$;
REVOKE EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) TO authenticated, service_role;

-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assignee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  points integer NOT NULL DEFAULT 0,
  due_date date,
  completed_at timestamptz,
  approval_status text NOT NULL DEFAULT 'not_required' CHECK (approval_status IN ('not_required','pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read tasks" ON public.tasks FOR SELECT TO authenticated
USING (
  assignee_id = auth.uid() OR assigner_id = auth.uid()
  OR public.is_manager_of(auth.uid(), assignee_id)
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "create tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (assigner_id = auth.uid());
CREATE POLICY "update tasks" ON public.tasks FOR UPDATE TO authenticated
USING (
  assignee_id = auth.uid() OR assigner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  assignee_id = auth.uid() OR assigner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "delete tasks" ON public.tasks FOR DELETE TO authenticated
USING (assigner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read task comments" ON public.task_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));
CREATE POLICY "write task comments" ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));
CREATE POLICY "delete own comments" ON public.task_comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- APPROVALS
CREATE TABLE public.approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('task','score','appreciation','report')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_workflows TO authenticated;
GRANT ALL ON public.approval_workflows TO service_role;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read workflows" ON public.approval_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage workflows" ON public.approval_workflows FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'approve_requests'))
WITH CHECK (public.has_permission(auth.uid(), 'approve_requests'));
CREATE TRIGGER workflows_updated BEFORE UPDATE ON public.approval_workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  approver_type text NOT NULL CHECK (approver_type IN ('role','permission','specific_user','manager_of_requester')),
  approver_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, step_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_steps TO authenticated;
GRANT ALL ON public.approval_steps TO service_role;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read steps" ON public.approval_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage steps" ON public.approval_steps FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'approve_requests'))
WITH CHECK (public.has_permission(auth.uid(), 'approve_requests'));

CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  current_step integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.approval_actions TO authenticated;
GRANT ALL ON public.approval_actions TO service_role;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

-- can this user act on the current step of a request?
CREATE OR REPLACE FUNCTION public.can_approve_request(_user_id uuid, _request_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.approval_requests; s public.approval_steps;
BEGIN
  SELECT * INTO r FROM public.approval_requests WHERE id = _request_id;
  IF r.id IS NULL OR r.status <> 'pending' THEN RETURN false; END IF;
  SELECT * INTO s FROM public.approval_steps WHERE workflow_id = r.workflow_id AND step_order = r.current_step;
  IF s.id IS NULL THEN RETURN false; END IF;
  RETURN CASE s.approver_type
    WHEN 'role' THEN public.has_role(_user_id, s.approver_ref::app_role)
    WHEN 'permission' THEN public.has_permission(_user_id, s.approver_ref)
    WHEN 'specific_user' THEN s.approver_ref = _user_id::text
    WHEN 'manager_of_requester' THEN public.is_manager_of(_user_id, r.requester_id)
    ELSE false END;
END; $$;
REVOKE EXECUTE ON FUNCTION public.can_approve_request(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_approve_request(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "read requests" ON public.approval_requests FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR public.can_approve_request(auth.uid(), id)
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "read actions" ON public.approval_actions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.approval_requests r WHERE r.id = request_id));

-- open a request when a workflow exists
CREATE OR REPLACE FUNCTION public.open_approval_request(_entity_type text, _entity_id uuid, _requester uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wf uuid; req uuid;
BEGIN
  SELECT w.id INTO wf FROM public.approval_workflows w
    WHERE w.entity_type = _entity_type AND w.active
      AND EXISTS (SELECT 1 FROM public.approval_steps s WHERE s.workflow_id = w.id)
    ORDER BY w.created_at LIMIT 1;
  IF wf IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.approval_requests (workflow_id, entity_type, entity_id, requester_id)
  VALUES (wf, _entity_type, _entity_id, _requester) RETURNING id INTO req;
  RETURN req;
END; $$;
REVOKE EXECUTE ON FUNCTION public.open_approval_request(text, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.open_approval_request(text, uuid, uuid) TO authenticated, service_role;

-- decide on a request
CREATE OR REPLACE FUNCTION public.decide_approval(_request_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS public.approval_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.approval_requests; max_step integer;
BEGIN
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF NOT public.can_approve_request(auth.uid(), _request_id) THEN RAISE EXCEPTION 'Not authorized to approve this request'; END IF;
  SELECT * INTO r FROM public.approval_requests WHERE id = _request_id FOR UPDATE;
  INSERT INTO public.approval_actions (request_id, step_order, approver_id, decision, note)
  VALUES (r.id, r.current_step, auth.uid(), _decision, _note);
  SELECT max(step_order) INTO max_step FROM public.approval_steps WHERE workflow_id = r.workflow_id;
  IF _decision = 'rejected' THEN
    UPDATE public.approval_requests SET status = 'rejected', updated_at = now() WHERE id = r.id RETURNING * INTO r;
  ELSIF r.current_step >= max_step THEN
    UPDATE public.approval_requests SET status = 'approved', updated_at = now() WHERE id = r.id RETURNING * INTO r;
  ELSE
    UPDATE public.approval_requests SET current_step = r.current_step + 1, updated_at = now() WHERE id = r.id RETURNING * INTO r;
  END IF;
  IF r.entity_type = 'task' AND r.status <> 'pending' THEN
    UPDATE public.tasks SET approval_status = r.status WHERE id = r.entity_id;
  END IF;
  RETURN r;
END; $$;
REVOKE EXECUTE ON FUNCTION public.decide_approval(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.decide_approval(uuid, text, text) TO authenticated, service_role;

-- task completion opens approval automatically
CREATE OR REPLACE FUNCTION public.tasks_on_done()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req uuid;
BEGIN
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'done') THEN
    NEW.completed_at := now();
    req := public.open_approval_request('task', NEW.id, NEW.assignee_id);
    IF req IS NOT NULL THEN NEW.approval_status := 'pending'; END IF;
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER tasks_done_approval BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tasks_on_done();
