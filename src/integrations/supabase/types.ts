export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      classes: {
        Row: {
          academic_year: string;
          class_level: number;
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          school_id: string | null;
          section: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          academic_year?: string;
          class_level: number;
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          school_id?: string | null;
          section?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          academic_year?: string;
          class_level?: number;
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          school_id?: string | null;
          section?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teacher_classes: {
        Row: {
          class_id: string;
          created_at: string;
          id: string;
          teacher_id: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          id?: string;
          teacher_id: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          id?: string;
          teacher_id?: string;
        };
        Relationships: [];
      };
      class_students: {
        Row: {
          class_id: string;
          id: string;
          joined_at: string;
          status: string;
          student_id: string;
        };
        Insert: {
          class_id: string;
          id?: string;
          joined_at?: string;
          status?: string;
          student_id: string;
        };
        Update: {
          class_id?: string;
          id?: string;
          joined_at?: string;
          status?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          class_level: number;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          class_level: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          class_level?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          subject_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          subject_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          subject_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          class_level: number;
          created_at: string;
          created_by: string;
          difficulty: string;
          explanation: string | null;
          id: string;
          marks: number;
          question_text: string;
          question_type: string;
          status: string;
          subject_id: string;
          topic_id: string;
          updated_at: string;
        };
        Insert: {
          class_level: number;
          created_at?: string;
          created_by: string;
          difficulty?: string;
          explanation?: string | null;
          id?: string;
          marks?: number;
          question_text: string;
          question_type?: string;
          status?: string;
          subject_id: string;
          topic_id: string;
          updated_at?: string;
        };
        Update: {
          class_level?: number;
          created_at?: string;
          created_by?: string;
          difficulty?: string;
          explanation?: string | null;
          id?: string;
          marks?: number;
          question_text?: string;
          question_type?: string;
          status?: string;
          subject_id?: string;
          topic_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      question_options: {
        Row: {
          created_at: string;
          id: string;
          is_correct: boolean;
          option_order: number;
          option_text: string;
          question_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_correct?: boolean;
          option_order: number;
          option_text: string;
          question_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_correct?: boolean;
          option_order?: number;
          option_text?: string;
          question_id?: string;
        };
        Relationships: [];
      };
      tests: {
        Row: {
          allow_retake: boolean;
          class_level: number;
          created_at: string;
          created_by: string;
          description: string | null;
          duration_minutes: number;
          end_at: string | null;
          id: string;
          instructions: string | null;
          max_attempts: number;
          passing_marks: number;
          school_id: string | null;
          show_result_immediately: boolean;
          shuffle_options: boolean;
          shuffle_questions: boolean;
          start_at: string | null;
          status: string;
          subject_id: string;
          title: string;
          total_marks: number;
          updated_at: string;
        };
        Insert: {
          allow_retake?: boolean;
          class_level: number;
          created_at?: string;
          created_by: string;
          description?: string | null;
          duration_minutes: number;
          end_at?: string | null;
          id?: string;
          instructions?: string | null;
          max_attempts?: number;
          passing_marks?: number;
          school_id?: string | null;
          show_result_immediately?: boolean;
          shuffle_options?: boolean;
          shuffle_questions?: boolean;
          start_at?: string | null;
          status?: string;
          subject_id: string;
          title: string;
          total_marks?: number;
          updated_at?: string;
        };
        Update: {
          allow_retake?: boolean;
          class_level?: number;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          duration_minutes?: number;
          end_at?: string | null;
          id?: string;
          instructions?: string | null;
          max_attempts?: number;
          passing_marks?: number;
          school_id?: string | null;
          show_result_immediately?: boolean;
          shuffle_options?: boolean;
          shuffle_questions?: boolean;
          start_at?: string | null;
          status?: string;
          subject_id?: string;
          title?: string;
          total_marks?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      test_questions: {
        Row: {
          created_at: string;
          id: string;
          marks: number;
          question_id: string;
          question_order: number;
          question_snapshot: Json;
          test_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          marks: number;
          question_id: string;
          question_order: number;
          question_snapshot: Json;
          test_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          marks?: number;
          question_id?: string;
          question_order?: number;
          question_snapshot?: Json;
          test_id?: string;
        };
        Relationships: [];
      };
      test_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          class_id: string | null;
          due_at: string | null;
          id: string;
          status: string;
          student_id: string;
          test_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          class_id?: string | null;
          due_at?: string | null;
          id?: string;
          status?: string;
          student_id: string;
          test_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          class_id?: string | null;
          due_at?: string | null;
          id?: string;
          status?: string;
          student_id?: string;
          test_id?: string;
        };
        Relationships: [];
      };
      test_attempts: {
        Row: {
          assignment_id: string | null;
          attempt_number: number;
          correct_count: number;
          created_at: string;
          expires_at: string;
          id: string;
          percentage: number;
          score: number;
          skipped_count: number;
          started_at: string;
          status: string;
          student_id: string;
          submitted_at: string | null;
          test_id: string;
          time_taken_seconds: number;
          total_marks: number;
          updated_at: string;
          wrong_count: number;
        };
        Insert: {
          assignment_id?: string | null;
          attempt_number?: number;
          correct_count?: number;
          created_at?: string;
          expires_at: string;
          id?: string;
          percentage?: number;
          score?: number;
          skipped_count?: number;
          started_at?: string;
          status?: string;
          student_id: string;
          submitted_at?: string | null;
          test_id: string;
          time_taken_seconds?: number;
          total_marks?: number;
          updated_at?: string;
          wrong_count?: number;
        };
        Update: {
          assignment_id?: string | null;
          attempt_number?: number;
          correct_count?: number;
          created_at?: string;
          expires_at?: string;
          id?: string;
          percentage?: number;
          score?: number;
          skipped_count?: number;
          started_at?: string;
          status?: string;
          student_id?: string;
          submitted_at?: string | null;
          test_id?: string;
          time_taken_seconds?: number;
          total_marks?: number;
          updated_at?: string;
          wrong_count?: number;
        };
        Relationships: [];
      };
      question_attempts: {
        Row: {
          answer_text: string | null;
          answered_at: string | null;
          attempt_id: string;
          created_at: string;
          first_viewed_at: string | null;
          id: string;
          is_answered: boolean;
          is_correct: boolean | null;
          marks_awarded: number;
          selected_option_id: string | null;
          test_question_id: string;
          time_spent_seconds: number;
          updated_at: string;
        };
        Insert: {
          answer_text?: string | null;
          answered_at?: string | null;
          attempt_id: string;
          created_at?: string;
          first_viewed_at?: string | null;
          id?: string;
          is_answered?: boolean;
          is_correct?: boolean | null;
          marks_awarded?: number;
          selected_option_id?: string | null;
          test_question_id: string;
          time_spent_seconds?: number;
          updated_at?: string;
        };
        Update: {
          answer_text?: string | null;
          answered_at?: string | null;
          attempt_id?: string;
          created_at?: string;
          first_viewed_at?: string | null;
          id?: string;
          is_answered?: boolean;
          is_correct?: boolean | null;
          marks_awarded?: number;
          selected_option_id?: string | null;
          test_question_id?: string;
          time_spent_seconds?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      attempt_events: {
        Row: {
          attempt_id: string;
          event_time: string;
          event_type: string;
          id: string;
          metadata: Json | null;
          student_id: string;
        };
        Insert: {
          attempt_id: string;
          event_time?: string;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          student_id: string;
        };
        Update: {
          attempt_id?: string;
          event_time?: string;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          student_id?: string;
        };
        Relationships: [];
      };
      student_topic_performance: {
        Row: {
          accuracy: number;
          average_time_seconds: number;
          correct_answers: number;
          id: string;
          last_attempted_at: string;
          performance_level: string;
          questions_attempted: number;
          skipped_answers: number;
          student_id: string;
          subject_id: string;
          tests_attempted: number;
          topic_id: string;
          total_marks_earned: number;
          total_possible_marks: number;
          updated_at: string;
          wrong_answers: number;
        };
        Insert: {
          accuracy?: number;
          average_time_seconds?: number;
          correct_answers?: number;
          id?: string;
          last_attempted_at?: string;
          performance_level?: string;
          questions_attempted?: number;
          skipped_answers?: number;
          student_id: string;
          subject_id: string;
          tests_attempted?: number;
          topic_id: string;
          total_marks_earned?: number;
          total_possible_marks?: number;
          updated_at?: string;
          wrong_answers?: number;
        };
        Update: {
          accuracy?: number;
          average_time_seconds?: number;
          correct_answers?: number;
          id?: string;
          last_attempted_at?: string;
          performance_level?: string;
          questions_attempted?: number;
          skipped_answers?: number;
          student_id?: string;
          subject_id?: string;
          tests_attempted?: number;
          topic_id?: string;
          total_marks_earned?: number;
          total_possible_marks?: number;
          updated_at?: string;
          wrong_answers?: number;
        };
        Relationships: [];
      };
      ai_reports: {
        Row: {
          analysis_scope: string;
          ai_response: Json;
          class_id: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          input_snapshot: Json;
          model_version: string | null;
          prompt_version: string;
          report_type: string;
          status: string;
          student_id: string | null;
          summary: string;
          teacher_id: string | null;
          test_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analysis_scope?: string;
          ai_response: Json;
          class_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          input_snapshot: Json;
          model_version?: string | null;
          prompt_version?: string;
          report_type: string;
          status?: string;
          student_id?: string | null;
          summary: string;
          teacher_id?: string | null;
          test_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analysis_scope?: string;
          ai_response?: Json;
          class_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          input_snapshot?: Json;
          model_version?: string | null;
          prompt_version?: string;
          report_type?: string;
          status?: string;
          student_id?: string | null;
          summary?: string;
          teacher_id?: string | null;
          test_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_recommendations: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          priority: string;
          reason: string;
          recommendation_type: string;
          source_report_id: string | null;
          status: string;
          student_id: string;
          subject_id: string | null;
          title: string;
          topic_id: string | null;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          priority?: string;
          reason: string;
          recommendation_type?: string;
          source_report_id?: string | null;
          status?: string;
          student_id: string;
          subject_id?: string | null;
          title: string;
          topic_id?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          priority?: string;
          reason?: string;
          recommendation_type?: string;
          source_report_id?: string | null;
          status?: string;
          student_id?: string;
          subject_id?: string | null;
          title?: string;
          topic_id?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      schools: {
        Row: {
          address: string | null;
          city: string | null;
          country: string;
          created_at: string;
          id: string;
          name: string;
          state: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          country?: string;
          created_at?: string;
          id?: string;
          name: string;
          state?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          country?: string;
          created_at?: string;
          id?: string;
          name?: string;
          state?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          age: number | null;
          avatar_url: string | null;
          class_level: number;
          created_at: string;
          date_of_birth: string | null;
          full_name: string;
          id: string;
          preferred_language: string;
          school_id: string | null;
          school_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          age?: number | null;
          avatar_url?: string | null;
          class_level: number;
          created_at?: string;
          date_of_birth?: string | null;
          full_name: string;
          id?: string;
          preferred_language?: string;
          school_id?: string | null;
          school_name?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          age?: number | null;
          avatar_url?: string | null;
          class_level?: number;
          created_at?: string;
          date_of_birth?: string | null;
          full_name?: string;
          id?: string;
          preferred_language?: string;
          school_id?: string | null;
          school_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      teachers: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          school_id: string | null;
          school_name: string | null;
          specialization: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          school_id?: string | null;
          school_name?: string | null;
          specialization?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          school_id?: string | null;
          school_name?: string | null;
          specialization?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
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
      submit_test_attempt: {
        Args: {
          p_attempt_id: string;
          p_is_auto_submit?: boolean;
        };
        Returns: Json;
      };
      get_my_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      log_audit: {
        Args: {
          _action: string;
          _entity_id: string;
          _entity_type: string;
          _metadata?: Json;
        };
        Returns: undefined;
      },
      save_answers_bulk: {
        Args: {
          attempt_id: string;
          answers: Json;
        };
        Returns: undefined;
      }
    };
    Enums: {
      app_role: "student" | "teacher" | "admin";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["student", "teacher", "admin"],
    },
  },
} as const;
