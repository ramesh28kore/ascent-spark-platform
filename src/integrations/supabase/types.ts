export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null;
          batch_id: string | null;
          body: string;
          created_at: string;
          id: string;
          pinned: boolean;
          title: string;
        };
        Insert: {
          author_id?: string | null;
          batch_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          title: string;
        };
        Update: {
          author_id?: string | null;
          batch_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["assessment_kind"];
          max_marks: number;
          module_id: string | null;
          scheduled_on: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["assessment_kind"];
          max_marks?: number;
          module_id?: string | null;
          scheduled_on?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["assessment_kind"];
          max_marks?: number;
          module_id?: string | null;
          scheduled_on?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          marked_at: string;
          present: boolean;
          session_id: string;
          student_id: string;
        };
        Insert: {
          id?: string;
          marked_at?: string;
          present?: boolean;
          session_id: string;
          student_id: string;
        };
        Update: {
          id?: string;
          marked_at?: string;
          present?: boolean;
          session_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          detail: Json;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      batches: {
        Row: {
          academic_year: string;
          active: boolean;
          branch: string | null;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          academic_year?: string;
          active?: boolean;
          branch?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          academic_year?: string;
          active?: boolean;
          branch?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          created_at: string;
          id: string;
          problem_id: string | null;
          question_id: string | null;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          problem_id?: string | null;
          question_id?: string | null;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          problem_id?: string | null;
          question_id?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmarks_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmarks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      certificates: {
        Row: {
          code: string;
          created_at: string;
          holder_name: string;
          id: string;
          issued_on: string;
          kind: string;
          max_score: number;
          module_id: string | null;
          score: number;
          student_id: string;
          title: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          holder_name: string;
          id?: string;
          issued_on?: string;
          kind?: string;
          max_score?: number;
          module_id?: string | null;
          score?: number;
          student_id: string;
          title: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          holder_name?: string;
          id?: string;
          issued_on?: string;
          kind?: string;
          max_score?: number;
          module_id?: string | null;
          score?: number;
          student_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      code_snapshots: {
        Row: {
          attempt_id: string | null;
          code: string;
          created_at: string;
          id: string;
          label: string;
          language: string;
          problem_id: string | null;
          question_id: string | null;
          scope_kind: string;
          student_id: string;
          test_id: string | null;
        };
        Insert: {
          attempt_id?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          label?: string;
          language?: string;
          problem_id?: string | null;
          question_id?: string | null;
          scope_kind: string;
          student_id: string;
          test_id?: string | null;
        };
        Update: {
          attempt_id?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          label?: string;
          language?: string;
          problem_id?: string | null;
          question_id?: string | null;
          scope_kind?: string;
          student_id?: string;
          test_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "code_snapshots_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "test_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "code_snapshots_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "code_snapshots_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "code_snapshots_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "code_snapshots_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      coding_problems: {
        Row: {
          approach: string;
          code: string;
          complexity: string | null;
          created_at: string;
          expected_output: string | null;
          follow_ups: string | null;
          id: string;
          level: Database["public"]["Enums"]["difficulty"];
          module_id: string | null;
          pattern: string | null;
          problem: string;
          title: string;
        };
        Insert: {
          approach: string;
          code: string;
          complexity?: string | null;
          created_at?: string;
          expected_output?: string | null;
          follow_ups?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["difficulty"];
          module_id?: string | null;
          pattern?: string | null;
          problem: string;
          title: string;
        };
        Update: {
          approach?: string;
          code?: string;
          complexity?: string | null;
          created_at?: string;
          expected_output?: string | null;
          follow_ups?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["difficulty"];
          module_id?: string | null;
          pattern?: string | null;
          problem?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coding_problems_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      coding_submissions: {
        Row: {
          ai_score: number;
          case_results: Json;
          cases_passed: number;
          cases_total: number;
          code: string;
          created_at: string;
          feedback: string | null;
          id: string;
          judged_by: string;
          language: string;
          max_score: number;
          memory_kb: number;
          question_id: string;
          runtime_ms: number;
          status: string;
          student_id: string;
          test_id: string;
          updated_at: string;
          verdict: string;
        };
        Insert: {
          ai_score?: number;
          case_results?: Json;
          cases_passed?: number;
          cases_total?: number;
          code: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          judged_by?: string;
          language?: string;
          max_score?: number;
          memory_kb?: number;
          question_id: string;
          runtime_ms?: number;
          status?: string;
          student_id: string;
          test_id: string;
          updated_at?: string;
          verdict?: string;
        };
        Update: {
          ai_score?: number;
          case_results?: Json;
          cases_passed?: number;
          cases_total?: number;
          code?: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          judged_by?: string;
          language?: string;
          max_score?: number;
          memory_kb?: number;
          question_id?: string;
          runtime_ms?: number;
          status?: string;
          student_id?: string;
          test_id?: string;
          updated_at?: string;
          verdict?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coding_submissions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coding_submissions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coding_submissions_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      contest_problems: {
        Row: {
          contest_id: string;
          created_at: string;
          id: string;
          points: number;
          problem_id: string;
          sort_order: number;
        };
        Insert: {
          contest_id: string;
          created_at?: string;
          id?: string;
          points?: number;
          problem_id: string;
          sort_order?: number;
        };
        Update: {
          contest_id?: string;
          created_at?: string;
          id?: string;
          points?: number;
          problem_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "contest_problems_contest_id_fkey";
            columns: ["contest_id"];
            isOneToOne: false;
            referencedRelation: "contests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contest_problems_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
        ];
      };
      contest_registrations: {
        Row: {
          contest_id: string;
          created_at: string;
          id: string;
          student_id: string;
        };
        Insert: {
          contest_id: string;
          created_at?: string;
          id?: string;
          student_id: string;
        };
        Update: {
          contest_id?: string;
          created_at?: string;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contest_registrations_contest_id_fkey";
            columns: ["contest_id"];
            isOneToOne: false;
            referencedRelation: "contests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contest_registrations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contests: {
        Row: {
          created_at: string;
          description: string | null;
          ends_at: string;
          id: string;
          published: boolean;
          slug: string;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          ends_at: string;
          id?: string;
          published?: boolean;
          slug: string;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          ends_at?: string;
          id?: string;
          published?: boolean;
          slug?: string;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credential_settings: {
        Row: {
          default_domain: string;
          domains: string[];
          id: boolean;
          updated_at: string;
        };
        Insert: {
          default_domain?: string;
          domains?: string[];
          id?: boolean;
          updated_at?: string;
        };
        Update: {
          default_domain?: string;
          domains?: string[];
          id?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_challenges: {
        Row: {
          created_at: string;
          id: string;
          on_date: string;
          problem_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          on_date: string;
          problem_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          on_date?: string;
          problem_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_challenges_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
        ];
      };
      discussion_posts: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          parent_id: string | null;
          problem_id: string | null;
          question_id: string | null;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          problem_id?: string | null;
          question_id?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          problem_id?: string | null;
          question_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_posts_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "discussion_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_posts_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_posts_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      mock_interviews: {
        Row: {
          created_at: string;
          held_on: string;
          id: string;
          interviewer: string | null;
          notes: string | null;
          rating: number;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          held_on?: string;
          id?: string;
          interviewer?: string | null;
          notes?: string | null;
          rating?: number;
          student_id: string;
        };
        Update: {
          created_at?: string;
          held_on?: string;
          id?: string;
          interviewer?: string | null;
          notes?: string | null;
          rating?: number;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mock_interviews_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      module_topics: {
        Row: {
          completed: boolean;
          hours: number;
          id: string;
          module_id: string;
          sort_order: number;
          title: string;
        };
        Insert: {
          completed?: boolean;
          hours?: number;
          id?: string;
          module_id: string;
          sort_order?: number;
          title: string;
        };
        Update: {
          completed?: boolean;
          hours?: number;
          id?: string;
          module_id?: string;
          sort_order?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "module_topics_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          code: string;
          created_at: string;
          deliverable: string | null;
          description: string | null;
          hours: number;
          id: string;
          sort_order: number;
          title: string;
          weight_percent: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          deliverable?: string | null;
          description?: string | null;
          hours?: number;
          id?: string;
          sort_order?: number;
          title: string;
          weight_percent?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          deliverable?: string | null;
          description?: string | null;
          hours?: number;
          id?: string;
          sort_order?: number;
          title?: string;
          weight_percent?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      practice_problems: {
        Row: {
          category: string;
          company: string | null;
          constraints: string | null;
          created_at: string;
          examples: Json;
          hints: Json;
          id: string;
          level: Database["public"]["Enums"]["difficulty"];
          memory_limit_kb: number;
          module_id: string | null;
          platform: string;
          points: number;
          slug: string | null;
          solution: string | null;
          sort_order: number;
          starter_code: Json;
          statement: string | null;
          tags: string[];
          test_cases: Json;
          time_limit_ms: number;
          title: string;
          url: string | null;
        };
        Insert: {
          category?: string;
          company?: string | null;
          constraints?: string | null;
          created_at?: string;
          examples?: Json;
          hints?: Json;
          id?: string;
          level?: Database["public"]["Enums"]["difficulty"];
          memory_limit_kb?: number;
          module_id?: string | null;
          platform?: string;
          points?: number;
          slug?: string | null;
          solution?: string | null;
          sort_order?: number;
          starter_code?: Json;
          statement?: string | null;
          tags?: string[];
          test_cases?: Json;
          time_limit_ms?: number;
          title: string;
          url?: string | null;
        };
        Update: {
          category?: string;
          company?: string | null;
          constraints?: string | null;
          created_at?: string;
          examples?: Json;
          hints?: Json;
          id?: string;
          level?: Database["public"]["Enums"]["difficulty"];
          memory_limit_kb?: number;
          module_id?: string | null;
          platform?: string;
          points?: number;
          slug?: string | null;
          solution?: string | null;
          sort_order?: number;
          starter_code?: Json;
          statement?: string | null;
          tags?: string[];
          test_cases?: Json;
          time_limit_ms?: number;
          title?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "practice_problems_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_progress: {
        Row: {
          id: string;
          problem_id: string;
          status: Database["public"]["Enums"]["practice_status"];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          problem_id: string;
          status?: Database["public"]["Enums"]["practice_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          problem_id?: string;
          status?: Database["public"]["Enums"]["practice_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_progress_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practice_progress_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      problem_submissions: {
        Row: {
          case_results: Json;
          cases_passed: number;
          cases_total: number;
          code: string;
          created_at: string;
          id: string;
          language: string;
          memory_kb: number;
          problem_id: string;
          runtime_ms: number;
          student_id: string;
          verdict: string;
        };
        Insert: {
          case_results?: Json;
          cases_passed?: number;
          cases_total?: number;
          code: string;
          created_at?: string;
          id?: string;
          language?: string;
          memory_kb?: number;
          problem_id: string;
          runtime_ms?: number;
          student_id: string;
          verdict?: string;
        };
        Update: {
          case_results?: Json;
          cases_passed?: number;
          cases_total?: number;
          code?: string;
          created_at?: string;
          id?: string;
          language?: string;
          memory_kb?: number;
          problem_id?: string;
          runtime_ms?: number;
          student_id?: string;
          verdict?: string;
        };
        Relationships: [
          {
            foreignKeyName: "problem_submissions_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "problem_submissions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          batch: string | null;
          batch_id: string | null;
          branch: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          roll_number: string | null;
          section: string | null;
          updated_at: string;
          user_id: string | null;
          year: string | null;
        };
        Insert: {
          batch?: string | null;
          batch_id?: string | null;
          branch?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          roll_number?: string | null;
          section?: string | null;
          updated_at?: string;
          user_id?: string | null;
          year?: string | null;
        };
        Update: {
          batch?: string | null;
          batch_id?: string | null;
          branch?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          roll_number?: string | null;
          section?: string | null;
          updated_at?: string;
          user_id?: string | null;
          year?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          answer: string | null;
          bloom: string;
          buggy_code: string | null;
          category: string;
          company: string | null;
          created_at: string;
          explanation: string | null;
          hints: Json;
          id: string;
          level: Database["public"]["Enums"]["difficulty"];
          marks: number;
          memory_limit_kb: number;
          module_id: string | null;
          options: Json;
          prompt: string;
          qtype: Database["public"]["Enums"]["question_type"];
          solution: string | null;
          starter_code: string | null;
          test_cases: Json;
          time_limit_ms: number;
        };
        Insert: {
          answer?: string | null;
          bloom?: string;
          buggy_code?: string | null;
          category?: string;
          company?: string | null;
          created_at?: string;
          explanation?: string | null;
          hints?: Json;
          id?: string;
          level?: Database["public"]["Enums"]["difficulty"];
          marks?: number;
          memory_limit_kb?: number;
          module_id?: string | null;
          options?: Json;
          prompt: string;
          qtype?: Database["public"]["Enums"]["question_type"];
          solution?: string | null;
          starter_code?: string | null;
          test_cases?: Json;
          time_limit_ms?: number;
        };
        Update: {
          answer?: string | null;
          bloom?: string;
          buggy_code?: string | null;
          category?: string;
          company?: string | null;
          created_at?: string;
          explanation?: string | null;
          hints?: Json;
          id?: string;
          level?: Database["public"]["Enums"]["difficulty"];
          marks?: number;
          memory_limit_kb?: number;
          module_id?: string | null;
          options?: Json;
          prompt?: string;
          qtype?: Database["public"]["Enums"]["question_type"];
          solution?: string | null;
          starter_code?: string | null;
          test_cases?: Json;
          time_limit_ms?: number;
        };
        Relationships: [
          {
            foreignKeyName: "questions_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          module_id: string | null;
          session_id: string | null;
          title: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string;
          module_id?: string | null;
          session_id?: string | null;
          title: string;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          module_id?: string | null;
          session_id?: string | null;
          title?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resources_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      rubric_scores: {
        Row: {
          assessment_id: string | null;
          comments: string | null;
          created_at: string;
          evaluator_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["exam_kind"];
          max_total: number;
          released: boolean;
          rubric_id: string | null;
          scores: Json;
          student_id: string;
          test_id: string | null;
          total: number;
          updated_at: string;
        };
        Insert: {
          assessment_id?: string | null;
          comments?: string | null;
          created_at?: string;
          evaluator_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["exam_kind"];
          max_total?: number;
          released?: boolean;
          rubric_id?: string | null;
          scores?: Json;
          student_id: string;
          test_id?: string | null;
          total?: number;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string | null;
          comments?: string | null;
          created_at?: string;
          evaluator_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["exam_kind"];
          max_total?: number;
          released?: boolean;
          rubric_id?: string | null;
          scores?: Json;
          student_id?: string;
          test_id?: string | null;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rubric_scores_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rubric_scores_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rubric_scores_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rubric_scores_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      rubrics: {
        Row: {
          created_at: string;
          criteria: Json;
          id: string;
          kind: Database["public"]["Enums"]["exam_kind"];
          max_marks: number;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          criteria?: Json;
          id?: string;
          kind?: Database["public"]["Enums"]["exam_kind"];
          max_marks?: number;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          criteria?: Json;
          id?: string;
          kind?: Database["public"]["Enums"]["exam_kind"];
          max_marks?: number;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          assessment_id: string;
          attempts: number;
          id: string;
          marks: number;
          recorded_at: string;
          student_id: string;
        };
        Insert: {
          assessment_id: string;
          attempts?: number;
          id?: string;
          marks?: number;
          recorded_at?: string;
          student_id: string;
        };
        Update: {
          assessment_id?: string;
          attempts?: number;
          id?: string;
          marks?: number;
          recorded_at?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scores_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          batch_id: string | null;
          created_at: string;
          duration_min: number;
          id: string;
          module_id: string | null;
          notes: string | null;
          scheduled_at: string;
          status: Database["public"]["Enums"]["session_status"];
          title: string;
          topic_id: string | null;
          trainer_id: string | null;
          trainer_name: string | null;
          updated_at: string;
        };
        Insert: {
          batch_id?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          module_id?: string | null;
          notes?: string | null;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["session_status"];
          title: string;
          topic_id?: string | null;
          trainer_id?: string | null;
          trainer_name?: string | null;
          updated_at?: string;
        };
        Update: {
          batch_id?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          module_id?: string | null;
          notes?: string | null;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["session_status"];
          title?: string;
          topic_id?: string | null;
          trainer_id?: string | null;
          trainer_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "module_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      snippets: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          language: string;
          owner_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          code?: string;
          created_at?: string;
          id?: string;
          language?: string;
          owner_id: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          language?: string;
          owner_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "snippets_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_plan_items: {
        Row: {
          created_at: string;
          day: number | null;
          id: string;
          plan_id: string;
          problem_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          day?: number | null;
          id?: string;
          plan_id: string;
          problem_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          day?: number | null;
          id?: string;
          plan_id?: string;
          problem_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "study_plan_items_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "study_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_plan_items_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "practice_problems";
            referencedColumns: ["id"];
          },
        ];
      };
      study_plans: {
        Row: {
          created_at: string;
          description: string | null;
          icon: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      test_attempts: {
        Row: {
          blur_count: number;
          graded_at: string | null;
          id: string;
          max_score: number;
          responses: Json;
          score: number;
          started_at: string;
          student_id: string;
          submitted_at: string | null;
          test_id: string;
        };
        Insert: {
          blur_count?: number;
          graded_at?: string | null;
          id?: string;
          max_score?: number;
          responses?: Json;
          score?: number;
          started_at?: string;
          student_id: string;
          submitted_at?: string | null;
          test_id: string;
        };
        Update: {
          blur_count?: number;
          graded_at?: string | null;
          id?: string;
          max_score?: number;
          responses?: Json;
          score?: number;
          started_at?: string;
          student_id?: string;
          submitted_at?: string | null;
          test_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      test_items: {
        Row: {
          id: string;
          marks: number;
          question_id: string;
          sort_order: number;
          test_id: string;
        };
        Insert: {
          id?: string;
          marks?: number;
          question_id: string;
          sort_order?: number;
          test_id: string;
        };
        Update: {
          id?: string;
          marks?: number;
          question_id?: string;
          sort_order?: number;
          test_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_items_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_items_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      tests: {
        Row: {
          assessment_id: string | null;
          batch_id: string | null;
          created_at: string;
          difficulty: Database["public"]["Enums"]["difficulty"];
          duration_min: number;
          ends_at: string | null;
          exam_kind: Database["public"]["Enums"]["exam_kind"];
          id: string;
          leaderboard: boolean;
          module_id: string | null;
          negative_marking: number;
          published: boolean;
          results_released: boolean;
          shuffle: boolean;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assessment_id?: string | null;
          batch_id?: string | null;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          duration_min?: number;
          ends_at?: string | null;
          exam_kind?: Database["public"]["Enums"]["exam_kind"];
          id?: string;
          leaderboard?: boolean;
          module_id?: string | null;
          negative_marking?: number;
          published?: boolean;
          results_released?: boolean;
          shuffle?: boolean;
          starts_at?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string | null;
          batch_id?: string | null;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          duration_min?: number;
          ends_at?: string | null;
          exam_kind?: Database["public"]["Enums"]["exam_kind"];
          id?: string;
          leaderboard?: boolean;
          module_id?: string | null;
          negative_marking?: number;
          published?: boolean;
          results_released?: boolean;
          shuffle?: boolean;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tests_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tests_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tests_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      theory_answers: {
        Row: {
          answer: string;
          awarded: number | null;
          comment: string | null;
          created_at: string;
          evaluated_at: string | null;
          id: string;
          max_marks: number;
          question_id: string;
          student_id: string;
          test_id: string;
          updated_at: string;
        };
        Insert: {
          answer?: string;
          awarded?: number | null;
          comment?: string | null;
          created_at?: string;
          evaluated_at?: string | null;
          id?: string;
          max_marks?: number;
          question_id: string;
          student_id: string;
          test_id: string;
          updated_at?: string;
        };
        Update: {
          answer?: string;
          awarded?: number | null;
          comment?: string | null;
          created_at?: string;
          evaluated_at?: string | null;
          id?: string;
          max_marks?: number;
          question_id?: string;
          student_id?: string;
          test_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theory_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theory_answers_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theory_answers_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      grade_attempt: {
        Args: { _blur_count?: number; _responses: Json; _test_id: string };
        Returns: {
          max_score: number;
          score: number;
        }[];
      };
      staff_coding_problems: {
        Args: never;
        Returns: {
          approach: string;
          code: string;
          complexity: string | null;
          created_at: string;
          expected_output: string | null;
          follow_ups: string | null;
          id: string;
          level: Database["public"]["Enums"]["difficulty"];
          module_id: string | null;
          pattern: string | null;
          problem: string;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "coding_problems";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      staff_questions: {
        Args: never;
        Returns: {
          answer: string | null;
          bloom: string;
          buggy_code: string | null;
          category: string;
          company: string | null;
          created_at: string;
          explanation: string | null;
          hints: Json;
          id: string;
          level: Database["public"]["Enums"]["difficulty"];
          marks: number;
          memory_limit_kb: number;
          module_id: string | null;
          options: Json;
          prompt: string;
          qtype: Database["public"]["Enums"]["question_type"];
          solution: string | null;
          starter_code: string | null;
          test_cases: Json;
          time_limit_ms: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "questions";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      test_leaderboard: {
        Args: { _test_id: string };
        Returns: {
          full_name: string;
          max_score: number;
          roll_number: string;
          score: number;
          seconds: number;
          student_id: string;
          submitted_at: string;
        }[];
      };
    };
    Enums: {
      app_role: "trainer" | "student" | "admin" | "placement";
      assessment_kind: "weekly_test" | "mock_nqt" | "coding_test" | "interview";
      difficulty: "easy" | "medium" | "hard";
      exam_kind: "mcq_quiz" | "theory" | "programming" | "debugging" | "challenge" | "viva";
      practice_status: "todo" | "attempted" | "solved";
      question_type: "mcq" | "coding" | "descriptive";
      session_status: "planned" | "conducted" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["trainer", "student", "admin", "placement"],
      assessment_kind: ["weekly_test", "mock_nqt", "coding_test", "interview"],
      difficulty: ["easy", "medium", "hard"],
      exam_kind: ["mcq_quiz", "theory", "programming", "debugging", "challenge", "viva"],
      practice_status: ["todo", "attempted", "solved"],
      question_type: ["mcq", "coding", "descriptive"],
      session_status: ["planned", "conducted", "cancelled"],
    },
  },
} as const;
