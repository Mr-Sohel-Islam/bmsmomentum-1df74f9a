import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Client = SupabaseClient<Database>;

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskWithNames = TaskRow & {
  assignee_name: string | null;
  assigner_name: string | null;
};

export async function withNames(supabase: Client, rows: TaskRow[]): Promise<TaskWithNames[]> {
  const ids = Array.from(
    new Set(
      rows.flatMap((t) => [t.assignee_id, t.assigner_id]).filter((v): v is string => Boolean(v)),
    ),
  );
  if (ids.length === 0) {
    return rows.map((t) => ({ ...t, assignee_name: null, assigner_name: null }));
  }
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return rows.map((t) => ({
    ...t,
    assignee_name: (t.assignee_id ? (map.get(t.assignee_id) ?? null) : null) as string | null,
    assigner_name: (t.assigner_id ? (map.get(t.assigner_id) ?? null) : null) as string | null,
  }));
}

export async function namesFor(supabase: Client, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, string | null>();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}
