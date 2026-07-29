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
      attendance: {
        Row: {
          id: string
          marked_at: string
          present: boolean
          session_id: string
          student_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          present?: boolean
          session_id: string
          student_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          present?: boolean
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          academic_year: string
          active: boolean
          branch: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          active?: boolean
          branch?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          active?: boolean
          branch?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      mock_interviews: {
        Row: {
          created_at: string
          held_on: string
          id: string
          interviewer: string | null
          notes: string | null
          rating: number
          student_id: string
        }
        Insert: {
          created_at?: string
          held_on?: string
          id?: string
          interviewer?: string | null
          notes?: string | null
          rating?: number
          student_id: string
        }
        Update: {
          created_at?: string
          held_on?: string
          id?: string
          interviewer?: string | null
          notes?: string | null
          rating?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_problems: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["difficulty"]
          module_id: string | null
          platform: string
          points: number
          sort_order: number
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["difficulty"]
          module_id?: string | null
          platform?: string
          points?: number
          sort_order?: number
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["difficulty"]
          module_id?: string | null
          platform?: string
          points?: number
          sort_order?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_problems_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_progress: {
        Row: {
          id: string
          problem_id: string
          status: Database["public"]["Enums"]["practice_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          problem_id: string
          status?: Database["public"]["Enums"]["practice_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          problem_id?: string
          status?: Database["public"]["Enums"]["practice_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_progress_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "practice_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          batch: string | null
          batch_id: string | null
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
          batch_id?: string | null
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
          batch_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
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
      resources: {
        Row: {
          created_at: string
          id: string
          kind: string
          module_id: string | null
          session_id: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          module_id?: string | null
          session_id?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          module_id?: string | null
          session_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
      sessions: {
        Row: {
          batch_id: string | null
          created_at: string
          duration_min: number
          id: string
          module_id: string | null
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["session_status"]
          title: string
          topic_id: string | null
          trainer_id: string | null
          trainer_name: string | null
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          module_id?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          topic_id?: string | null
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          module_id?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          topic_id?: string | null
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "module_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          blur_count: number
          graded_at: string | null
          id: string
          max_score: number
          responses: Json
          score: number
          started_at: string
          student_id: string
          submitted_at: string | null
          test_id: string
        }
        Insert: {
          blur_count?: number
          graded_at?: string | null
          id?: string
          max_score?: number
          responses?: Json
          score?: number
          started_at?: string
          student_id: string
          submitted_at?: string | null
          test_id: string
        }
        Update: {
          blur_count?: number
          graded_at?: string | null
          id?: string
          max_score?: number
          responses?: Json
          score?: number
          started_at?: string
          student_id?: string
          submitted_at?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_items: {
        Row: {
          id: string
          marks: number
          question_id: string
          sort_order: number
          test_id: string
        }
        Insert: {
          id?: string
          marks?: number
          question_id: string
          sort_order?: number
          test_id: string
        }
        Update: {
          id?: string
          marks?: number
          question_id?: string
          sort_order?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          assessment_id: string | null
          batch_id: string | null
          created_at: string
          duration_min: number
          ends_at: string | null
          id: string
          module_id: string | null
          published: boolean
          shuffle: boolean
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          batch_id?: string | null
          created_at?: string
          duration_min?: number
          ends_at?: string | null
          id?: string
          module_id?: string | null
          published?: boolean
          shuffle?: boolean
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          batch_id?: string | null
          created_at?: string
          duration_min?: number
          ends_at?: string | null
          id?: string
          module_id?: string | null
          published?: boolean
          shuffle?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
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
      grade_attempt: {
        Args: { _blur_count?: number; _responses: Json; _test_id: string }
        Returns: {
          max_score: number
          score: number
        }[]
      }
      staff_coding_problems: {
        Args: never
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "coding_problems"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      staff_questions: {
        Args: never
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "trainer" | "student" | "admin" | "placement"
      assessment_kind: "weekly_test" | "mock_nqt" | "coding_test" | "interview"
      difficulty: "easy" | "medium" | "hard"
      practice_status: "todo" | "attempted" | "solved"
      question_type: "mcq" | "coding" | "descriptive"
      session_status: "planned" | "conducted" | "cancelled"
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
      app_role: ["trainer", "student", "admin", "placement"],
      assessment_kind: ["weekly_test", "mock_nqt", "coding_test", "interview"],
      difficulty: ["easy", "medium", "hard"],
      practice_status: ["todo", "attempted", "solved"],
      question_type: ["mcq", "coding", "descriptive"],
      session_status: ["planned", "conducted", "cancelled"],
    },
  },
} as const
