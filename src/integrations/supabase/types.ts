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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_domain: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          hunter_status: string
          id: string
          last_enriched_at: string | null
          linkedin_url: string | null
          lusha_status: string
          mobile_phone: string | null
          notes: string | null
          organization_id: string | null
          personal_email: string | null
          phone: string | null
          position: string | null
          status: Database["public"]["Enums"]["contact_status"]
          tags: string[] | null
          updated_at: string
          work_email: string | null
          work_phone: string | null
        }
        Insert: {
          company_domain?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          hunter_status?: string
          id?: string
          last_enriched_at?: string | null
          linkedin_url?: string | null
          lusha_status?: string
          mobile_phone?: string | null
          notes?: string | null
          organization_id?: string | null
          personal_email?: string | null
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[] | null
          updated_at?: string
          work_email?: string | null
          work_phone?: string | null
        }
        Update: {
          company_domain?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          hunter_status?: string
          id?: string
          last_enriched_at?: string | null
          linkedin_url?: string | null
          lusha_status?: string
          mobile_phone?: string | null
          notes?: string | null
          organization_id?: string | null
          personal_email?: string | null
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[] | null
          updated_at?: string
          work_email?: string | null
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_summary: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          organization_id: string | null
          project_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          organization_id?: string | null
          project_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body_html: string | null
          body_text: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          from_email: string
          id: string
          organization_id: string | null
          project_id: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          from_email: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          from_email?: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          ai_summary: string | null
          contact_id: string | null
          content_text: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string | null
          project_id: string | null
          source_type: string
          tags: string[] | null
        }
        Insert: {
          ai_summary?: string | null
          contact_id?: string | null
          content_text?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string | null
          source_type?: string
          tags?: string[] | null
        }
        Update: {
          ai_summary?: string | null
          contact_id?: string | null
          content_text?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string | null
          source_type?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_items_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          org_type: string | null
          sector: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          org_type?: string | null
          sector?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_type?: string | null
          sector?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_partners: {
        Row: {
          id: string
          organization_id: string
          project_id: string
          role: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          project_id: string
          role?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_partners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          call_reference: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          call_reference?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          call_reference?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          task_type?: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      contact_status:
        | "new_lead"
        | "contacted"
        | "proposal_sent"
        | "client"
        | "lost"
      project_status: "proposal" | "active" | "completed" | "cancelled"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_type:
        | "email"
        | "call"
        | "meeting"
        | "document"
        | "deadline"
        | "other"
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
      app_role: ["admin", "user"],
      contact_status: [
        "new_lead",
        "contacted",
        "proposal_sent",
        "client",
        "lost",
      ],
      project_status: ["proposal", "active", "completed", "cancelled"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_type: ["email", "call", "meeting", "document", "deadline", "other"],
    },
  },
} as const
