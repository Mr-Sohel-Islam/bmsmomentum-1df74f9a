export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appreciations: {
        Row: {
          created_at: string
          from_user: string
          id: string
          message: string
          points: number
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          message: string
          points?: number
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          message?: string
          points?: number
          to_user?: string
        }
        Relationships: []
      }
      approval_actions: {
        Row: {
          approver_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          request_id: string
          step_order: number
        }
        Insert: {
          approver_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          request_id: string
          step_order: number
        }
        Update: {
          approver_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          request_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          current_step: number
          entity_id: string
          entity_type: string
          id: string
          requester_id: string
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          entity_id: string
          entity_type: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          entity_id?: string
          entity_type?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          approver_ref: string | null
          approver_type: string
          created_at: string
          id: string
          step_order: number
          workflow_id: string
        }
        Insert: {
          approver_ref?: string | null
          approver_type: string
          created_at?: string
          id?: string
          step_order: number
          workflow_id: string
        }
        Update: {
          approver_ref?: string | null
          approver_type?: string
          created_at?: string
          id?: string
          step_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          active: boolean
          authority_level: number
          created_at: string
          created_by: string | null
          entity_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          authority_level?: number
          created_at?: string
          created_by?: string | null
          entity_type: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          authority_level?: number
          created_at?: string
          created_by?: string | null
          entity_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_flows: {
        Row: {
          active: boolean
          cadence: string
          created_at: string
          from_role: string
          id: string
          name: string
          to_role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cadence: string
          created_at?: string
          from_role: string
          id?: string
          name: string
          to_role: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cadence?: string
          created_at?: string
          from_role?: string
          id?: string
          name?: string
          to_role?: string
          updated_at?: string
        }
        Relationships: []
      }
      epics: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      metric_scores: {
        Row: {
          created_at: string
          id: string
          metric_id: string
          period: string
          recorded_by: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric_id: string
          period: string
          recorded_by?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metric_id?: string
          period?: string
          recorded_by?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_scores_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          unit: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_shares: {
        Row: {
          created_at: string
          id: string
          note: string | null
          owner_id: string
          period: string
          shared_with: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          owner_id: string
          period: string
          shared_with: string
          snapshot?: Json
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          owner_id?: string
          period?: string
          shared_with?: string
          snapshot?: Json
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          id: string
          level: number
          parent_position_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          parent_position_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          parent_position_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          position_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          manager_id?: string | null
          position_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          position_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          author_id: string
          created_at: string
          id: string
          metrics_snapshot: Json
          period: string
          recipient_id: string
          sent_at: string
          summary: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          metrics_snapshot?: Json
          period: string
          recipient_id: string
          sent_at?: string
          summary: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          metrics_snapshot?: Json
          period?: string
          recipient_id?: string
          sent_at?: string
          summary?: string
        }
        Relationships: []
      }
      reserved_super_admins: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      sprints: {
        Row: {
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          description: string | null
          epic_id: string | null
          id: string
          points: number
          sprint_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          epic_id?: string | null
          id?: string
          points?: number
          sprint_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          epic_id?: string | null
          id?: string
          points?: number
          sprint_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approval_status: string
          assignee_id: string
          assigner_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          epic_id: string | null
          estimate_unit: string
          estimate_value: number | null
          id: string
          points: number
          priority: string
          sprint_id: string | null
          start_date: string | null
          status: string
          story_id: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          assignee_id: string
          assigner_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          epic_id?: string | null
          estimate_unit?: string
          estimate_value?: number | null
          id?: string
          points?: number
          priority?: string
          sprint_id?: string | null
          start_date?: string | null
          status?: string
          story_id?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          assignee_id?: string
          assigner_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          epic_id?: string | null
          estimate_unit?: string
          estimate_value?: number | null
          id?: string
          points?: number
          priority?: string
          sprint_id?: string | null
          start_date?: string | null
          status?: string
          story_id?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lead_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authority_level: { Args: { _user_id: string }; Returns: number }
      can_approve_request: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      decide_approval: {
        Args: { _decision: string; _note?: string; _request_id: string }
        Returns: {
          created_at: string
          current_step: number
          entity_id: string
          entity_type: string
          id: string
          requester_id: string
          status: string
          updated_at: string
          workflow_id: string
        }
        SetofOptions: {
          from: "*"
          to: "approval_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_of: {
        Args: { _manager: string; _user: string }
        Returns: boolean
      }
      is_reserved_super_admin: { Args: { _user_id: string }; Returns: boolean }
      notify_user: {
        Args: {
          _actor?: string
          _entity_id?: string
          _entity_type?: string
          _link?: string
          _message: string
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
      open_approval_request: {
        Args: { _entity_id: string; _entity_type: string; _requester: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "super_admin" | "manager" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "super_admin", "manager", "member"],
    },
  },
} as const
