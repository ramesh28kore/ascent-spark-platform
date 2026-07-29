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
      assessments: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["assessment_kind"]
          max_marks: number
          module_id: string | null
          scheduled_on: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["assessment_kind"]
          max_marks?: number
          module_id?: string | null
          scheduled_on?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["assessment_kind"]
          max_marks?: number
          module_id?: string | null
          scheduled_on?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_problems: {
        Row: {
          approach: string
          code: string
          complexity: string | null
          created_at: string
          expected_output: string | null
          follow_ups: string | null
          id: string
          level: Database["public"]["Enums"]["difficulty"]
          module_id: string | null
          pattern: string | null
          problem: string
          title: string
        }
        Insert: {
          approach: string
          code: string
          complexity?: string | null
          created_at?: string
          expected_output?: string | null
          follow_ups?: string | null
          id?: string
          level?: Database["public"]["Enums"]["difficulty"]
          module_id?: string | null
          pattern?: string | null
          problem: string
          title: string
        }
        Update: {
          approach?: string
          code?: string
          complexity?: string | null
          created_at?: string
          expected_output?: string | null
          follow_ups?: string | null
          id?: string
          level?: Database["public"]["Enums"]["difficulty"]
          module_id?: string | null
          pattern?: string | null
          problem?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_problems_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_topics: {
        Row: {
          completed: boolean
          hours: number
          id: string
          module_id: string
          sort_order: number
          title: string
        }
        Insert: {
          completed?: boolean
          hours?: number
          id?: string
          module_id: string
          sort_order?: number
          title: string
        }
        Update: {
          completed?: boolean
          hours?: number
          id?: string
          module_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          code: string
          created_at: string
          deliverable: string | null
          description: string | null
          hours: number
          id: string
          sort_order: number
          title: string
          weight_percent: number
        }
        Insert: {
          code: string
          created_at?: string
          deliverable?: string | null
          description?: string | null
          hours?: number
          id?: string
          sort_order?: number
          title: string
          weight_percent?: number
        }
        Update: {
          code?: string
          created_at?: string
          deliverable?: string | null
          description?: string | null
          hours?: number
          id?: string
          sort_order?: number
          title?: string
          weight_percent?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          batch: string | null
          branch: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          roll_number: string | null
          updated_at: string
          user_id: string | null
          year: string | null
        }
        Insert: {
          batch?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          roll_number?: string | null
          updated_at?: string
          user_id?: string | null
          year?: string | null
        }
        Update: {
          batch?: string | null
          branch?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          roll_number?: string | null
          updated_at?: string
          user_id?: string | null
          year?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string | null
          bloom: string
          created_at: string
          explanation: string | null
          id: string
          level: Database["public"]["Enums"]["difficulty"]
          marks: number
          module_id: string | null
          options: Json
          prompt: string
          qtype: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          answer?: string | null
          bloom?: string
          created_at?: string
          explanation?: string | null
          id?: string
          level?: Database["public"]["Enums"]["difficulty"]
          marks?: number
          module_id?: string | null
          options?: Json
          prompt: string
          qtype?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          answer?: string | null
          bloom?: string
          created_at?: string
          explanation?: string | null
          id?: string
          level?: Database["public"]["Enums"]["difficulty"]
          marks?: number
          module_id?: string | null
          options?: Json
          prompt?: string
          qtype?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          assessment_id: string
          attempts: number
          id: string
          marks: number
          recorded_at: string
          student_id: string
        }
        Insert: {
          assessment_id: string
          attempts?: number
          id?: string
          marks?: number
          recorded_at?: string
          student_id: string
        }
        Update: {
          assessment_id?: string
          attempts?: number
          id?: string
          marks?: number
          recorded_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Enums: {
      app_role: "trainer" | "student"
      assessment_kind: "weekly_test" | "mock_nqt" | "coding_test" | "interview"
      difficulty: "easy" | "medium" | "hard"
      question_type: "mcq" | "coding" | "descriptive"
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
      app_role: ["trainer", "student"],
      assessment_kind: ["weekly_test", "mock_nqt", "coding_test", "interview"],
      difficulty: ["easy", "medium", "hard"],
      question_type: ["mcq", "coding", "descriptive"],
    },
  },
} as const
