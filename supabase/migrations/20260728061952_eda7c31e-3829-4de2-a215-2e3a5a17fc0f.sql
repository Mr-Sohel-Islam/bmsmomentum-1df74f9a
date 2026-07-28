-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  entity_type text,
  entity_id uuid,
  actor_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.notify_user(
  _user uuid, _type text, _title text, _message text,
  _link text DEFAULT NULL, _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL, _actor uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  IF _actor IS NOT NULL AND _actor = _user THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id, actor_id)
  VALUES (_user, _type, _title, _message, _link, _entity_type, _entity_id, _actor);
END; $$;

-- Task assignment / status notifications
CREATE OR REPLACE FUNCTION public.notify_task_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text;
BEGIN
  SELECT COALESCE(full_name, 'Someone') INTO who FROM public.profiles WHERE id = COALESCE(NEW.assigner_id, NEW.assignee_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_user(NEW.assignee_id, 'assignment', 'New task assigned',
      COALESCE(who,'Someone') || ' assigned you "' || NEW.title || '"', '/tasks', 'task', NEW.id, NEW.assigner_id);
  ELSE
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
      PERFORM public.notify_user(NEW.assignee_id, 'assignment', 'Task reassigned to you',
        'You are now the owner of "' || NEW.title || '"', '/tasks', 'task', NEW.id, auth.uid());
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.notify_user(NEW.assigner_id, 'status_change', 'Task status updated',
        '"' || NEW.title || '" moved to ' || NEW.status, '/tasks', 'task', NEW.id, auth.uid());
    END IF;
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      PERFORM public.notify_user(NEW.assignee_id, 'approval', 'Approval ' || NEW.approval_status,
        '"' || NEW.title || '" is now ' || NEW.approval_status, '/approvals', 'task', NEW.id, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_task_change
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_change();

CREATE OR REPLACE FUNCTION public.notify_task_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks; who text;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = NEW.task_id;
  SELECT COALESCE(full_name,'Someone') INTO who FROM public.profiles WHERE id = NEW.author_id;
  PERFORM public.notify_user(t.assignee_id, 'mention', 'New comment',
    who || ' commented on "' || t.title || '": ' || left(NEW.body, 120), '/tasks', 'task', t.id, NEW.author_id);
  PERFORM public.notify_user(t.assigner_id, 'mention', 'New comment',
    who || ' commented on "' || t.title || '": ' || left(NEW.body, 120), '/tasks', 'task', t.id, NEW.author_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_task_comment
AFTER INSERT ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_task_comment();

CREATE OR REPLACE FUNCTION public.notify_appreciation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text;
BEGIN
  SELECT COALESCE(full_name,'Someone') INTO who FROM public.profiles WHERE id = NEW.from_user;
  PERFORM public.notify_user(NEW.to_user, 'appreciation', 'You received appreciation',
    who || ' (+' || NEW.points || '): ' || left(NEW.message, 140), '/appreciation', 'appreciation', NEW.id, NEW.from_user);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_appreciation
AFTER INSERT ON public.appreciations
FOR EACH ROW EXECUTE FUNCTION public.notify_appreciation();

-- Approval request notifications: notify everyone eligible for the current step
CREATE OR REPLACE FUNCTION public.notify_approval_request() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.approval_steps; u uuid; label text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> 'pending' THEN
    PERFORM public.notify_user(NEW.requester_id, 'approval', 'Request ' || NEW.status,
      'Your ' || NEW.entity_type || ' request was ' || NEW.status, '/approvals', NEW.entity_type, NEW.entity_id, auth.uid());
    RETURN NEW;
  END IF;

  SELECT * INTO s FROM public.approval_steps
    WHERE workflow_id = NEW.workflow_id AND step_order = NEW.current_step;
  IF s.id IS NULL THEN RETURN NEW; END IF;

  label := 'A ' || NEW.entity_type || ' needs your approval';

  IF s.approver_type = 'specific_user' THEN
    PERFORM public.notify_user(s.approver_ref::uuid, 'approval', 'Approval needed', label, '/approvals', NEW.entity_type, NEW.entity_id, NEW.requester_id);
  ELSIF s.approver_type = 'manager_of_requester' THEN
    SELECT manager_id INTO u FROM public.profiles WHERE id = NEW.requester_id;
    PERFORM public.notify_user(u, 'approval', 'Approval needed', label, '/approvals', NEW.entity_type, NEW.entity_id, NEW.requester_id);
  ELSIF s.approver_type = 'role' THEN
    FOR u IN SELECT user_id FROM public.user_roles WHERE role = s.approver_ref::app_role LOOP
      PERFORM public.notify_user(u, 'approval', 'Approval needed', label, '/approvals', NEW.entity_type, NEW.entity_id, NEW.requester_id);
    END LOOP;
  ELSIF s.approver_type = 'permission' THEN
    FOR u IN SELECT user_id FROM public.user_permissions WHERE permission = s.approver_ref LOOP
      PERFORM public.notify_user(u, 'approval', 'Approval needed', label, '/approvals', NEW.entity_type, NEW.entity_id, NEW.requester_id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_approval_request
AFTER INSERT OR UPDATE OF status, current_step ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_request();

-- ============ TASK TIME TRACKING ============
ALTER TABLE public.tasks
  ADD COLUMN start_date date,
  ADD COLUMN estimate_value numeric,
  ADD COLUMN estimate_unit text NOT NULL DEFAULT 'hours';

-- ============ SPRINT POINT BUDGET ============
ALTER TABLE public.sprints
  ADD COLUMN total_points integer NOT NULL DEFAULT 0;

-- ============ APPROVAL AUTHORITY ============
CREATE OR REPLACE FUNCTION public.authority_level(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'super_admin') THEN 100
    WHEN public.has_role(_user_id, 'admin') THEN 80
    WHEN public.has_role(_user_id, 'manager') THEN 50
    ELSE 10 END;
$$;

ALTER TABLE public.approval_workflows
  ADD COLUMN authority_level integer NOT NULL DEFAULT 10;

UPDATE public.approval_workflows w
SET authority_level = COALESCE(public.authority_level(w.created_by), 10);

CREATE OR REPLACE FUNCTION public.protect_workflow_authority() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller integer; is_admin boolean;
BEGIN
  caller := public.authority_level(auth.uid());
  is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin');

  IF TG_OP = 'INSERT' THEN
    NEW.authority_level := caller;
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    RETURN NEW;
  END IF;

  IF NOT is_admin AND OLD.authority_level > caller THEN
    RAISE EXCEPTION 'This approval rule was created by higher authority and cannot be changed.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.authority_level := OLD.authority_level;
    RETURN NEW;
  END IF;
  RETURN OLD;
END; $$;

CREATE TRIGGER trg_protect_workflow_authority
BEFORE INSERT OR UPDATE OR DELETE ON public.approval_workflows
FOR EACH ROW EXECUTE FUNCTION public.protect_workflow_authority();

CREATE OR REPLACE FUNCTION public.protect_step_authority() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lvl integer; caller integer; is_admin boolean; wf uuid;
BEGIN
  wf := COALESCE(NEW.workflow_id, OLD.workflow_id);
  SELECT authority_level INTO lvl FROM public.approval_workflows WHERE id = wf;
  caller := public.authority_level(auth.uid());
  is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin');
  IF NOT is_admin AND COALESCE(lvl, 10) > caller THEN
    RAISE EXCEPTION 'This approval rule was created by higher authority and cannot be changed.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_protect_step_authority
BEFORE INSERT OR UPDATE OR DELETE ON public.approval_steps
FOR EACH ROW EXECUTE FUNCTION public.protect_step_authority();

-- ============ PERFORMANCE SHARING ============
CREATE TABLE public.performance_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  shared_with uuid NOT NULL,
  period text NOT NULL,
  note text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, shared_with, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_shares TO authenticated;
GRANT ALL ON public.performance_shares TO service_role;

ALTER TABLE public.performance_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares readable by owner or recipient" ON public.performance_shares
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR shared_with = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "owner creates shares" ON public.performance_shares
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates shares" ON public.performance_shares
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes shares" ON public.performance_shares
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_performance_share() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text;
BEGIN
  SELECT COALESCE(full_name,'A colleague') INTO who FROM public.profiles WHERE id = NEW.owner_id;
  PERFORM public.notify_user(NEW.shared_with, 'performance', 'Performance report shared',
    who || ' shared their ' || NEW.period || ' performance with you', '/performance', 'performance', NEW.id, NEW.owner_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_performance_share
AFTER INSERT ON public.performance_shares
FOR EACH ROW EXECUTE FUNCTION public.notify_performance_share();