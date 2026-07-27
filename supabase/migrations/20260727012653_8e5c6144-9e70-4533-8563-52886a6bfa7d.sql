DROP POLICY IF EXISTS "write task comments" ON public.task_comments;
CREATE POLICY "write task comments" ON public.task_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND (
        t.assignee_id = auth.uid()
        OR t.assigner_id = auth.uid()
        OR public.is_manager_of(auth.uid(), t.assignee_id)
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
      )
  )
);